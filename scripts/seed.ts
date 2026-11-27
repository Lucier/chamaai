/*
 * Dados de exemplo (os mesmos do antigo "modo demonstração" do HTML).
 *   npm run db:seed            -> só insere se a tabela de prestadores estiver vazia
 *   npm run db:seed -- --force -> apaga prestadores/avaliações/orçamentos e insere de novo
 * Não use --force em produção.
 */
import { closePool, getPool } from '../src/server/db'

type Status = 'approved' | 'pending'
type Seed = [
  key: string,
  name: string,
  wa: string,
  category: string,
  city: string,
  price: number,
  desc: string,
  status: Status,
  daysAgo: number,
]

const C = 'Uruçuí - PI'
const providers: Seed[] = [
  [
    'demo-1',
    'João Batista Silva',
    '5589999990001',
    'Eletricista',
    C,
    80,
    'Instalações e reparos elétricos residenciais e comerciais. Troca de disjuntores, tomadas, chuveiros e quadros de energia. Instalo ventilador de teto e iluminação.\nAtendo de segunda a sábado e também emergências.',
    'approved',
    40,
  ],
  [
    'demo-2',
    'Maria das Graças Sousa',
    '5589999990002',
    'Diarista',
    C,
    150,
    'Faxina completa em casas e apartamentos, limpeza pós-obra e passadoria. Mais de 10 anos de experiência, com referências.',
    'approved',
    35,
  ],
  [
    'demo-3',
    'Antônio Pereira',
    '5589999990003',
    'Encanador',
    C,
    70,
    "Conserto de vazamentos, desentupimento, instalação de caixa d'água, torneiras, descargas e bombas.",
    'approved',
    30,
  ],
  [
    'demo-4',
    'Francisca Lima',
    '5589999990004',
    'Manicure e pedicure',
    C,
    35,
    'Atendimento a domicílio ou no meu espaço. Unhas em gel, fibra, esmaltação e spa dos pés. Material esterilizado.',
    'approved',
    22,
  ],
  [
    'demo-5',
    'Raimundo Costa',
    '5589999990005',
    'Pedreiro',
    C,
    180,
    'Construção, reforma, reboco, contrapiso, assentamento de cerâmica e porcelanato. Faço orçamento sem compromisso.',
    'approved',
    18,
  ],
  [
    'demo-6',
    'Carlos Eduardo Ramos',
    '5589999990006',
    'Técnico de ar-condicionado',
    C,
    180,
    'Instalação, limpeza e manutenção de ar-condicionado split e janela. Carga de gás e conserto. Garantia de 90 dias.',
    'approved',
    12,
  ],
  [
    'demo-7',
    'Ana Paula Martins',
    '5589999990007',
    'Cabeleireiro(a)',
    C,
    50,
    'Cortes femininos e masculinos, escova, progressiva, coloração e penteados para festas.',
    'approved',
    8,
  ],
  [
    'demo-8',
    'Pedro Henrique Alves',
    '5589999990008',
    'Fretes e mudanças',
    'Ribeiro Gonçalves - PI',
    0,
    'Fretes e mudanças locais e para cidades da região com caminhão baú. Ajudantes disponíveis.',
    'approved',
    5,
  ],
  [
    'demo-9',
    'Luciana Rocha',
    '5589999990009',
    'Cuidador(a) de idosos',
    C,
    120,
    'Técnica de enfermagem. Acompanhamento de idosos em casa e no hospital, dia ou noite.',
    'approved',
    3,
  ],
  [
    'demo-10',
    'José Ribamar Nunes',
    '5589999990010',
    'Pintor',
    C,
    25,
    'Pintura residencial e comercial, textura, grafiato e massa corrida.',
    'pending',
    1,
  ],
  [
    'demo-11',
    'Daniel Souza',
    '5589999990011',
    'Técnico de informática',
    C,
    60,
    'Formatação, remoção de vírus, montagem de computadores e instalação de redes Wi-Fi.',
    'pending',
    0,
  ],
]

const reviews: [id: string, provider: string, author: string, stars: number, comment: string, daysAgo: number][] = [
  ['r1', 'demo-1', 'Cláudia M.', 5, 'Chegou no horário e resolveu o problema do chuveiro rapidinho. Recomendo!', 20],
  ['r2', 'demo-1', 'Marcos', 5, 'Muito caprichoso e preço justo.', 15],
  ['r3', 'demo-1', 'Rita', 4, 'Bom serviço, só demorou um pouco pra responder.', 6],
  ['r4', 'demo-2', 'Fernanda S.', 5, 'Deixou a casa brilhando. Já chamei de novo.', 25],
  ['r5', 'demo-2', 'Jéssica', 5, 'Pessoa de confiança, super organizada.', 10],
  ['r6', 'demo-3', 'Paulo R.', 4, 'Resolveu o vazamento. Preço ok.', 12],
  ['r7', 'demo-4', 'Bianca', 5, 'Amei as unhas! Muito cuidadosa.', 9],
  ['r8', 'demo-4', 'Lara', 4, '', 4],
  ['r9', 'demo-5', 'Edson', 5, 'Trabalho limpo e entregou no prazo combinado.', 7],
  ['r10', 'demo-6', 'Rafael', 5, 'Instalou dois splits, tudo certinho. Profissional nota 10.', 5],
  ['r11', 'demo-6', 'Sônia', 4, 'Atencioso, explicou tudo.', 2],
  ['r12', 'demo-7', 'Gabriela', 5, 'Melhor progressiva que já fiz.', 3],
]

async function main() {
  const force = process.argv.includes('--force')
  const client = await getPool().connect()
  try {
    const { rows } = await client.query<{ n: number }>('select count(*)::int as n from providers')
    if (rows[0]!.n > 0 && !force) {
      console.log('• Já existem prestadores — nada a fazer (use --force para recriar).')
      return
    }
    await client.query('begin')
    if (force) await client.query('truncate providers cascade')

    const ids = new Map<string, string>()
    for (const [key, name, wa, cat, city, price, desc, status, days] of providers) {
      const { rows } = await client.query<{ id: string }>(
        `insert into providers (name, whatsapp, category, city, price, description, status, created_at)
         values ($1,$2,$3,$4,$5,$6,$7, now() - make_interval(days => $8::int)) returning id`,
        [name, wa, cat, city, price, desc, status, days],
      )
      ids.set(key, rows[0]!.id)
    }
    for (const [id, provider, author, stars, comment, days] of reviews) {
      await client.query(
        `insert into reviews (provider_id, author, stars, comment, device_id, created_at)
         values ($1,$2,$3,$4,$5, now() - make_interval(days => $6::int))`,
        [ids.get(provider), author, stars, comment || null, `seed-review-${id}`, days],
      )
    }
    await client.query('commit')
    console.log(`✓ ${providers.length} prestadores e ${reviews.length} avaliações de exemplo inseridos.`)
  } catch (err) {
    await client.query('rollback').catch(() => undefined)
    throw err
  } finally {
    client.release()
  }
}

main()
  .catch((err) => {
    console.error('✗', err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(() => closePool())
