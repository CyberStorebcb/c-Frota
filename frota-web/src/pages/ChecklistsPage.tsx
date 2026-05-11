import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Bike,
  Car,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  BarChart2,
  Radio,
  Search,
  Truck,
} from 'lucide-react'
import { CHECKLIST_SCHEMAS as _SCHEMAS } from '../data/checklistSchemas'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type Resposta = 'ok' | 'nok' | 'na' | null

interface ChecklistItem {
  id: string
  label: string
}

interface ChecklistGrupo {
  id: string
  titulo: string
  itens: ChecklistItem[]
}

interface ChecklistSchema {
  id: string
  nome: string
  descricao: string
  icon: React.ReactNode
  cor: string
  corBg: string
  grupos: ChecklistGrupo[]
}

// ---------------------------------------------------------------------------
// Dados
// ---------------------------------------------------------------------------

const CHECKLIST_SCHEMAS: Omit<ChecklistSchema, 'icon' | 'cor' | 'corBg'>[] = [
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

const CARD_META: Record<string, { icon: React.ReactNode; cor: string; corBg: string }> = {
  sky:           { icon: <Radio size={24} />,  cor: 'text-sky-500',     corBg: 'bg-sky-500/10 dark:bg-sky-500/15' },
  munck:         { icon: <Truck size={24} />,  cor: 'text-amber-500',   corBg: 'bg-amber-500/10 dark:bg-amber-500/15' },
  'picape-leve': { icon: <Car size={24} />,    cor: 'text-emerald-500', corBg: 'bg-emerald-500/10 dark:bg-emerald-500/15' },
  'picape-4x4':  { icon: <Car size={24} />,    cor: 'text-violet-500',  corBg: 'bg-violet-500/10 dark:bg-violet-500/15' },
  motocicleta:   { icon: <Bike size={24} />,   cor: 'text-rose-500',    corBg: 'bg-rose-500/10 dark:bg-rose-500/15' },
  'veiculo-leve':{ icon: <Car size={24} />,    cor: 'text-slate-400',   corBg: 'bg-slate-500/10 dark:bg-slate-500/15' },
}

const SCHEMAS: ChecklistSchema[] = CHECKLIST_SCHEMAS.map((s) => ({
  ...s,
  ...(CARD_META[s.id] ?? { icon: <ClipboardList size={24} />, cor: 'text-slate-400', corBg: 'bg-slate-500/10' }),
}))

// ---------------------------------------------------------------------------
// Botões de resposta — tamanho touch-friendly
// ---------------------------------------------------------------------------

const OPCOES = [
  {
    valor: 'ok' as const,
    label: 'OK',
    activeClass: 'bg-emerald-500 border-emerald-500 text-white',
    idleClass:   'border-slate-200 text-slate-500 active:bg-emerald-50 dark:border-slate-700 dark:text-slate-400',
  },
  {
    valor: 'nok' as const,
    label: 'NOK',
    activeClass: 'bg-rose-500 border-rose-500 text-white',
    idleClass:   'border-slate-200 text-slate-500 active:bg-rose-50 dark:border-slate-700 dark:text-slate-400',
  },
  {
    valor: 'na' as const,
    label: 'N/A',
    activeClass: 'bg-slate-500 border-slate-500 text-white',
    idleClass:   'border-slate-200 text-slate-500 active:bg-slate-100 dark:border-slate-700 dark:text-slate-400',
  },
]

// ---------------------------------------------------------------------------
// Formulário de preenchimento
// ---------------------------------------------------------------------------

function ChecklistForm({ schema, onVoltar }: { schema: ChecklistSchema; onVoltar: () => void }) {
  const totalItens = schema.grupos.reduce((acc, g) => acc + g.itens.length, 0)
  const [respostas, setRespostas] = useState<Record<string, Resposta>>({})
  const [observacoes, setObservacoes] = useState<Record<string, string>>({})
  const [responsavel, setResponsavel] = useState('')
  const [placa, setPlaca] = useState('')
  const [km, setKm] = useState('')
  const [data, setData] = useState(() => new Date().toISOString().split('T')[0] ?? '')

  const respondidos = Object.values(respostas).filter((v) => v !== null).length
  const nokCount = Object.values(respostas).filter((v) => v === 'nok').length
  const progresso = totalItens > 0 ? Math.round((respondidos / totalItens) * 100) : 0
  const concluido = progresso === 100

  const setResposta = (id: string, valor: Resposta) =>
    setRespostas((prev) => ({ ...prev, [id]: prev[id] === valor ? null : valor }))

  const setObs = (id: string, texto: string) =>
    setObservacoes((prev) => ({ ...prev, [id]: texto }))

  return (
    /* espaço extra no fundo para o conteúdo não ficar atrás da barra fixa */
    <div className="pb-24">

      {/* ── Cabeçalho da página (padrão HistoricoPage) ───────────── */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onVoltar}
            className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 active:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
            aria-label="Voltar"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-3">
            <div className={`grid h-10 w-10 place-items-center rounded-2xl shadow-soft ${schema.corBg} ${schema.cor}`}>
              {schema.icon}
            </div>
            <div>
              <div className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                {schema.nome}
              </div>
              <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                {schema.descricao}
              </div>
            </div>
          </div>
        </div>

        {/* progresso — alinhado à direita no desktop */}
        <div className="flex items-center gap-3 sm:justify-end">
          <span className="text-xs font-extrabold tabular-nums text-slate-500 dark:text-slate-400">
            {respondidos}/{totalItens} itens
          </span>
          <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                nokCount > 0 ? 'bg-rose-500' : concluido ? 'bg-emerald-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progresso}%` }}
            />
          </div>
          <span className="w-9 text-right text-xs font-black tabular-nums text-slate-700 dark:text-slate-300">
            {progresso}%
          </span>
        </div>
      </div>

      {/* ── Layout desktop: sidebar de dados + coluna de itens ───── */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">

        {/* Coluna esquerda no desktop: dados do veículo (fixa) */}
        <div className="lg:sticky lg:top-4 lg:w-64 lg:shrink-0">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-950">
            <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Dados do Veículo
              </p>
            </div>
            {/* no mobile: 2 colunas; no desktop (dentro da sidebar): 1 coluna */}
            <div className="grid grid-cols-2 gap-px bg-slate-100 dark:bg-slate-800 lg:grid-cols-1">
              {(
                [
                  { label: 'Responsável', value: responsavel, onChange: setResponsavel, placeholder: 'Nome do motorista', wide: true },
                  { label: 'Placa',       value: placa,       onChange: setPlaca,       placeholder: 'ABC-1234' },
                  { label: 'KM Atual',    value: km,          onChange: setKm,          placeholder: '0', inputMode: 'numeric' as const },
                  { label: 'Data',        value: data,        onChange: setData,        type: 'date' },
                ] as Array<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string; wide?: boolean; type?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'] }>
              ).map(({ label, value, onChange, placeholder, wide, type, inputMode }) => (
                <div
                  key={label}
                  className={`flex flex-col gap-0.5 bg-white px-4 py-3 dark:bg-slate-950 ${wide ? 'col-span-2 lg:col-span-1' : ''}`}
                >
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    {label}
                  </label>
                  <input
                    type={type ?? 'text'}
                    inputMode={inputMode}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-300 dark:text-slate-100 dark:placeholder:text-slate-600 dark::[color-scheme:dark]"
                  />
                </div>
              ))}
            </div>

            {/* status / ação — visível apenas na sidebar desktop */}
            <div className="hidden border-t border-slate-100 p-4 dark:border-slate-800 lg:block">
              {nokCount > 0 ? (
                <p className="mb-3 text-sm font-extrabold text-rose-500">
                  {nokCount} item{nokCount > 1 ? 's' : ''} com NOK
                </p>
              ) : concluido ? (
                <p className="mb-3 flex items-center gap-1.5 text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={15} />
                  Checklist concluído
                </p>
              ) : (
                <p className="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {totalItens - respondidos} item{totalItens - respondidos !== 1 ? 's' : ''} restante{totalItens - respondidos !== 1 ? 's' : ''}
                </p>
              )}
              <button
                type="button"
                onClick={() => window.print()}
                disabled={!concluido}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-extrabold text-slate-900 shadow-soft transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                Imprimir / PDF
              </button>
            </div>
          </div>
        </div>

        {/* Coluna direita: grupos de itens */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {schema.grupos.map((grupo) => (
            <div
              key={grupo.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  {grupo.titulo}
                </p>
              </div>

              {grupo.itens.map((item, idx) => {
                const resp = respostas[item.id] ?? null
                const obs  = observacoes[item.id] ?? ''
                const isLast = idx === grupo.itens.length - 1

                return (
                  <div
                    key={item.id}
                    className={`px-4 py-4 ${!isLast ? 'border-b border-slate-100 dark:border-slate-800/80' : ''} ${
                      resp === 'nok' ? 'bg-rose-50/40 dark:bg-rose-900/10' : ''
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      {/* número + texto */}
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-extrabold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {idx + 1}
                        </span>
                        <span className="text-[15px] font-semibold leading-snug text-slate-800 dark:text-slate-100">
                          {item.label}
                        </span>
                      </div>

                      {/* botões OK / NOK / N/A */}
                      <div className="flex shrink-0 gap-2 pl-9 sm:pl-0">
                        {OPCOES.map(({ valor, label, activeClass, idleClass }) => (
                          <button
                            key={valor}
                            type="button"
                            onClick={() => setResposta(item.id, valor)}
                            className={`flex h-12 w-16 items-center justify-center rounded-xl border-2 text-sm font-extrabold transition-transform active:scale-95 sm:h-10 sm:w-14 ${
                              resp === valor ? activeClass : idleClass
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {resp === 'nok' && (
                      <textarea
                        rows={2}
                        value={obs}
                        onChange={(e) => setObs(item.id, e.target.value)}
                        placeholder="Descreva o problema encontrado..."
                        className="mt-3 w-full resize-none rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-rose-400 dark:border-rose-800/60 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-600"
                      />
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ── Barra de ação fixa no rodapé — apenas mobile/tablet ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            {nokCount > 0 ? (
              <p className="truncate text-sm font-extrabold text-rose-500">
                {nokCount} item{nokCount > 1 ? 's' : ''} com NOK
              </p>
            ) : concluido ? (
              <p className="flex items-center gap-1.5 text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={16} />
                Checklist concluído
              </p>
            ) : (
              <p className="truncate text-sm font-semibold text-slate-500 dark:text-slate-400">
                {totalItens - respondidos} item{totalItens - respondidos !== 1 ? 's' : ''} restante{totalItens - respondidos !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!concluido}
            className="h-12 shrink-0 rounded-xl bg-slate-900 px-5 text-sm font-extrabold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900"
          >
            Imprimir / PDF
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tela de seleção (grade de cards)
// ---------------------------------------------------------------------------

export function ChecklistsPage() {
  const [query, setQuery] = useState('')
  const [selecionado, setSelecionado] = useState<ChecklistSchema | null>(null)

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return SCHEMAS
    return SCHEMAS.filter(
      (s) => s.nome.toLowerCase().includes(q) || s.descricao.toLowerCase().includes(q),
    )
  }, [query])

  if (selecionado) {
    return <ChecklistForm schema={selecionado} onVoltar={() => setSelecionado(null)} />
  }

  return (
    <div className="space-y-4">

      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <Link
          to="/gerenciar"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm active:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
          aria-label="Voltar para Gerenciar"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-900 text-white shadow-soft dark:bg-slate-100 dark:text-slate-900">
          <ClipboardList size={20} />
        </div>
        <div>
          <div className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Checklists
          </div>
          <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Selecione o tipo de veículo
          </div>
        </div>
      </div>

      {/* Busca + botão resultados */}
      <div className="flex gap-2">
      <div className="flex h-12 flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <Search size={18} className="shrink-0 text-slate-400 dark:text-slate-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar checklist..."
          className="w-full bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </div>
      <Link
        to="/gerenciar/checklists/resultados"
        className="inline-flex h-12 shrink-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
      >
        <BarChart2 size={16} />
        <span className="hidden sm:inline">Resultados</span>
      </Link>
      </div>

      {/* Cards — 1 col no celular, 2 no tablet, 3 no desktop */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtrados.length === 0 ? (
          <div className="col-span-full py-16 text-center text-sm font-semibold text-slate-400">
            Nenhum checklist encontrado para "{query}"
          </div>
        ) : (
          filtrados.map((schema) => {
            const totalItens = schema.grupos.reduce((acc, g) => acc + g.itens.length, 0)
            return (
              <button
                key={schema.id}
                type="button"
                onClick={() => setSelecionado(schema)}
                className="group flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition active:scale-[.98] dark:border-slate-800 dark:bg-slate-950"
              >
                {/* ícone */}
                <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${schema.corBg} ${schema.cor}`}>
                  {schema.icon}
                </div>

                {/* textos */}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-black text-slate-900 dark:text-slate-100">
                    {schema.nome}
                  </div>
                  <div className="mt-0.5 truncate text-sm font-semibold text-slate-500 dark:text-slate-400">
                    {schema.descricao}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {schema.grupos.map((g) => (
                      <span
                        key={g.id}
                        className="rounded-md border border-slate-100 bg-slate-50 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400"
                      >
                        {g.titulo}
                      </span>
                    ))}
                  </div>
                </div>

                {/* contagem */}
                <div className="flex shrink-0 flex-col items-center">
                  <span className={`text-2xl font-black ${schema.cor}`}>{totalItens}</span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    itens
                  </span>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
