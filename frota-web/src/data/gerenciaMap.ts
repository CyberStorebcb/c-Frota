/**
 * Mapeamento de Gerência → Responsáveis → Bases.
 * Usado para filtros em cascata: ao selecionar uma gerência os dropdowns
 * de Responsável e Base mostram apenas os valores válidos para aquela gerência.
 *
 * Estrutura: cada gerência lista seus responsáveis e, para cada responsável,
 * as bases que ele cobre. Um responsável pode cobrir N bases (1:N).
 * bases: [] significa responsável geral/sem base específica definida.
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
    gerencia: 'frota',
    gerenciaLabel: 'FROTA',
    responsaveis: [
      { nome: 'MARCELO SOARES',         bases: [] },
      { nome: 'LUCAS SOUZA',            bases: [] },
      { nome: 'RUAN VALMIR',            bases: ['STI'] },
      { nome: 'FRANCISCO JOSE GUERREIRO', bases: ['PDT'] },
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
      { nome: 'ARLISSON ROGERIO',        bases: [] },
      { nome: 'RESERVA',                 bases: [] },
      { nome: 'DEILTON RIBEIRO',         bases: ['STI'] },
      { nome: 'LEONARDO ESTRELA',        bases: ['BCB'] },
      { nome: 'AVARIADO',                bases: ['ITM'] },
      { nome: 'LUIS AUGUSTO',            bases: [] },
      { nome: 'EMANUEL',                 bases: [] },
      { nome: 'BRUNO NUNES XAVIER',      bases: [] },
      { nome: 'WASHINGTON SOARES',       bases: [] },
      { nome: 'ADAILTON LIMA FERREIRA',  bases: [] },
      { nome: 'RENATO RAMOS CARVALHO',   bases: [] },
      { nome: 'JORDEN CLEYSON',          bases: [] },
    ],
  },
  {
    gerencia: 'julio',
    gerenciaLabel: 'JÚLIO',
    responsaveis: [
      { nome: 'LUIS FILIPE',                    bases: [] },
      { nome: 'EDSON',                           bases: ['PDS'] },
      { nome: 'FRANCISCO WILLIAM',               bases: ['BCB'] },
      { nome: 'ANTONIO MARCOS SALAZAR DOS REIS', bases: ['BCB'] },
      { nome: 'JULIO CESAR',                     bases: ['PDT'] },
      { nome: 'DIEGO ALENCAR',                   bases: ['STI'] },
      { nome: 'MATEUS ANTÔNIO',                  bases: [] },
    ],
  },
  {
    gerencia: 'leandro',
    gerenciaLabel: 'LEANDRO',
    responsaveis: [
      { nome: 'NILO GONCALVES',              bases: [] },
      { nome: 'WELRISSON OLIVEIRA',          bases: [] },
      { nome: 'ANTONIO SILVA DE ABREU',      bases: ['BDC'] },
      { nome: 'EVERTON SIQUEIRA',            bases: ['ITM'] },
      { nome: 'JOSIELINGTON PAZ DE OLIVEIRA', bases: ['BCB'] },
      { nome: 'DARIO FRANÇA',               bases: ['PDT'] },
      { nome: 'NORMAM MATHEUS',             bases: ['STI'] },
      { nome: 'JOISE MARQUES',              bases: ['STI'] },
    ],
  },
  {
    gerencia: 'marcos',
    gerenciaLabel: 'MARCOS',
    responsaveis: [
      { nome: 'JOSIEL MENESES',    bases: [] },
      { nome: 'LEONARDO BRUNO',   bases: [] },
      { nome: 'IDIALDO COIMBRA',  bases: ['BDC'] },
      { nome: 'ROGÉRIO PEIXOTO',  bases: ['BDC'] },
    ],
  },
  {
    gerencia: 'paulo',
    gerenciaLabel: 'PAULO',
    responsaveis: [
      { nome: 'SANTANA DE LIMA',    bases: [] },
      { nome: 'GUILHERME FONSECA', bases: [] },
      { nome: 'RAIMUNDO HERMERSON', bases: ['PDS'] },
      { nome: 'FABIO LOPES',       bases: ['PDT'] },
      { nome: 'ANTONIO SAMUEL',    bases: ['PDT'] },
    ],
  },
  {
    gerencia: 'pryscilla',
    gerenciaLabel: 'PRYSCILLA',
    responsaveis: [
      { nome: 'PRYSCILLA CRISTYANE', bases: ['BCB', 'PDT'] },
    ],
  },
  {
    gerencia: 'rafaela',
    gerenciaLabel: 'RAFAELA',
    responsaveis: [
      { nome: 'ACLESSIO',                        bases: [] },
      { nome: 'RAIMUNDO ALMEIDA',                bases: [] },
      { nome: 'MARCOS ALENCAR',                  bases: ['PDS'] },
      { nome: 'MESSIAS ABREU',                   bases: ['PDT'] },
      { nome: 'JOAO CLIMACO',                    bases: ['BDC'] },
      { nome: 'GEOMARI',                         bases: [] },
      { nome: 'JONAS ARAUJO SALES',              bases: [] },
      { nome: 'PATRICK',                         bases: [] },
      { nome: 'CANDIDO GABRIEL',                 bases: [] },
      { nome: 'ANDERSON',                        bases: [] },
      { nome: 'GABRIEL DO CARMO',                bases: [] },
      { nome: 'JOADSON CARLOS DA SILVA FERREIRA', bases: [] },
      { nome: 'WALLYSON DA SILVA ALMEIDA',       bases: [] },
    ],
  },
  {
    gerencia: 'ricardo',
    gerenciaLabel: 'RICARDO',
    responsaveis: [
      { nome: 'LEONARDO MARTINS',      bases: [] },
      { nome: 'MATEUS ANTÔNIO',        bases: [] },
      { nome: 'CRISTOPHE DANIEL',      bases: ['BCB'] },
      { nome: 'MIKEIAS VELOSO',        bases: ['STI'] },
      { nome: 'EDNALDO ABREU MEIRELES', bases: ['ITM'] },
      { nome: 'EVERALDO NOGUEIRA',     bases: [] },
      { nome: 'WERBETH RODRIGUES',     bases: [] },
      { nome: 'ITALO',                 bases: [] },
      { nome: 'LAERCIO CORTA LIMA',    bases: [] },
      { nome: 'FAGNER ALMEIDA',        bases: [] },
      { nome: 'JAMES',                 bases: [] },
      { nome: 'ARLISSON ROGERIO',      bases: [] },
      { nome: 'EDIVAN LIMA',           bases: [] },
      { nome: 'MARCELO SOARES',        bases: [] },
      { nome: 'EDIVAN DE LIMA',        bases: [] },
      { nome: 'PABLO LOURA',           bases: [] },
      { nome: 'ABRAÃO',                bases: [] },
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
      { nome: 'ERBERTH PEREIRA', bases: [] },
      { nome: 'MARCELO SOARES',  bases: ['BCB', 'STI', 'ITM'] },
    ],
  },
  {
    gerencia: 'valvick',
    gerenciaLabel: 'VALVICK',
    responsaveis: [
      { nome: 'VALVICK SALES',      bases: [] },
      { nome: 'JACKSON SOUZA',      bases: [] },
      { nome: 'IGOR DIONÍSIO',      bases: ['BCB'] },
      { nome: 'RAFAELA MELO',       bases: ['PDT'] },
      { nome: 'PRYSCILLA CRISTYANE', bases: ['STI'] },
      { nome: 'JAMERSON MIRANDA',   bases: ['BDC'] },
      { nome: 'LEANDRO',            bases: [] },
      { nome: 'RICARDO MALTA',      bases: [] },
      { nome: 'PAULO',              bases: [] },
      { nome: 'MARCOS ANDRADE',     bases: [] },
      { nome: 'MATEUS',             bases: [] },
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
