export interface ChecklistItem {
  id: string
  label: string
}

export interface ChecklistGrupo {
  id: string
  titulo: string
  itens: ChecklistItem[]
}

export interface ChecklistSchemaDef {
  id: string
  nome: string
  descricao: string
  grupos: ChecklistGrupo[]
}

export const CHECKLIST_SCHEMAS: ChecklistSchemaDef[] = [
  {
    id: 'sky',
    nome: 'Checklist SKY',
    descricao: 'Veículos com cesto aéreo (Sky)',
    grupos: [
      {
        id: 'geral',
        titulo: 'Inspeção Geral',
        itens: [
          { id: 'sky-01', label: 'Nível de óleo do motor' },
          { id: 'sky-02', label: 'Nível de água / fluido de arrefecimento' },
          { id: 'sky-03', label: 'Nível do fluido de freio' },
          { id: 'sky-04', label: 'Nível da direção hidráulica' },
          { id: 'sky-05', label: 'Pneus (calibragem e condição visual)' },
          { id: 'sky-06', label: 'Faróis, lanternas e pisca-alertas' },
          { id: 'sky-07', label: 'Espelhos retrovisores' },
          { id: 'sky-08', label: 'Cinto de segurança' },
        ],
      },
      {
        id: 'cesto',
        titulo: 'Equipamento Cesto Aéreo',
        itens: [
          { id: 'sky-09', label: 'Óleo hidráulico do cesto (nível e vazamentos)' },
          { id: 'sky-10', label: 'Mangueiras hidráulicas (estado e fixação)' },
          { id: 'sky-11', label: 'Comandos do cesto (funcionamento superior e inferior)' },
          { id: 'sky-12', label: 'Sistema de emergência (descida manual)' },
          { id: 'sky-13', label: 'Cesto (trincas, deformações, plataforma)' },
          { id: 'sky-14', label: 'Correntes / cintos de segurança do cesto' },
          { id: 'sky-15', label: 'Estabilizadores / sapatas (nivelamento)' },
          { id: 'sky-16', label: 'Sinalização sonora e luminosa do equipamento' },
          { id: 'sky-17', label: 'Aterramento elétrico do equipamento' },
        ],
      },
      {
        id: 'documentacao',
        titulo: 'Documentação',
        itens: [
          { id: 'sky-18', label: 'CRLV em dia' },
          { id: 'sky-19', label: 'Laudo ART do equipamento (dentro da validade)' },
          { id: 'sky-20', label: 'Extintor de incêndio (lacre e validade)' },
          { id: 'sky-21', label: 'Kit de primeiros socorros' },
          { id: 'sky-22', label: 'Triângulo de sinalização' },
        ],
      },
    ],
  },
  {
    id: 'munck',
    nome: 'Checklist Munck',
    descricao: 'Caminhões com guindaste Munck',
    grupos: [
      {
        id: 'geral',
        titulo: 'Inspeção Geral do Caminhão',
        itens: [
          { id: 'mnk-01', label: 'Nível de óleo do motor' },
          { id: 'mnk-02', label: 'Nível de água / fluido de arrefecimento' },
          { id: 'mnk-03', label: 'Nível do fluido de freio' },
          { id: 'mnk-04', label: 'Nível da direção hidráulica' },
          { id: 'mnk-05', label: 'Pneus (calibragem e estado)' },
          { id: 'mnk-06', label: 'Sistema de freios (teste em baixa velocidade)' },
          { id: 'mnk-07', label: 'Iluminação completa (faróis, sinaleiras, emergência)' },
          { id: 'mnk-08', label: 'Cinto de segurança do motorista' },
        ],
      },
      {
        id: 'guindaste',
        titulo: 'Guindaste Munck',
        itens: [
          { id: 'mnk-09', label: 'Óleo hidráulico (nível e vazamentos)' },
          { id: 'mnk-10', label: 'Mangueiras e conexões hidráulicas' },
          { id: 'mnk-11', label: 'Cabo de aço (desgaste, empenamento, fios rompidos)' },
          { id: 'mnk-12', label: 'Gancho principal (trava de segurança funcionando)' },
          { id: 'mnk-13', label: 'Lança (estrutura, trincas, deformações)' },
          { id: 'mnk-14', label: 'Articulações e pinos (folgas e lubrificação)' },
          { id: 'mnk-15', label: 'Comandos do guindaste (resposta e precisão)' },
          { id: 'mnk-16', label: 'Limitador de carga / momento' },
          { id: 'mnk-17', label: 'Sapatas estabilizadoras (extensão e fixação)' },
          { id: 'mnk-18', label: 'Sinalização sonora de operação' },
        ],
      },
      {
        id: 'documentacao',
        titulo: 'Documentação',
        itens: [
          { id: 'mnk-19', label: 'CRLV em dia' },
          { id: 'mnk-20', label: 'Laudo ART do equipamento (dentro da validade)' },
          { id: 'mnk-21', label: 'Extintor de incêndio (lacre e validade)' },
          { id: 'mnk-22', label: 'Triângulo de sinalização' },
        ],
      },
    ],
  },
  {
    id: 'picape-leve',
    nome: 'Checklist Picape Leve',
    descricao: 'Strada, Saveiro e similares',
    grupos: [
      {
        id: 'geral',
        titulo: 'Motor e Fluidos',
        itens: [
          { id: 'pl-01', label: 'Nível de óleo do motor' },
          { id: 'pl-02', label: 'Nível de água / fluido de arrefecimento' },
          { id: 'pl-03', label: 'Nível do fluido de freio' },
          { id: 'pl-04', label: 'Bateria (terminais limpos e fixados)' },
          { id: 'pl-05', label: 'Correia do alternador / acessórios' },
        ],
      },
      {
        id: 'rodagem',
        titulo: 'Rodagem e Freios',
        itens: [
          { id: 'pl-06', label: 'Pneus (calibragem, desgaste e condição visual)' },
          { id: 'pl-07', label: 'Freio de estacionamento' },
          { id: 'pl-08', label: 'Freio de serviço (teste breve)' },
          { id: 'pl-09', label: 'Suspensão (barulhos, folgas)' },
        ],
      },
      {
        id: 'carroceria',
        titulo: 'Carroceria e Acessórios',
        itens: [
          { id: 'pl-10', label: 'Caçamba / carroceria (fixação e estado)' },
          { id: 'pl-11', label: 'Porta caçamba (dobradiças e trava)' },
          { id: 'pl-12', label: 'Espelhos retrovisores' },
          { id: 'pl-13', label: 'Iluminação (faróis, setas, freio, ré)' },
          { id: 'pl-14', label: 'Buzina' },
          { id: 'pl-15', label: 'Cinto de segurança' },
          { id: 'pl-16', label: 'Limpadores de para-brisa' },
          { id: 'pl-17', label: 'Extintor de incêndio (lacre e validade)' },
          { id: 'pl-18', label: 'Triângulo de sinalização' },
          { id: 'pl-19', label: 'CRLV em dia' },
        ],
      },
    ],
  },
  {
    id: 'picape-4x4',
    nome: 'Checklist Picape 4x4',
    descricao: 'Hilux, L200 Triton e similares',
    grupos: [
      {
        id: 'geral',
        titulo: 'Motor e Fluidos',
        itens: [
          { id: 'p4-01', label: 'Nível de óleo do motor' },
          { id: 'p4-02', label: 'Nível de água / fluido de arrefecimento' },
          { id: 'p4-03', label: 'Nível do fluido de freio' },
          { id: 'p4-04', label: 'Nível de óleo da caixa de transferência' },
          { id: 'p4-05', label: 'Nível de óleo dos diferenciais (dianteiro e traseiro)' },
          { id: 'p4-06', label: 'Bateria (terminais limpos e fixados)' },
        ],
      },
      {
        id: 'tracao',
        titulo: 'Tração 4x4',
        itens: [
          { id: 'p4-07', label: 'Sistema 4x4 engaja/desengatado corretamente' },
          { id: 'p4-08', label: 'Atuador de tração dianteira (sem folga excessiva)' },
          { id: 'p4-09', label: 'Half-shafts / semi-eixos (coifas íntegras, sem folgas)' },
          { id: 'p4-10', label: 'Barulhos ou vibrações ao engajar 4x4' },
        ],
      },
      {
        id: 'rodagem',
        titulo: 'Rodagem e Freios',
        itens: [
          { id: 'p4-11', label: 'Pneus (calibragem, desgaste e condição visual)' },
          { id: 'p4-12', label: 'Freio de estacionamento' },
          { id: 'p4-13', label: 'Freio de serviço (teste breve)' },
          { id: 'p4-14', label: 'Suspensão (molas, amortecedores, barulhos)' },
        ],
      },
      {
        id: 'carroceria',
        titulo: 'Carroceria e Acessórios',
        itens: [
          { id: 'p4-15', label: 'Caçamba / carroceria (fixação e estado)' },
          { id: 'p4-16', label: 'Espelhos retrovisores' },
          { id: 'p4-17', label: 'Iluminação (faróis, setas, freio, ré)' },
          { id: 'p4-18', label: 'Cinto de segurança' },
          { id: 'p4-19', label: 'Limpadores de para-brisa' },
          { id: 'p4-20', label: 'Extintor de incêndio (lacre e validade)' },
          { id: 'p4-21', label: 'Triângulo de sinalização' },
          { id: 'p4-22', label: 'CRLV em dia' },
        ],
      },
    ],
  },
  {
    id: 'motocicleta',
    nome: 'Checklist Motocicleta',
    descricao: 'Honda Bros e similares',
    grupos: [
      {
        id: 'geral',
        titulo: 'Motor e Fluidos',
        itens: [
          { id: 'mt-01', label: 'Nível de óleo do motor' },
          { id: 'mt-02', label: 'Corrente (tensão e lubrificação)' },
          { id: 'mt-03', label: 'Nível de combustível' },
          { id: 'mt-04', label: 'Filtro de ar (condição visual)' },
        ],
      },
      {
        id: 'rodagem',
        titulo: 'Rodagem e Freios',
        itens: [
          { id: 'mt-05', label: 'Pneu dianteiro (calibragem e desgaste)' },
          { id: 'mt-06', label: 'Pneu traseiro (calibragem e desgaste)' },
          { id: 'mt-07', label: 'Freio dianteiro (pastilha e fluido)' },
          { id: 'mt-08', label: 'Freio traseiro (tambor ou disco)' },
          { id: 'mt-09', label: 'Rolamentos de roda (folga e ruído)' },
        ],
      },
      {
        id: 'eletrica',
        titulo: 'Elétrica e Documentação',
        itens: [
          { id: 'mt-10', label: 'Farol dianteiro e lanterna traseira' },
          { id: 'mt-11', label: 'Pisca-alerta esquerdo e direito' },
          { id: 'mt-12', label: 'Buzina' },
          { id: 'mt-13', label: 'Bateria (carga e terminais)' },
          { id: 'mt-14', label: 'Capacete disponível e em bom estado' },
          { id: 'mt-15', label: 'CRLV em dia' },
        ],
      },
    ],
  },
  {
    id: 'veiculo-leve',
    nome: 'Checklist Veículo Leve',
    descricao: 'Argo, Gol, Polo e similares',
    grupos: [
      {
        id: 'geral',
        titulo: 'Motor e Fluidos',
        itens: [
          { id: 'vl-01', label: 'Nível de óleo do motor' },
          { id: 'vl-02', label: 'Nível de água / fluido de arrefecimento' },
          { id: 'vl-03', label: 'Nível do fluido de freio' },
          { id: 'vl-04', label: 'Nível da direção hidráulica / elétrica (fluido)' },
          { id: 'vl-05', label: 'Bateria (terminais limpos e fixados)' },
        ],
      },
      {
        id: 'rodagem',
        titulo: 'Rodagem e Freios',
        itens: [
          { id: 'vl-06', label: 'Pneus (calibragem, desgaste e condição visual)' },
          { id: 'vl-07', label: 'Freio de estacionamento' },
          { id: 'vl-08', label: 'Freio de serviço (teste breve)' },
          { id: 'vl-09', label: 'Suspensão (barulhos, folgas)' },
        ],
      },
      {
        id: 'carroceria',
        titulo: 'Carroceria e Acessórios',
        itens: [
          { id: 'vl-10', label: 'Espelhos retrovisores (regulagem e fixação)' },
          { id: 'vl-11', label: 'Iluminação completa (faróis, lanternas, setas)' },
          { id: 'vl-12', label: 'Buzina' },
          { id: 'vl-13', label: 'Limpadores de para-brisa (palhetas e fluido)' },
          { id: 'vl-14', label: 'Cintos de segurança (todos os bancos)' },
          { id: 'vl-15', label: 'Air-bags (luz de aviso no painel)' },
          { id: 'vl-16', label: 'Extintor de incêndio (lacre e validade)' },
          { id: 'vl-17', label: 'Triângulo de sinalização' },
          { id: 'vl-18', label: 'CRLV em dia' },
        ],
      },
    ],
  },
]

export const SCHEMA_MAP = Object.fromEntries(CHECKLIST_SCHEMAS.map((s) => [s.id, s]))
