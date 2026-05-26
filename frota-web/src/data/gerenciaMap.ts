/**
 * Mapeamento de Gerência → Responsáveis → Bases.
 * Usado para filtros em cascata: ao selecionar uma gerência os dropdowns
 * de Responsável e Base mostram apenas os valores válidos para aquela gerência.
 *
 * Estrutura: cada gerência lista seus responsáveis e, para cada responsável,
 * as bases que ele cobre. Um responsável pode cobrir N bases (1:N).
 * bases: [] significa responsável geral/sem base específica definida (exibe todas).
 *
 * Atualizado em 2026-05-26 com base nos dados do Supabase (vehicles ativos).
 */

export type GerenciaEntry = {
  /** Valor usado no filtro (minúsculas, sem acento — igual ao COORDENADOR_FILTER_SELECT_OPTIONS). */
  gerencia: string
  /** Label exibido no dropdown de gerência. */
  gerenciaLabel: string
  responsaveis: {
    /** Nome exato como aparece no campo `responsavel` do veículo (MAIÚSCULAS). */
    nome: string
    /** Bases que este responsável cobre (MAIÚSCULAS). bases:[] = geral/sem base específica. */
    bases: string[]
  }[]
}

export const GERENCIA_MAP: GerenciaEntry[] = [
  {
    gerencia: 'afonso',
    gerenciaLabel: 'AFONSO',
    responsaveis: [
      { nome: 'ADAILTON LIMA FERREIRA', bases: ['BCB'] },
      { nome: 'ARLISSON ROGERIO',      bases: ['STI'] },
      { nome: 'DEILTON RIBEIRO',       bases: ['BCB'] },
      { nome: 'EMANUEL',               bases: ['STI'] },
      { nome: 'GLEYSON',               bases: ['BCB'] },
      { nome: 'JORDEN CLEYSON',        bases: ['STI'] },
      { nome: 'LEONARDO ESTRELA',      bases: ['ITM'] },
      { nome: 'LUCAS ALVES',           bases: ['BCB'] },
      { nome: 'NONATO',                bases: ['ITM'] },
      { nome: 'RENATO RAMOS CARVALHO', bases: ['STI'] },
      { nome: 'WASHINGTON SOARES',     bases: ['ITM'] },
    ],
  },
  {
    gerencia: 'frota',
    gerenciaLabel: 'FROTA',
    responsaveis: [
      { nome: 'ARLISSON ROGERIO',          bases: ['STI'] },
      { nome: 'ERBERTH PEREIRA',           bases: ['BCB'] },
      { nome: 'FRANCISCO JOSE GUERREIRO',  bases: ['BCB'] },
      { nome: 'LUCAS SOUZA',               bases: ['PDT'] },
      { nome: 'OZIEL BRAGA',               bases: ['ITM'] },
      { nome: 'RUAN VALMIR',               bases: ['BCB'] },
    ],
  },
  {
    gerencia: 'jackson',
    gerenciaLabel: 'JACKSON',
    responsaveis: [
      { nome: 'JACKSON SOUZA', bases: ['BCB'] },
    ],
  },
  {
    gerencia: 'jamerson',
    gerenciaLabel: 'JAMERSON',
    responsaveis: [
      { nome: 'ADAILTON LIMA FERREIRA',  bases: ['BCB'] },
      { nome: 'ARLISSON ROGERIO',        bases: ['STI'] },
      { nome: 'DEILTON RIBEIRO',         bases: ['BCB'] },
      { nome: 'EMANUEL',                 bases: ['STI'] },
      { nome: 'EMANUEL COSTA PINTO',     bases: ['STI'] },
      { nome: 'GLEYSON',                 bases: ['BCB'] },
      { nome: 'GLEYSON DE SOUSA',        bases: ['BCB'] },
      { nome: 'JAMERSON MIRANDA',        bases: ['STI'] },
      { nome: 'JORDEN CLEYSON',          bases: ['STI'] },
      { nome: 'LEONARDO ESTRELA',        bases: ['ITM'] },
      { nome: 'LUCAS ALVES',             bases: ['BCB'] },
      { nome: 'LUIZ CARLOS',             bases: ['STI'] },
      { nome: 'LUIS AUGUSTO',            bases: ['ITM'] },
      { nome: 'MARCELO SOARES',          bases: ['STI'] },
      { nome: 'NONATO',                  bases: ['ITM'] },
      { nome: 'OZIEL BRAGA',             bases: ['ITM'] },
      { nome: 'RENATO RAMOS CARVALHO',   bases: ['STI'] },
      { nome: 'RESERVA',                 bases: ['BCB'] },
      { nome: 'WASHINGTON SOARES',       bases: ['ITM'] },
    ],
  },
  {
    gerencia: 'joao felipe',
    gerenciaLabel: 'JOÃO FELIPE',
    responsaveis: [
      { nome: 'BRUNO OLIVEIRA',   bases: ['PDT'] },
      { nome: 'FRANCISCO ASSIS',  bases: ['PDT'] },
      { nome: 'GUILHERME FONSECA', bases: ['PDT'] },
      { nome: 'MARCOS ALENCAR',   bases: ['PDT'] },
      { nome: 'PAULO FERREIRA',   bases: ['PDS'] },
      { nome: 'THIAGO CORDEIRO',  bases: ['PDS'] },
    ],
  },
  {
    gerencia: 'julio',
    gerenciaLabel: 'JÚLIO',
    responsaveis: [
      { nome: 'ANTONIO MARCOS SALAZAR DOS REIS', bases: [] },
      { nome: 'ERBERTH PEREIRA',                 bases: ['BCB'] },
      { nome: 'JULIO CESAR',                     bases: ['BCB'] },
      { nome: 'LUIS FILIPE',                     bases: [] },
    ],
  },
  {
    gerencia: 'leandro',
    gerenciaLabel: 'LEANDRO',
    responsaveis: [
      { nome: 'ANTONIO SILVA DE ABREU',       bases: ['BCB'] },
      { nome: 'DARIO FRANÇA',                 bases: ['PDT'] },
      { nome: 'EVERTON SIQUEIRA',             bases: ['PDT'] },
      { nome: 'JOISE MARQUES',                bases: ['STI'] },
      { nome: 'JOSIELINGTON PAZ DE OLIVEIRA', bases: ['PDS'] },
      { nome: 'LEANDRO FRANCISCO',            bases: ['BCB'] },
      { nome: 'NILO GONCALVES',               bases: ['BDC'] },
      { nome: 'NORMAM MATHEUS',               bases: ['BCB'] },
      { nome: 'WELRISSON OLIVEIRA',           bases: ['ITM'] },
    ],
  },
  {
    gerencia: 'luiz felipe',
    gerenciaLabel: 'LUIZ FELIPE',
    responsaveis: [
      { nome: 'RAIMUNDO ALMEIDA', bases: ['PDT'] },
    ],
  },
  {
    gerencia: 'marcos',
    gerenciaLabel: 'MARCOS',
    responsaveis: [
      { nome: 'IDIALDO COIMBRA',  bases: ['BDC'] },
      { nome: 'JOSIEL MENESES',   bases: ['BDC'] },
      { nome: 'LEONARDO BRUNO',   bases: ['BDC'] },
      { nome: 'ROGÉRIO PEIXOTO',  bases: ['BDC'] },
    ],
  },
  {
    gerencia: 'paulo',
    gerenciaLabel: 'PAULO',
    responsaveis: [
      { nome: 'ANTONIO SAMUEL',    bases: ['PDT'] },
      { nome: 'BRUNO',             bases: ['BDC'] },
      { nome: 'FISCAL',            bases: ['PDT'] },
      { nome: 'GUILHERME FONSECA', bases: [] },
      { nome: 'RAIMUNDO HERMERSON', bases: ['PDS'] },
      { nome: 'SANTANA DE LIMA',   bases: ['PDS'] },
    ],
  },
  {
    gerencia: 'pryscilla',
    gerenciaLabel: 'PRYSCILLA',
    responsaveis: [
      { nome: 'PRYSCILLA CRISTYANE', bases: [] },
    ],
  },
  {
    gerencia: 'rafaela',
    gerenciaLabel: 'RAFAELA',
    responsaveis: [
      { nome: 'ACLESSIO',                         bases: ['PDS'] },
      { nome: 'ANDERSON',                         bases: ['PDT'] },
      { nome: 'CRISTOPHE DANIEL',                 bases: ['PDS'] },
      { nome: 'EDIVAN LIMA',                      bases: ['STI'] },
      { nome: 'GABRIEL DO CARMO',                 bases: ['PDT'] },
      { nome: 'GEOMARI',                          bases: ['PDS'] },
      { nome: 'GUILHERME FONSECA',                bases: ['PDT'] },
      { nome: 'JOADSON CARLOS DA SILVA FERREIRA', bases: ['PDT'] },
      { nome: 'JOAO CLIMACO',                     bases: [] },
      { nome: 'JONAS ARAUJO SALES',               bases: ['PDS'] },
      { nome: 'LUIZ CARLOS',                      bases: ['STI'] },
      { nome: 'MARCOS ALENCAR',                   bases: [] },
      { nome: 'MATHEUS ARAUJO',                    bases: ['PDT', 'PDS'] },
      { nome: 'MESSIAS ABREU',                    bases: ['PDS'] },
      { nome: 'PATRICK',                          bases: ['PDS'] },
      { nome: 'RAIMUNDO ALMEIDA',                 bases: ['PDT'] },
      { nome: 'ROGÉRIO LEANDRO PEIXOTO',          bases: ['BDC'] },
      { nome: 'WALLYSON DA SILVA ALMEIDA',        bases: ['PDT'] },
    ],
  },
  {
    gerencia: 'ricardo',
    gerenciaLabel: 'RICARDO',
    responsaveis: [
      { nome: 'ABRAÃO',                 bases: ['BCB'] },
      { nome: 'CRISTOPHE DANIEL',       bases: ['ITM'] },
      { nome: 'EDIVAN DE LIMA',         bases: ['STI'] },
      { nome: 'EDIVAN LIMA',            bases: ['STI'] },
      { nome: 'EDNALDO ABREU MEIRELES', bases: ['STI'] },
      { nome: 'EVERALDO NOGUEIRA',      bases: [] },
      { nome: 'FAGNER ALMEIDA',         bases: ['BCB'] },
      { nome: 'ITALO',                  bases: ['ITM'] },
      { nome: 'JAMES',                  bases: ['BCB'] },
      { nome: 'JOÃO ALEF',              bases: ['BCB'] },
      { nome: 'LAERCIO CORTA LIMA',     bases: ['BCB'] },
      { nome: 'LEONARDO MARTINS',       bases: ['STI'] },
      { nome: 'LUIZ CARLOS',            bases: ['STI'] },
      { nome: 'MANUEL NETO',            bases: ['BCB'] },
      { nome: 'MARCELO SOARES',         bases: ['STI'] },
      { nome: 'MATEUS ANTÔNIO',         bases: ['STI'] },
      { nome: 'MATHEUS ARAUJO',         bases: ['ITM', 'STI', 'BCB'] },
      { nome: 'MIKEIAS VELOSO',         bases: ['BCB'] },
      { nome: 'OZIEL BRAGA',            bases: ['ITM'] },
      { nome: 'PABLO LOURA',            bases: ['BCB'] },
      { nome: 'RAIMUNDO ALMEIDA',       bases: ['PDT'] },
      { nome: 'THIAGO CORDEIRO',        bases: ['BCB'] },
      { nome: 'WERBETH RODRIGUES',      bases: [] },
    ],
  },
  {
    gerencia: 'ruan',
    gerenciaLabel: 'RUAN',
    responsaveis: [
      { nome: 'FROTA', bases: [] },
    ],
  },
  {
    gerencia: 'ruan valmir',
    gerenciaLabel: 'RUAN VALMIR',
    responsaveis: [
      { nome: 'ERBERTH PEREIRA', bases: ['BCB'] },
      { nome: 'LUIS FILIPE',     bases: ['BCB'] },
      { nome: 'MARCELO SOARES',  bases: [] },
    ],
  },
  {
    gerencia: 'thiago',
    gerenciaLabel: 'THIAGO',
    responsaveis: [
      { nome: 'ACLESSIO', bases: ['PDS'] },
    ],
  },
  {
    gerencia: 'valvick',
    gerenciaLabel: 'VALVICK',
    responsaveis: [
      { nome: 'EDSON DE SOUZA PEREIRA', bases: ['BCB'] },
      { nome: 'FRANCISCO WILLIAM',    bases: ['PDT'] },
      { nome: 'IGOR DIONÍSIO',        bases: ['BCB'] },
      { nome: 'JACKSON SOUZA',        bases: ['BCB'] },
      { nome: 'JAMERSON MIRANDA',     bases: ['STI'] },
      { nome: 'LUIS FILIPE',          bases: [] },
      { nome: 'MARCOS ANDRADE',       bases: ['BDC'] },
      { nome: 'MATEUS',               bases: ['BCB'] },
      { nome: 'PAULO',                bases: ['PDT'] },
      { nome: 'PRYSCILLA CRISTYANE',  bases: ['BCB'] },
      { nome: 'RAFAELA MELO',         bases: ['PDT'] },
      { nome: 'RICARDO MALTA',        bases: ['BCB'] },
      { nome: 'VALVICK SALES',        bases: ['BCB'] },
    ],
  },
  {
    gerencia: 'waldir',
    gerenciaLabel: 'WALDIR',
    responsaveis: [
      { nome: 'WALDIR', bases: ['PDT'] },
    ],
  },
]

// ── helpers ──────────────────────────────────────────────────────────────────

function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ')
}

/**
 * Dado um valor de gerência (ex: 'julio'), retorna os nomes de responsáveis válidos.
 * Retorna null se a gerência não tiver mapeamento (exibe todos).
 */
export function getResponsaveisByGerencia(gerencia: string): string[] | null {
  if (gerencia === 'todos') return null
  const entry = GERENCIA_MAP.find((e) => e.gerencia === gerencia)
  if (!entry) return null
  return entry.responsaveis.map((r) => r.nome)
}

/**
 * Dado um valor de gerência e um responsável, retorna as bases válidas.
 * Retorna null se não houver mapeamento (exibe todas).
 * Comparação sem acento e case-insensitive para robustez.
 */
export function getBasesByGerenciaAndResponsavel(gerencia: string, responsavel: string): string[] | null {
  if (gerencia === 'todos') return null
  const entry = GERENCIA_MAP.find((e) => e.gerencia === gerencia)
  if (!entry) return null

  if (responsavel === 'todos') {
    const bases = new Set<string>()
    for (const r of entry.responsaveis) {
      for (const b of r.bases) bases.add(b)
    }
    return bases.size > 0 ? Array.from(bases) : null
  }

  const resp = entry.responsaveis.find((r) => norm(r.nome) === norm(responsavel))
  if (!resp || resp.bases.length === 0) return null
  return resp.bases
}
