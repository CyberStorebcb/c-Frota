export interface ChecklistItem {
  id: string
  label: string
  imperativo?: boolean   // true = item marcado com 🚫 (impede condução se NC)
}

export interface ChecklistGrupo {
  id: string
  titulo: string
  itens: ChecklistItem[]
}

export interface CampoExtra {
  id: string
  label: string
  tipo: 'text' | 'select' | 'number'
  opcoes?: string[]
  obrigatorio?: boolean
}

export interface ChecklistSchemaDef {
  id: string
  nome: string
  descricao: string
  camposExtras?: CampoExtra[]
  grupos: ChecklistGrupo[]
  temEvidencia?: boolean
  temSupervisor?: boolean
  temProblemas?: boolean
}

// ---------------------------------------------------------------------------
// Campos comuns a todos os checklists
// Matrícula e Nome do operador já vêm da tela de identificação.
// Preencha as listas opcoes[] com os dados reais da sua frota.
// ---------------------------------------------------------------------------
const CAMPOS_COMUNS: CampoExtra[] = [
  {
    id: 'placa',
    label: 'PLACA',
    tipo: 'select',
    obrigatorio: true,
    opcoes: [
      // Ex: 'POY2583', 'ABC1234'
    ],
  },
  {
    id: 'marca_modelo',
    label: 'MARCA/MODELO',
    tipo: 'select',
    obrigatorio: true,
    opcoes: [
      // Ex: 'VW/8.160', 'Ford/Ranger'
    ],
  },
  {
    id: 'km_atual',
    label: 'KM ATUAL',
    tipo: 'number',
    obrigatorio: true,
  },
  {
    id: 'horimetro',
    label: 'HORÍMETRO ATUAL',
    tipo: 'number',
    obrigatorio: false,
  },
  {
    id: 'prefixo',
    label: 'PREFIXO',
    tipo: 'select',
    obrigatorio: true,
    opcoes: [
      // Ex: 'BDC304'
    ],
  },
  {
    id: 'processo',
    label: 'PROCESSO',
    tipo: 'select',
    obrigatorio: true,
    opcoes: [
      // Ex: 'GOMAN - ADM'
    ],
  },
  {
    id: 'localidade',
    label: 'LOCALIDADE',
    tipo: 'text',
    obrigatorio: true,
  },
]

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------
export const CHECKLIST_SCHEMAS: ChecklistSchemaDef[] = [
  // ── SKY ──────────────────────────────────────────────────────────────────
  {
    id: 'sky',
    nome: 'Checklist SKY',
    descricao: 'Veículos com cesto aéreo (Sky)',
    temEvidencia: true,
    temSupervisor: true,
    temProblemas: true,
    camposExtras: CAMPOS_COMUNS,
    grupos: [
      {
        id: 'inspecao',
        titulo: 'Inspeção do Veículo — Antes de Operar',
        itens: [
          { id: 'sky-01', label: 'Adesivo IDT (CGB, Fone, Frota, tag)' },
          { id: 'sky-02', label: 'Pneus em uso e estepe (verifique calibragem, estado dos sulcos)', imperativo: true },
          { id: 'sky-03', label: 'Rodas (verifique amassados, trincas e sinais de afrouxamento dos parafusos)', imperativo: true },
          { id: 'sky-04', label: 'Radiador de água (verifique nível do líquido e complete se necessário)', imperativo: true },
          { id: 'sky-05', label: 'Carroceria (verifique batidas, amassados e arranhões, organização e limpeza)' },
          { id: 'sky-06', label: 'Trava do capô (verifique estado geral)', imperativo: true },
          { id: 'sky-07', label: 'Retrovisores (verifique fixação, estado e trincas)', imperativo: true },
          { id: 'sky-08', label: 'Porta escada (Base, cinda de amarração)' },
          { id: 'sky-09', label: 'Documentos obrigatórios (CNH, CRLV, AET, C.D.D)', imperativo: true },
          { id: 'sky-10', label: 'Cartão de abastecimento (Verificar se possui)', imperativo: true },
          { id: 'sky-11', label: 'Faróis, piscas, lanternas e luz do freio (verifique o funcionamento)', imperativo: true },
          { id: 'sky-12', label: 'Painel, vidros (para-brisa), bancos e portas (verifique estado geral)', imperativo: true },
          { id: 'sky-13', label: 'Funcionamento do limpador do para-brisa (nível do reservatório)' },
          { id: 'sky-14', label: 'Sistema de direção (verifique folgas)', imperativo: true },
          { id: 'sky-15', label: 'Funcionamento do velocímetro (Tacógrafo, Horímetro, Hodômetro, Rastreador)' },
          { id: 'sky-16', label: 'Freios de estacionamento e de serviço (verifique o funcionamento)', imperativo: true },
          { id: 'sky-17', label: 'Buzina e alarme de ré (verifique o funcionamento)', imperativo: true },
          { id: 'sky-18', label: 'Suspensão e molas' },
          { id: 'sky-19', label: 'Cabine e cabine auxiliar (verifique a higienização, vidros, portas, objetos)' },
          { id: 'sky-20', label: 'Cintos de segurança (Motorista e Passageiros)', imperativo: true },
          { id: 'sky-21', label: 'Acessórios (Macaco Hidráulico / Chave de Roda / Triângulo, V. e Extintor)', imperativo: true },
          { id: 'sky-22', label: 'Bomba de ARLA e unidade dosadora', imperativo: true },
          { id: 'sky-23', label: 'Pasta de documentação do veículo' },
        ],
      },
      {
        id: 'antes_conducao',
        titulo: 'Verificação — Antes da Condução',
        itens: [
          { id: 'sky-24', label: 'Verificar cintas de travamento, fixação e repouso correto da lança', imperativo: true },
          { id: 'sky-25', label: 'Verificar fixação de todo o equipamento de modo geral (base do implemento, trincas, parafusos e soldas)', imperativo: true },
          { id: 'sky-26', label: 'Verificar a fixação das coberturas da lança e cestos' },
        ],
      },
      {
        id: 'teste_operacao',
        titulo: 'Teste de Operação — Ligado',
        itens: [
          { id: 'sky-27', label: 'Gráfico de alcance (em local visível para o operador)', imperativo: true },
          { id: 'sky-28', label: 'Verificar se há vazamento (nível do reservatório hidráulico, mangueiras e conexões)', imperativo: true },
          { id: 'sky-29', label: 'Verificar as partes de fibra (Lança, cestos, liners, trincas, furos, rachaduras e limpeza)', imperativo: true },
          { id: 'sky-30', label: 'Checar operação dos comandos (Superior e Inferior) pinos e cabos das barras de nivelamento', imperativo: true },
          { id: 'sky-31', label: 'Checar a proteção das alavancas dos comandos do cesto', imperativo: true },
          { id: 'sky-32', label: 'Checar operação das patolas (Sistema de estabilização)', imperativo: true },
          { id: 'sky-33', label: 'Par de calços tipo berço (Possui e está em bom estado de conservação?)', imperativo: true },
        ],
      },
    ],
  },

  // ── MUNCK ─────────────────────────────────────────────────────────────────
  {
    id: 'munck',
    nome: 'Checklist Munck',
    descricao: 'Caminhões com guindaste Munck',
    temEvidencia: true,
    temSupervisor: true,
    temProblemas: true,
    camposExtras: CAMPOS_COMUNS,
    grupos: [
      {
        id: 'inspecao',
        titulo: 'Inspeção do Veículo — Antes de Operar',
        itens: [
          { id: 'mnk-01', label: 'Adesivo IDT (CGB, Fone, Frota, tag)' },
          { id: 'mnk-02', label: 'Pneus em uso e estepe (verifique calibragem, estado dos sulcos)', imperativo: true },
          { id: 'mnk-03', label: 'Rodas (verifique amassados, trincas e sinais de afrouxamento dos parafusos)', imperativo: true },
          { id: 'mnk-04', label: 'Radiador de água (verifique nível do líquido e complete se necessário)', imperativo: true },
          { id: 'mnk-05', label: 'Carroceria (verifique batidas, amassados e arranhões, organização e limpeza)' },
          { id: 'mnk-06', label: 'Porta escada (Base, cinta de amarração)', imperativo: true },
          { id: 'mnk-07', label: 'Trava do capô (verifique estado geral)', imperativo: true },
          { id: 'mnk-08', label: 'Retrovisores (verifique fixação, estado e trincas)', imperativo: true },
          { id: 'mnk-09', label: 'Documentos obrigatórios (CNH, CRLV, AET, C.D.D)', imperativo: true },
          { id: 'mnk-10', label: 'Cartão de abastecimento (Verificar se possui)', imperativo: true },
          { id: 'mnk-11', label: 'Faróis, piscas, lanternas e luz do freio (verifique o funcionamento)', imperativo: true },
          { id: 'mnk-12', label: 'Painel, vidros (para-brisa), bancos e portas (verifique estado geral)', imperativo: true },
          { id: 'mnk-13', label: 'Funcionamento do limpador do para-brisa (nível do reservatório)' },
          { id: 'mnk-14', label: 'Sistema de direção (verifique folgas)', imperativo: true },
          { id: 'mnk-15', label: 'Funcionamento do velocímetro (Tacógrafo, Horímetro, Hodômetro, Rastreador)' },
          { id: 'mnk-16', label: 'Freios de estacionamento e de serviço (verifique o funcionamento)', imperativo: true },
          { id: 'mnk-17', label: 'Buzina e alarme de ré (verifique o funcionamento)', imperativo: true },
          { id: 'mnk-18', label: 'Suspensão e molas', imperativo: true },
          { id: 'mnk-19', label: 'Cabine e cabine auxiliar (verifique a higienização, vidros, portas, objetos)', imperativo: true },
          { id: 'mnk-20', label: 'Cintos de segurança (Motorista e Passageiros)', imperativo: true },
          { id: 'mnk-21', label: 'Equip. de segurança (Macaco Hidráulico / Chave de Roda / Triângulo, V. e Extintor)', imperativo: true },
        ],
      },
      {
        id: 'teste_operacao',
        titulo: 'Teste de Operação',
        itens: [
          { id: 'mnk-22', label: 'O veículo possui porta escada de acesso à carroceria (verificar estado de conservação)', imperativo: true },
          { id: 'mnk-23', label: 'Tabela de carga (gráfico de carga em local visível para o operador)', imperativo: true },
          { id: 'mnk-24', label: 'Verificar se há vazamento (nível do reservatório hidráulico, mangueiras e conexões)', imperativo: true },
          { id: 'mnk-25', label: 'Checar operação das patolas (cepos estabilizadores)' },
          { id: 'mnk-26', label: 'Estender e recolher lança "telescópio" (Alav. e dispositivos de comandos)' },
          { id: 'mnk-27', label: 'Verificar gancho e trava de segurança', imperativo: true },
          { id: 'mnk-28', label: 'Verifique as condições dos cabos de aço' },
          { id: 'mnk-29', label: 'Os braços estão travados?' },
          { id: 'mnk-30', label: 'As cintas estão em bom estado de conservação e segurança?', imperativo: true },
          { id: 'mnk-31', label: 'Par de calços tipo berço (Possui e está em bom estado de conservação?)', imperativo: true },
        ],
      },
    ],
  },

  // ── PICAPE LEVE ───────────────────────────────────────────────────────────
  {
    id: 'picape-leve',
    nome: 'Checklist Picape Leve',
    descricao: 'Strada, Saveiro e similares',
    temEvidencia: true,
    temSupervisor: true,
    temProblemas: true,
    camposExtras: CAMPOS_COMUNS,
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

  // ── PICAPE 4x4 ────────────────────────────────────────────────────────────
  {
    id: 'picape-4x4',
    nome: 'Checklist Picape 4x4',
    descricao: 'Hilux, L200 Triton e similares',
    temEvidencia: true,
    temSupervisor: true,
    temProblemas: true,
    camposExtras: CAMPOS_COMUNS,
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
          { id: 'p4-07', label: 'Sistema 4x4 engaja/desengata corretamente' },
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

  // ── MOTOCICLETA ───────────────────────────────────────────────────────────
  {
    id: 'motocicleta',
    nome: 'Checklist Motocicleta',
    descricao: 'Honda Bros e similares',
    temEvidencia: true,
    temSupervisor: true,
    temProblemas: true,
    camposExtras: CAMPOS_COMUNS,
    grupos: [
      {
        id: 'inspecao',
        titulo: 'Inspeção — Antes de Pilotar',
        itens: [
          { id: 'mt-01', label: 'Combustível (cheio, meio, reserva)' },
          { id: 'mt-02', label: 'Pneus dianteiro/traseiro (verificar nível de desgaste)', imperativo: true },
          { id: 'mt-03', label: 'Farol (alto/baixo) — verificar funcionamento', imperativo: true },
          { id: 'mt-04', label: 'Sinaleiras (esquerda/direita) — verificar funcionamento', imperativo: true },
          { id: 'mt-05', label: 'Retroreflector traseiro (verificar avarias, se possui)', imperativo: true },
          { id: 'mt-06', label: 'Buzina — verificar funcionamento', imperativo: true },
          { id: 'mt-07', label: 'Retrovisores dir/esq (verificar se possui, adequado e estado)', imperativo: true },
          { id: 'mt-08', label: 'Corta-pipa — verificar se possui', imperativo: true },
          { id: 'mt-09', label: 'Paralama dianteiro — verificar se possui', imperativo: true },
          { id: 'mt-10', label: 'Paralama traseiro — verificar se possui', imperativo: true },
          { id: 'mt-11', label: 'Manopla dir/esq (verificar se possui e estado)', imperativo: true },
          { id: 'mt-12', label: 'Pedal de freio (verificar estado e avarias)', imperativo: true },
          { id: 'mt-13', label: 'Manete de embreagem/freio (verificar avarias)', imperativo: true },
          { id: 'mt-14', label: 'Capa do banco (verificar estado de conservação, rasgos)', imperativo: true },
          { id: 'mt-15', label: 'Lanterna/luz de posição — verificar funcionamento', imperativo: true },
          { id: 'mt-16', label: 'Lanterna/luz de freio "STOP" — verificar funcionamento', imperativo: true },
          { id: 'mt-17', label: 'Transmissão (verificar desgaste dos dentes e folga da corrente)', imperativo: true },
          { id: 'mt-18', label: 'Carenagens — verificar estado de conservação', imperativo: true },
          { id: 'mt-19', label: 'Óleo do motor (verificar nível e próxima troca)' },
          { id: 'mt-20', label: 'Vazamento de óleo do motor (verificar indício de vazamento)' },
          { id: 'mt-21', label: 'Freio dianteiro/traseiro — verificar funcionamento', imperativo: true },
          { id: 'mt-22', label: 'Amortecedor (verificar vazamento de óleo no retentor)', imperativo: true },
          { id: 'mt-23', label: 'Placa/lacre (verificar se possui, legibilidade)', imperativo: true },
          { id: 'mt-24', label: 'Pedal central (verificar empenos e avarias)', imperativo: true },
          { id: 'mt-25', label: 'Protetor de motor (verificar se possui e avarias)', imperativo: true },
          { id: 'mt-26', label: 'Documento CRLV (verificar se possui, validade)', imperativo: true },
          { id: 'mt-27', label: 'Cartão de abastecimento — verificar se possui', imperativo: true },
          { id: 'mt-28', label: 'Cavalete lateral (verificar avarias e borracha de apoio)' },
          { id: 'mt-29', label: 'Limpeza e manutenção (verificar estado geral de limpeza)' },
        ],
      },
    ],
  },

  // ── VEÍCULO LEVE ──────────────────────────────────────────────────────────
  {
    id: 'veiculo-leve',
    nome: 'Checklist Veículo Leve',
    descricao: 'Argo, Gol, Polo e similares',
    temEvidencia: true,
    temSupervisor: true,
    temProblemas: true,
    camposExtras: CAMPOS_COMUNS,
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
