#!/usr/bin/env bash
# =====================================================================
#  HTTPS local para testar o PWA no celular (precisa de HTTPS para instalar de verdade).
#
#    bash scripts/https/setup.sh                 # detecta os IPs da máquina
#    bash scripts/https/setup.sh 192.168.1.50    # inclui IPs/nomes extras (ex.: meu-pc.local)
#
#  Gera em ./certs (ignorado pelo git e pelo docker):
#    certs/ca/        a CA local — ca.key é PRIVADA e nunca vai para o container
#    certs/tls/       server.crt + server.key — montados no proxy (Caddy)
#    certs/web/       ca.crt + página de instalação — servidos em http://<ip>:8080
#
#  A CA é criada UMA vez: instale o ca.crt no celular uma única vez. O certificado do servidor
#  é refeito a cada execução (use quando o IP da máquina mudar, ou perto de vencer — vale 365 dias),
#  e o celular continua confiando, porque a CA é a mesma.
#
#  A CA só vale para IPs privados, localhost e *.local (name constraints): se a chave dela vazar,
#  ainda assim não consegue emitir certificado para google.com etc.
# =====================================================================
set -euo pipefail
cd "$(dirname "$0")/../.."

CA_DIR=certs/ca; TLS_DIR=certs/tls; WEB_DIR=certs/web
HTTPS_PORT="${HTTPS_PORT:-$(grep -E '^HTTPS_PORT=' .env 2>/dev/null | cut -d= -f2 || true)}"; HTTPS_PORT="${HTTPS_PORT:-8443}"
CA_PORT="${CA_PORT:-$(grep -E '^CA_PORT=' .env 2>/dev/null | cut -d= -f2 || true)}"; CA_PORT="${CA_PORT:-8080}"
LEAF_DAYS=365   # a Apple recusa certificado de servidor com mais de 825 dias; 365 sobra

command -v openssl >/dev/null || { echo "✗ openssl não encontrado"; exit 1; }
umask 077
mkdir -p "$CA_DIR" "$TLS_DIR" "$WEB_DIR"
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT

# ---------- 1. nomes/IPs que o certificado vai cobrir ----------
sans=("DNS:localhost" "IP:127.0.0.1")
detected=()
if command -v ip >/dev/null; then
  # IPv4 privado de interfaces reais (ignora docker0, br-*, veth*, virbr*, túneis…)
  while read -r ifname cidr; do
    ip="${cidr%/*}"
    case "$ifname" in docker*|br-*|veth*|virbr*|lxc*|cni*|flannel*|tun*|tap*) continue ;; esac
    case "$ip" in 10.*|192.168.*|172.1[6-9].*|172.2[0-9].*|172.3[0-1].*) detected+=("$ip") ;; esac
  done < <(ip -4 -o addr show scope global | awk '{print $2, $4}')
fi
for ip in "${detected[@]+"${detected[@]}"}"; do sans+=("IP:$ip"); done
for extra in "$@"; do
  if [[ "$extra" =~ ^[0-9]+(\.[0-9]+){3}$ ]]; then sans+=("IP:$extra"); else sans+=("DNS:$extra"); fi
done
if [ "${#detected[@]}" -eq 0 ] && [ "$#" -eq 0 ]; then
  echo "! Não achei IP de rede privada (sem Wi-Fi/cabo?). O certificado vai cobrir só localhost."
  echo "  Passe o IP à mão: bash scripts/https/setup.sh 192.168.x.x"
fi

# ---------- 2. CA local (só se ainda não existe) ----------
if [ ! -f "$CA_DIR/ca.key" ] || [ ! -f "$CA_DIR/ca.crt" ]; then
  cat > "$tmp/ca.cnf" <<CNF
[req]
distinguished_name = dn
prompt = no
x509_extensions = v3_ca
[dn]
O  = Chama Ai Dev
CN = Chama Ai Local Dev CA
[v3_ca]
basicConstraints = critical, CA:TRUE, pathlen:0
keyUsage = critical, keyCertSign, cRLSign
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always
nameConstraints = critical, @nc
[nc]
permitted;IP.1  = 127.0.0.0/255.0.0.0
permitted;IP.2  = 10.0.0.0/255.0.0.0
permitted;IP.3  = 172.16.0.0/255.240.0.0
permitted;IP.4  = 192.168.0.0/255.255.0.0
permitted;DNS.1 = localhost
permitted;DNS.2 = .local
CNF
  openssl req -x509 -newkey rsa:2048 -nodes -sha256 -days 3650 -config "$tmp/ca.cnf" \
    -keyout "$CA_DIR/ca.key" -out "$CA_DIR/ca.crt" 2>/dev/null
  chmod 600 "$CA_DIR/ca.key"
  echo "✓ CA nova criada em $CA_DIR (instale $WEB_DIR/ca.crt no celular — só uma vez)"
else
  echo "• CA existente mantida (o celular continua confiando nela)"
fi

# ---------- 3. certificado do servidor (refeito sempre) ----------
{
  echo "[req]"; echo "distinguished_name = dn"; echo "prompt = no"
  echo "[dn]"; echo "O = Chama Ai Dev"; echo "CN = localhost"
  echo "[v3_leaf]"
  echo "basicConstraints = critical, CA:FALSE"
  echo "keyUsage = critical, digitalSignature, keyEncipherment"
  echo "extendedKeyUsage = serverAuth"
  echo "subjectKeyIdentifier = hash"
  echo "authorityKeyIdentifier = keyid,issuer"
  echo "subjectAltName = @san"
  echo "[san]"
  d=0; i=0
  for s in "${sans[@]}"; do
    case "$s" in DNS:*) d=$((d+1)); echo "DNS.$d = ${s#DNS:}" ;; IP:*) i=$((i+1)); echo "IP.$i = ${s#IP:}" ;; esac
  done
} > "$tmp/leaf.cnf"

openssl req -new -newkey rsa:2048 -nodes -sha256 -config "$tmp/leaf.cnf" \
  -keyout "$TLS_DIR/server.key" -out "$tmp/server.csr" 2>/dev/null
openssl x509 -req -in "$tmp/server.csr" -CA "$CA_DIR/ca.crt" -CAkey "$CA_DIR/ca.key" -CAcreateserial \
  -CAserial "$tmp/ca.srl" -days "$LEAF_DAYS" -sha256 -extfile "$tmp/leaf.cnf" -extensions v3_leaf \
  -out "$TLS_DIR/server.crt" 2>/dev/null
chmod 600 "$TLS_DIR/server.key"; chmod 644 "$TLS_DIR/server.crt"

# ---------- 4. confere a cadeia ANTES de entregar (inclui as restrições da CA) ----------
verify_args=()
for s in "${sans[@]}"; do case "$s" in IP:*) verify_args+=(-verify_ip "${s#IP:}") ;; DNS:*) verify_args+=(-verify_hostname "${s#DNS:}") ;; esac; done
if ! openssl verify -CAfile "$CA_DIR/ca.crt" -purpose sslserver "${verify_args[@]}" "$TLS_DIR/server.crt" >/dev/null 2>"$tmp/verify.err"; then
  echo "✗ O certificado gerado não passou na verificação (a CA só aceita IPs privados, localhost e *.local):"
  sed 's/^/    /' "$tmp/verify.err"; rm -f "$TLS_DIR/server.crt" "$TLS_DIR/server.key"; exit 1
fi

# ---------- 5. arquivos públicos (CA + página de instalação) ----------
fp="$(openssl x509 -in "$CA_DIR/ca.crt" -noout -fingerprint -sha256 | cut -d= -f2)"
cp "$CA_DIR/ca.crt" "$WEB_DIR/ca.crt"
sed -e "s|__FINGERPRINT__|$fp|g" -e "s|__HTTPS_PORT__|$HTTPS_PORT|g" deploy/ca-page.html > "$WEB_DIR/index.html"
chmod 755 "$WEB_DIR"; chmod 644 "$WEB_DIR/ca.crt" "$WEB_DIR/index.html"

# ---------- 6. resumo ----------
echo "✓ Certificado do servidor pronto — vale até: $(openssl x509 -in "$TLS_DIR/server.crt" -noout -enddate | cut -d= -f2)"
echo "  cobre: ${sans[*]}"
echo "  impressão digital (SHA-256) da CA: $fp"
echo
echo "Próximos passos:"
echo "  1. docker compose --profile https up -d            (ou COMPOSE_PROFILES=https no .env)"
echo "  2. No celular (mesmo Wi-Fi), abra e instale o certificado:  http://${detected[0]:-<ip-da-máquina>}:$CA_PORT"
echo "  3. Depois abra o app em:                                      https://${detected[0]:-<ip-da-máquina>}:$HTTPS_PORT"
