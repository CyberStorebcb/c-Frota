export type SupervisorFilterSelectOption = { value: string; label: string }

function normSup(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

export function matchesSupervisorFilter(rowSupervisor: string, filterValue: string): boolean {
  if (filterValue === 'todos') return true
  return normSup(rowSupervisor).includes(normSup(filterValue))
}

// Lista estática de 72 supervisores autorizados (fonte: SUPERVISORES.txt)
const AUTHORIZED_SUPERVISORS = [
  'LEONARDO ESTRELA',
  'PABLO LOURA',
  'EVERALDO NOGUEIRA',
  'ARLISSON ROGERIO',
  'DEILTON RIBEIRO',
  'LUIS FILIPE',
  'ANTONIO MARCOS SALAZAR DOS REIS',
  'MIKEIAS VELOSO',
  'RAIMUNDO HERMERSON',
  'GUILHERME FONSECA',
  'WERBETH RODRIGUES',
  'LUIZ CARLOS',
  'CRISTOPHE DANIEL',
  'JACKSON SOUZA',
  'ANDERSON',
  'JOAO CLIMACO',
  'RAIMUNDO ALMEIDA',
  'JOADSON CARLOS DA SILVA FERREIRA',
  'WALLYSON DA SILVA ALMEIDA',
  'MARCOS ALENCAR',
  'JOSIEL MENESES',
  'LEONARDO BRUNO',
  'MESSIAS ABREU',
  'WASHINGTON SOARES',
  'NONATO',
  'ADAILTON LIMA FERREIRA',
  'GLEYSON',
  'LUCAS ALVES',
  'BRUNO',
  'FISCAL',
  'ANTONIO SAMUEL',
  'SANTANA DE LIMA',
  'HITALO',
  'MATEUS',
  'JORDEN CLEYSON',
  'RENATO RAMOS CARVALHO',
  'GABRIEL DO CARMO',
  'JOISE MARQUES',
  'RICARDO MALTA',
  'AFONSO',
  'NORMAM MATHEUS',
  'JAMERSON MIRANDA',
  'LEANDRO FRANCISCO',
  'JULIO CESAR',
  'PRYSCILLA CRISTYANE',
  'RAFAELA MELO',
  'JOÃO ALEF',
  'FRANCISCO JOSE GUERREIRO',
  'RUAN VALMIR',
  'IGOR DIONÍSIO',
  'DARIO FRANÇA',
  'LUCAS SOUZA',
  'EDIVAN DE LIMA',
  'PAULO',
  'JOSIELINGTON PAZ DE OLIVEIRA',
  'EVERTON SIQUEIRA',
  'ANTONIO SILVA DE ABREU',
  'WELRISSON OLIVEIRA',
  'NILO GONCALVES',
  'MATEUS ANTÔNIO',
  'LEONARDO MARTINS',
  'ABRAÃO',
  'VALVICK SALES',
  'ROGÉRIO PEIXOTO',
  'PATRICK',
  'ACLESSIO',
  'WALDIR',
  'EMANUEL',
  'MARCOS ANDRADE',
  'IDIALDO COIMBRA',
  'ROGÉRIO LEANDRO PEIXOTO',
]

// Gera lista de supervisores autorizados
function buildSupervisorOptions(): SupervisorFilterSelectOption[] {
  const opts: SupervisorFilterSelectOption[] = AUTHORIZED_SUPERVISORS.map(name => ({
    value: name,
    label: name,
  }))

  opts.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
  return [{ value: 'todos', label: 'Todos' }, ...opts]
}

export const SUPERVISOR_FILTER_SELECT_OPTIONS: SupervisorFilterSelectOption[] = buildSupervisorOptions()
