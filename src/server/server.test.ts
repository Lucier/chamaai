import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.DATABASE_URL = "postgres://x:x@localhost:5432/x";
  process.env.UPLOAD_DIR = path.join("/tmp", "chamaai-test-uploads");
  process.env.JWT_SECRET = "segredo-de-teste-com-mais-de-32-caracteres-ok";
});

describe("senha (bcrypt)", () => {
  it("gera bcrypt com o custo atual, verifica a senha certa e recusa a errada", async () => {
    const { hashPassword, verifyPassword, BCRYPT_COST, needsRehash } = await import("./password");
    const hash = await hashPassword("minha-senha-123");
    expect(hash.startsWith(`$2b$${BCRYPT_COST}$`)).toBe(true);
    expect(await verifyPassword("minha-senha-123", hash)).toBe(true);
    expect(await verifyPassword("outra", hash)).toBe(false);
    expect(needsRehash(hash)).toBe(false);
  });
  it("cada hash usa um salt diferente", async () => {
    const { hashPassword } = await import("./password");
    expect(await hashPassword("x1234567")).not.toBe(await hashPassword("x1234567"));
  });
  it("recusa hash malformado sem lançar", async () => {
    const { verifyPassword } = await import("./password");
    expect(await verifyPassword("a", "lixo")).toBe(false);
    expect(await verifyPassword("a", "$2b$12$curto")).toBe(false);
    expect(await verifyPassword("a", "scrypt$1$2")).toBe(false);
    expect(await verifyPassword("a", "")).toBe(false);
  });
  it("hash scrypt antigo ainda verifica e é marcado para troca por bcrypt", async () => {
    const { legacyScryptHashForTests, verifyPassword, needsRehash } = await import("./password");
    const legacy = await legacyScryptHashForTests("senha-antiga-123");
    expect(legacy.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("senha-antiga-123", legacy)).toBe(true);
    expect(await verifyPassword("errada", legacy)).toBe(false);
    expect(needsRehash(legacy)).toBe(true);
  });
  it("bcrypt de custo menor que o atual é marcado para troca", async () => {
    const { needsRehash } = await import("./password");
    expect(needsRehash("$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345")).toBe(true);
  });
});

describe("JWT da sessão", () => {
  const claims = { adminId: "3f1c2b4e-6a7d-4e8f-9a0b-1c2d3e4f5a6b", sessionId: "sessao-abc", version: 3 };
  const inOneHour = () => new Date(Date.now() + 3_600_000);

  it("assina e verifica de volta as mesmas claims", async () => {
    const { signSessionToken, verifySessionToken } = await import("./jwt");
    const token = await signSessionToken(claims, inOneHour());
    expect(token.split(".")).toHaveLength(3);
    expect(await verifySessionToken(token)).toEqual(claims);
  });
  it("recusa token expirado", async () => {
    const { signSessionToken, verifySessionToken } = await import("./jwt");
    expect(await verifySessionToken(await signSessionToken(claims, new Date(Date.now() - 60_000)))).toBeNull();
  });
  it("recusa token adulterado (payload trocado mantendo a assinatura)", async () => {
    const { signSessionToken, verifySessionToken } = await import("./jwt");
    const [h, , sig] = (await signSessionToken(claims, inOneHour())).split(".");
    const evil = Buffer.from(JSON.stringify({ sub: "outro-admin", jti: "x", ver: 3, exp: 9_999_999_999 })).toString("base64url");
    expect(await verifySessionToken(`${h}.${evil}.${sig}`)).toBeNull();
  });
  it("recusa token assinado com outra chave", async () => {
    const { signSessionToken, verifySessionToken } = await import("./jwt");
    const token = await signSessionToken(claims, inOneHour());
    const original = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "outra-chave-completamente-diferente-32+chars";
    try {
      expect(await verifySessionToken(token)).toBeNull();
    } finally {
      process.env.JWT_SECRET = original;
    }
  });
  it("recusa alg=none e outros algoritmos", async () => {
    const { verifySessionToken } = await import("./jwt");
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const payload = { sub: claims.adminId, jti: claims.sessionId, ver: 1, iss: "chama-ai", aud: "chama-ai:admin", exp: 9_999_999_999 };
    expect(await verifySessionToken(`${b64({ alg: "none", typ: "JWT" })}.${b64(payload)}.`)).toBeNull();
    expect(await verifySessionToken(`${b64({ alg: "HS512", typ: "JWT" })}.${b64(payload)}.assinatura`)).toBeNull();
  });
  it("recusa emissor/audiência de outro sistema e claims faltando", async () => {
    const { SignJWT } = await import("jose");
    const { verifySessionToken } = await import("./jwt");
    const key = new TextEncoder().encode(process.env.JWT_SECRET!);
    const mk = (over: { iss?: string; aud?: string; ver?: unknown; jti?: string }) =>
      new SignJWT({ ver: over.ver ?? 1 })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(claims.adminId)
        .setJti(over.jti ?? "j")
        .setIssuer(over.iss ?? "chama-ai")
        .setAudience(over.aud ?? "chama-ai:admin")
        .setExpirationTime("1h")
        .sign(key);
    expect(await verifySessionToken(await mk({}))).not.toBeNull(); // controle: este formato é aceito
    expect(await verifySessionToken(await mk({ iss: "outro" }))).toBeNull();
    expect(await verifySessionToken(await mk({ aud: "outro" }))).toBeNull();
    expect(await verifySessionToken(await mk({ ver: "1" }))).toBeNull(); // versão precisa ser número
  });
  it("lixo que não é JWT vira null, sem lançar", async () => {
    const { verifySessionToken } = await import("./jwt");
    for (const t of ["", "abc", "a.b.c", "x".repeat(500)]) expect(await verifySessionToken(t), t).toBeNull();
  });
  it("exige JWT_SECRET com pelo menos 32 caracteres", async () => {
    const { getJwtSecret } = await import("./env");
    const original = process.env.JWT_SECRET;
    try {
      process.env.JWT_SECRET = "curto";
      expect(() => getJwtSecret()).toThrow(/32 caracteres/);
      delete process.env.JWT_SECRET;
      expect(() => getJwtSecret()).toThrow(/JWT_SECRET/);
    } finally {
      process.env.JWT_SECRET = original;
    }
  });
});

describe("upload de fotos", () => {
  it("identifica o formato pelos bytes, ignorando extensão", async () => {
    const { sniffImage } = await import("./uploads");
    expect(sniffImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toBe("jpg");
    expect(sniffImage(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe("png");
    expect(sniffImage(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBPVP8 ")]))).toBe("webp");
  });
  it("rejeita o que não é imagem (HTML, SVG, executável, vazio)", async () => {
    const { sniffImage } = await import("./uploads");
    expect(sniffImage(Buffer.from("<html><script>alert(1)</script>"))).toBeNull();
    expect(sniffImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
    expect(sniffImage(Buffer.from("MZ\x90\x00\x03"))).toBeNull();
    expect(sniffImage(Buffer.alloc(0))).toBeNull();
  });
  it("resolveUploadPath só aceita chaves bem formadas dentro de UPLOAD_DIR", async () => {
    const { resolveUploadPath } = await import("./uploads");
    const id = "3f1c2b4e-6a7d-4e8f-9a0b-1c2d3e4f5a6b";
    expect(resolveUploadPath(`prestadores/${id}/1-123.jpg`)).toBe(path.join("/tmp/chamaai-test-uploads", "prestadores", id, "1-123.jpg"));
    for (const evil of [
      "../../etc/passwd",
      `prestadores/${id}/../../../etc/passwd`,
      `prestadores/${id}/1-123.jpg/../../x.jpg`,
      `/etc/passwd`,
      `prestadores/${id}/shell.php`,
      `prestadores/${id}/1.jpg%00.php`,
      `outro/${id}/1.jpg`,
      "",
    ]) {
      expect(resolveUploadPath(evil), evil).toBeNull();
    }
  });
});
