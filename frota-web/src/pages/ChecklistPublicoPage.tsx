import { useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { CheckCircle2, ClipboardList } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { SCHEMA_MAP } from '../data/checklistSchemas'

type Resposta = 'ok' | 'nok' | 'na' | null

const OPCOES = [
  {
    valor: 'ok' as const,
    label: 'OK',
    activeClass: 'bg-emerald-500 border-emerald-500 text-white',
    idleClass: 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300',
  },
  {
    valor: 'nok' as const,
    label: 'NOK',
    activeClass: 'bg-rose-500 border-rose-500 text-white',
    idleClass: 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300',
  },
  {
    valor: 'na' as const,
    label: 'N/A',
    activeClass: 'bg-slate-500 border-slate-500 text-white',
    idleClass: 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300',
  },
]

// ---------------------------------------------------------------------------
// Tela de identificação do operador
// ---------------------------------------------------------------------------

function TelaIdentificacao({ onConfirmar }: { onConfirmar: (nome: string, matricula: string) => void }) {
  const [nome, setNome] = useState('')
  const [matricula, setMatricula] = useState('')
  const [erro, setErro] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) { setErro('Informe seu nome.'); return }
    if (!matricula.trim()) { setErro('Informe sua matrícula.'); return }
    onConfirmar(nome.trim(), matricula.trim())
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
            <ClipboardList size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              Identificação
            </h1>
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
              Informe seus dados para iniciar o checklist
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                Nome completo
              </label>
              <input
                autoFocus
                value={nome}
                onChange={(e) => { setNome(e.target.value); setErro('') }}
                placeholder="Ex: João Silva"
                className="mt-0.5 w-full bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-300 dark:text-slate-100"
              />
            </div>
            <div className="px-4 py-3">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                Matrícula
              </label>
              <input
                value={matricula}
                onChange={(e) => { setMatricula(e.target.value); setErro('') }}
                placeholder="Ex: 00123"
                inputMode="text"
                className="mt-0.5 w-full bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-300 dark:text-slate-100"
              />
            </div>
          </div>

          {erro && (
            <p className="text-center text-sm font-extrabold text-rose-500">{erro}</p>
          )}

          <button
            type="submit"
            className="w-full rounded-2xl bg-slate-900 py-4 text-base font-extrabold text-white transition active:scale-[.98] dark:bg-slate-100 dark:text-slate-900"
          >
            Iniciar Checklist
          </button>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tela de conclusão
// ---------------------------------------------------------------------------

function TelaConclusao({ nokCount }: { nokCount: number }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
        <div className={`grid h-20 w-20 place-items-center rounded-full ${nokCount > 0 ? 'bg-rose-100 text-rose-500' : 'bg-emerald-100 text-emerald-500'}`}>
          <CheckCircle2 size={40} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">
            Checklist enviado!
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
            {nokCount > 0
              ? `${nokCount} item${nokCount > 1 ? 's' : ''} com NOK foram registrados. A equipe de manutenção será informada.`
              : 'Todos os itens estão OK. Bom trabalho!'}
          </p>
        </div>
        <p className="text-xs font-semibold text-slate-400">
          Você já pode fechar esta página.
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Formulário público
// ---------------------------------------------------------------------------

function FormularioChecklist({
  tipo,
  operador,
  matricula,
}: {
  tipo: string
  operador: string
  matricula: string
}) {
  const schema = SCHEMA_MAP[tipo]!
  const totalItens = schema.grupos.reduce((acc, g) => acc + g.itens.length, 0)

  const [respostas, setRespostas] = useState<Record<string, Resposta>>({})
  const [observacoes, setObservacoes] = useState<Record<string, string>>({})
  const [placa, setPlaca] = useState('')
  const [km, setKm] = useState('')
  const [data, setData] = useState(() => new Date().toISOString().split('T')[0] ?? '')
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState('')
  const [concluido, setConcluido] = useState(false)
  const [nokFinal, setNokFinal] = useState(0)

  const respondidos = Object.values(respostas).filter((v) => v !== null).length
  const nokCount = Object.values(respostas).filter((v) => v === 'nok').length
  const progresso = totalItens > 0 ? Math.round((respondidos / totalItens) * 100) : 0
  const tudo100 = progresso === 100

  const setResposta = (id: string, valor: Resposta) =>
    setRespostas((prev) => ({ ...prev, [id]: prev[id] === valor ? null : valor }))

  const setObs = (id: string, texto: string) =>
    setObservacoes((prev) => ({ ...prev, [id]: texto }))

  const handleEnviar = async () => {
    if (!tudo100) return
    setEnviando(true)
    setErroEnvio('')

    const respostasLimpas = Object.fromEntries(
      Object.entries(respostas).filter((e): e is [string, 'ok' | 'nok' | 'na'] => e[1] !== null),
    )

    const { error } = await supabase.from('checklists').insert({
      tipo,
      nome_operador: operador,
      matricula,
      placa: placa.trim(),
      km: km.trim(),
      data_inspecao: data,
      respostas: respostasLimpas,
      observacoes,
      progresso: 100,
      nok_count: nokCount,
    })

    if (error) {
      setErroEnvio('Erro ao enviar. Verifique sua conexão e tente novamente.')
      setEnviando(false)
      return
    }

    setNokFinal(nokCount)
    setConcluido(true)
  }

  if (concluido) return <TelaConclusao nokCount={nokFinal} />

  return (
    <div className="min-h-dvh bg-slate-50 pb-28 dark:bg-slate-950">

      {/* Header fixo */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
            <ClipboardList size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-black text-slate-900 dark:text-slate-100">
              {schema.nome}
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    nokCount > 0 ? 'bg-rose-500' : tudo100 ? 'bg-emerald-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${progresso}%` }}
                />
              </div>
              <span className="shrink-0 text-[10px] font-extrabold tabular-nums text-slate-500">
                {respondidos}/{totalItens}
              </span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xs font-extrabold text-slate-700 dark:text-slate-300">{operador}</div>
            <div className="text-[10px] font-semibold text-slate-400">Mat. {matricula}</div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-4 px-4 pt-4">

        {/* Dados do veículo */}
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
              Dados do Veículo
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px bg-slate-100 dark:bg-slate-800 sm:grid-cols-3">
            {(
              [
                { label: 'Placa', value: placa, onChange: setPlaca, placeholder: 'ABC-1234' },
                { label: 'KM Atual', value: km, onChange: setKm, placeholder: '0', inputMode: 'numeric' as const },
                { label: 'Data', value: data, onChange: setData, type: 'date', wide: true },
              ] as Array<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string; wide?: boolean; type?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'] }>
            ).map(({ label, value, onChange, placeholder, wide, type, inputMode }) => (
              <div
                key={label}
                className={`flex flex-col gap-0.5 bg-white px-4 py-3 dark:bg-slate-950 ${wide ? 'col-span-2 sm:col-span-1' : ''}`}
              >
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  {label}
                </label>
                <input
                  type={type ?? 'text'}
                  inputMode={inputMode}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder={placeholder}
                  className="w-full bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-300 dark:text-slate-100 dark::[color-scheme:dark]"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Grupos de itens */}
        {schema.grupos.map((grupo) => (
          <div
            key={grupo.id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                {grupo.titulo}
              </p>
            </div>
            {grupo.itens.map((item, idx) => {
              const resp = respostas[item.id] ?? null
              const obs = observacoes[item.id] ?? ''
              const isLast = idx === grupo.itens.length - 1
              return (
                <div
                  key={item.id}
                  className={`px-4 py-4 ${!isLast ? 'border-b border-slate-100 dark:border-slate-800/80' : ''} ${resp === 'nok' ? 'bg-rose-50/40 dark:bg-rose-900/10' : ''}`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-extrabold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {idx + 1}
                      </span>
                      <span className="text-[15px] font-semibold leading-snug text-slate-800 dark:text-slate-100">
                        {item.label}
                      </span>
                    </div>
                    <div className="flex shrink-0 gap-2 pl-9 sm:pl-0">
                      {OPCOES.map(({ valor, label, activeClass, idleClass }) => (
                        <button
                          key={valor}
                          type="button"
                          onClick={() => setResposta(item.id, valor)}
                          className={`flex h-12 w-16 items-center justify-center rounded-xl border-2 text-sm font-extrabold transition-transform active:scale-95 sm:h-10 sm:w-14 ${resp === valor ? activeClass : idleClass}`}
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
                      className="mt-3 w-full resize-none rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-rose-400 dark:border-rose-800/60 dark:bg-slate-900/60 dark:text-slate-100"
                    />
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Barra de envio fixa */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div className="min-w-0">
            {erroEnvio ? (
              <p className="text-sm font-extrabold text-rose-500">{erroEnvio}</p>
            ) : nokCount > 0 ? (
              <p className="truncate text-sm font-extrabold text-rose-500">
                {nokCount} item{nokCount > 1 ? 's' : ''} com NOK
              </p>
            ) : tudo100 ? (
              <p className="flex items-center gap-1.5 text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={16} />
                Pronto para enviar
              </p>
            ) : (
              <p className="truncate text-sm font-semibold text-slate-500 dark:text-slate-400">
                {totalItens - respondidos} item{totalItens - respondidos !== 1 ? 's' : ''} restante{totalItens - respondidos !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleEnviar}
            disabled={!tudo100 || enviando}
            className="h-12 shrink-0 rounded-xl bg-slate-900 px-6 text-sm font-extrabold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900"
          >
            {enviando ? 'Enviando…' : 'Enviar Checklist'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Página raiz da rota pública
// ---------------------------------------------------------------------------

export function ChecklistPublicoPage() {
  const { tipo } = useParams<{ tipo: string }>()
  const [operador, setOperador] = useState<string | null>(null)
  const [matricula, setMatricula] = useState<string | null>(null)

  if (!tipo || !SCHEMA_MAP[tipo]) {
    return <Navigate to="/" replace />
  }

  if (!operador || !matricula) {
    return (
      <TelaIdentificacao
        onConfirmar={(n, m) => { setOperador(n); setMatricula(m) }}
      />
    )
  }

  return <FormularioChecklist tipo={tipo} operador={operador} matricula={matricula} />
}
