import { useCallback, useRef, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ClipboardList,
  Paperclip,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { SCHEMA_MAP } from '../data/checklistSchemas'
import type { ChecklistSchemaDef } from '../data/checklistSchemas'

type Resposta = 'c' | 'nc' | 'na' | null

const OPCOES = [
  {
    valor: 'c' as const,
    label: 'C',
    titulo: 'Conforme',
    activeClass: 'bg-emerald-500 border-emerald-500 text-white',
    idleClass: 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400',
  },
  {
    valor: 'nc' as const,
    label: 'NC',
    titulo: 'Não Conforme',
    activeClass: 'bg-rose-500 border-rose-500 text-white',
    idleClass: 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400',
  },
  {
    valor: 'na' as const,
    label: 'NA',
    titulo: 'Não Aplicável',
    activeClass: 'bg-slate-400 border-slate-400 text-white',
    idleClass: 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400',
  },
]

// ---------------------------------------------------------------------------
// Tela de identificação
// ---------------------------------------------------------------------------
function TelaIdentificacao({ schema, onConfirmar }: {
  schema: ChecklistSchemaDef
  onConfirmar: (nome: string, matricula: string) => void
}) {
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
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4 py-8 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
            <ClipboardList size={28} />
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">{schema.nome}</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">Identificação</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
              Informe seus dados para iniciar o checklist
            </p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
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
                inputMode="numeric"
                className="mt-0.5 w-full bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-300 dark:text-slate-100"
              />
            </div>
          </div>
          {erro && <p className="text-center text-sm font-extrabold text-rose-500">{erro}</p>}
          <button
            type="submit"
            className="w-full rounded-2xl bg-slate-900 py-4 text-base font-extrabold text-white transition active:scale-[.98] dark:bg-slate-100 dark:text-slate-900"
          >
            Iniciar Checklist →
          </button>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tela de conclusão
// ---------------------------------------------------------------------------
function TelaConclusao({ ncImperativos, ncCount }: { ncImperativos: number; ncCount: number }) {
  const bloqueado = ncImperativos > 0
  const comNc = ncCount > 0
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
        <div className={`grid h-20 w-20 place-items-center rounded-full ${
          bloqueado ? 'bg-rose-100 text-rose-500' :
          comNc ? 'bg-amber-100 text-amber-500' :
          'bg-emerald-100 text-emerald-500'
        }`}>
          {bloqueado ? <AlertTriangle size={40} /> : <CheckCircle2 size={40} />}
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {bloqueado ? 'Veículo impedido!' : 'Checklist enviado!'}
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
            {bloqueado
              ? `${ncImperativos} item(s) impeditivo(s) marcado(s) como NC. O veículo está impedido de ser conduzido.`
              : comNc
                ? `${ncCount} item(s) com NC registrado(s). Supervisão informada.`
                : 'Todos os itens estão Conformes. Bom trabalho!'}
          </p>
        </div>
        {bloqueado && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-900/50 dark:bg-rose-900/20">
            <p className="text-xs font-extrabold text-rose-600 dark:text-rose-400">
              ⚠ O VEÍCULO ESTARÁ IMPEDIDO DE SER CONDUZIDO, POIS ITEM(S) MARCADO(S) COM 🚫 "IMPEDITIVO" ESTÃO NÃO CONFORMES.
            </p>
          </div>
        )}
        <p className="text-xs font-semibold text-slate-400">Você já pode fechar esta página.</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Miniaturas de fotos por item
// ---------------------------------------------------------------------------
function FotosItem({
  fotos,
  onAdd,
  onRemove,
}: {
  fotos: File[]
  onAdd: (files: File[]) => void
  onRemove: (idx: number) => void
}) {
  const ref = useRef<HTMLInputElement>(null)

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {fotos.map((file, idx) => {
        const url = URL.createObjectURL(file)
        return (
          <div key={idx} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
            <img
              src={url}
              alt={file.name}
              className="h-full w-full object-cover"
              onLoad={() => URL.revokeObjectURL(url)}
            />
            <button
              type="button"
              onClick={() => onRemove(idx)}
              className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white shadow"
            >
              <X size={10} />
            </button>
          </div>
        )
      })}
      {fotos.length < 3 && (
        <>
          <input
            ref={ref}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => {
              const novos = Array.from(e.target.files ?? []).slice(0, 3 - fotos.length)
              if (novos.length) onAdd(novos)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => ref.current?.click()}
            className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-rose-300 bg-rose-50 text-rose-500 transition hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-400"
          >
            <Camera size={18} />
            <span className="text-[9px] font-extrabold uppercase leading-none">Foto</span>
          </button>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Formulário principal
// ---------------------------------------------------------------------------
function FormularioChecklist({
  schema,
  operador,
  matricula,
}: {
  schema: ChecklistSchemaDef
  operador: string
  matricula: string
}) {
  const todosItens = schema.grupos.flatMap((g) => g.itens)
  const totalItens = todosItens.length

  const [respostas, setRespostas] = useState<Record<string, Resposta>>({})
  const [observacoes, setObservacoes] = useState<Record<string, string>>({})
  // fotos por item NC: { itemId: File[] }
  const [fotosItem, setFotosItem] = useState<Record<string, File[]>>({})
  const [dadosVeiculo, setDadosVeiculo] = useState<Record<string, string>>({})
  const [dataInspecao, setDataInspecao] = useState(() => new Date().toISOString().split('T')[0] ?? '')
  const [problemas, setProblemas] = useState('')
  const [descricaoProblema, setDescricaoProblema] = useState('')
  const [supervisor, setSupervisor] = useState('')
  // arquivos gerais de evidência NR12
  const [arquivos, setArquivos] = useState<File[]>([])
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState('')
  const [concluido, setConcluido] = useState(false)
  const [ncFinal, setNcFinal] = useState(0)
  const [ncImpFinal, setNcImpFinal] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  // refs para scroll automático
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const respondidos = Object.values(respostas).filter((v) => v !== null).length
  const ncCount = Object.values(respostas).filter((v) => v === 'nc').length
  const ncImperativos = todosItens.filter((item) => item.imperativo && respostas[item.id] === 'nc').length
  const progresso = totalItens > 0 ? Math.round((respondidos / totalItens) * 100) : 0
  const tudo100 = progresso === 100

  // Validação de campos obrigatórios de dados do veículo
  const camposObrigatorios = schema.camposExtras?.filter((c) => c.obrigatorio) ?? []
  const camposPreenchidos = camposObrigatorios.every((c) => (dadosVeiculo[c.id] ?? '').trim() !== '')
  const podEnviar = tudo100 && camposPreenchidos

  const setResposta = useCallback((id: string, valor: Resposta) => {
    setRespostas((prev) => {
      const nova = prev[id] === valor ? null : valor
      // Limpar fotos do item se deixar de ser NC
      if (nova !== 'nc') {
        setFotosItem((fp) => {
          const cp = { ...fp }
          delete cp[id]
          return cp
        })
      }
      return { ...prev, [id]: nova }
    })

    // Scroll para o próximo item não respondido após pequeno delay
    setTimeout(() => {
      const novaRespostas = { ...respostas, [id]: respostas[id] === valor ? null : valor }
      const proximoId = todosItens.find((it) => novaRespostas[it.id] == null)?.id
      if (proximoId && itemRefs.current[proximoId]) {
        itemRefs.current[proximoId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 120)
  }, [respostas, todosItens])

  const setObs = (id: string, texto: string) =>
    setObservacoes((prev) => ({ ...prev, [id]: texto }))

  const setDado = (id: string, valor: string) =>
    setDadosVeiculo((prev) => ({ ...prev, [id]: valor }))

  const addFotoItem = (id: string, novos: File[]) =>
    setFotosItem((prev) => ({ ...prev, [id]: [...(prev[id] ?? []), ...novos].slice(0, 3) }))

  const removeFotoItem = (id: string, idx: number) =>
    setFotosItem((prev) => ({ ...prev, [id]: (prev[id] ?? []).filter((_, i) => i !== idx) }))

  const handleArquivos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novos = Array.from(e.target.files ?? []).slice(0, 10 - arquivos.length)
    setArquivos((prev) => [...prev, ...novos].slice(0, 10))
    e.target.value = ''
  }

  const removerArquivo = (idx: number) =>
    setArquivos((prev) => prev.filter((_, i) => i !== idx))

  // Upload helper
  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    const { error } = await supabase.storage
      .from('checklist-evidencias')
      .upload(path, file, { upsert: false })
    if (error) return null
    const { data } = supabase.storage.from('checklist-evidencias').getPublicUrl(path)
    return data.publicUrl
  }

  const handleEnviar = async () => {
    if (!podEnviar) return
    setEnviando(true)
    setErroEnvio('')

    const ts = Date.now()
    const evidenciaUrls: string[] = []

    // Upload de arquivos gerais de evidência
    for (const file of arquivos) {
      const path = `${schema.id}/${ts}-${file.name.replace(/\s+/g, '_')}`
      const url = await uploadFile(file, path)
      if (url) evidenciaUrls.push(url)
    }

    // Upload de fotos por item NC
    const fotasUrls: Record<string, string[]> = {}
    for (const [itemId, fotos] of Object.entries(fotosItem)) {
      fotasUrls[itemId] = []
      for (const [i, file] of fotos.entries()) {
        const path = `${schema.id}/item-${itemId}-${ts}-${i}.${file.name.split('.').pop() ?? 'jpg'}`
        const url = await uploadFile(file, path)
        if (url) fotasUrls[itemId].push(url)
      }
      // Adicionar ao array global de evidências também
      evidenciaUrls.push(...(fotasUrls[itemId] ?? []))
    }

    const respostasLimpas = Object.fromEntries(
      Object.entries(respostas).filter((e): e is [string, 'c' | 'nc' | 'na'] => e[1] !== null),
    )

    // Enriquecer observações com referência às fotos do item
    const observacoesFinais = { ...observacoes }
    for (const [itemId, urls] of Object.entries(fotasUrls)) {
      if (urls.length > 0) {
        const textoAtual = observacoesFinais[itemId] ?? ''
        observacoesFinais[itemId] = textoAtual
          ? `${textoAtual} [${urls.length} foto(s) anexada(s)]`
          : `[${urls.length} foto(s) anexada(s)]`
      }
    }

    const { error } = await supabase.from('checklists').insert({
      tipo: schema.id,
      nome_operador: operador,
      matricula,
      dados_veiculo: { ...dadosVeiculo, data_inspecao: dataInspecao },
      data_inspecao: dataInspecao,
      respostas: respostasLimpas,
      observacoes: observacoesFinais,
      progresso: 100,
      nc_count: ncCount,
      nc_imperativos: ncImperativos,
      problemas,
      descricao_problema: descricaoProblema,
      nome_supervisor: supervisor,
      evidencia_urls: evidenciaUrls,
    })

    if (error) {
      setErroEnvio('Erro ao enviar. Verifique sua conexão e tente novamente.')
      setEnviando(false)
      return
    }

    setNcFinal(ncCount)
    setNcImpFinal(ncImperativos)
    setConcluido(true)
  }

  if (concluido) return <TelaConclusao ncImperativos={ncImpFinal} ncCount={ncFinal} />

  return (
    <div className="min-h-dvh bg-slate-50 pb-28 dark:bg-slate-950">

      {/* Header fixo com progresso */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
            <ClipboardList size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-black text-slate-900 dark:text-slate-100">{schema.nome}</div>
            <div className="mt-0.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    ncImperativos > 0 ? 'bg-rose-500' :
                    tudo100 ? 'bg-emerald-500' :
                    'bg-blue-500'
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

        {/* Legenda */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-900/40 dark:bg-amber-900/10">
          <p className="text-xs font-extrabold text-amber-700 dark:text-amber-400">
            🚫 Itens com este símbolo são <strong>IMPEDITIVOS</strong> — se marcados como NC, o veículo não poderá ser conduzido.
          </p>
        </div>

        {/* Supervisor — antes dos itens para contexto */}
        {schema.temSupervisor && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <div className="px-4 py-3">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                Nome do Supervisor
                <span className="ml-1 font-semibold normal-case text-slate-400">(Nome completo)</span>
              </label>
              <input
                value={supervisor}
                onChange={(e) => setSupervisor(e.target.value)}
                placeholder="Nome completo do supervisor"
                className="mt-1 w-full bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-300 dark:text-slate-100"
              />
            </div>
          </div>
        )}

        {/* Dados do veículo */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Dados do Veículo
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px bg-slate-100 dark:bg-slate-800">
            {/* Data de inspeção */}
            <div className="flex flex-col gap-0.5 bg-white px-4 py-3 dark:bg-slate-950">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Data *</label>
              <input
                type="date"
                value={dataInspecao}
                onChange={(e) => setDataInspecao(e.target.value)}
                className="w-full bg-transparent text-base font-semibold text-slate-900 outline-none dark:text-slate-100 dark::[color-scheme:dark]"
              />
            </div>

            {(schema.camposExtras ?? []).map((campo) => (
              <div
                key={campo.id}
                className={`flex flex-col gap-0.5 bg-white px-4 py-3 dark:bg-slate-950 ${
                  campo.id === 'localidade' ? 'col-span-2' : ''
                }`}
              >
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  {campo.label}{campo.obrigatorio ? ' *' : ''}
                </label>
                {campo.tipo === 'select' && campo.opcoes && campo.opcoes.length > 0 ? (
                  <select
                    value={dadosVeiculo[campo.id] ?? ''}
                    onChange={(e) => setDado(campo.id, e.target.value)}
                    className="w-full bg-transparent text-base font-semibold text-slate-900 outline-none dark:text-slate-100"
                  >
                    <option value="">Escolher</option>
                    {campo.opcoes.map((op) => <option key={op} value={op}>{op}</option>)}
                  </select>
                ) : (
                  <input
                    type={campo.tipo === 'number' ? 'number' : 'text'}
                    inputMode={campo.tipo === 'number' ? 'numeric' : 'text'}
                    value={dadosVeiculo[campo.id] ?? ''}
                    onChange={(e) => setDado(campo.id, e.target.value)}
                    placeholder="Sua resposta"
                    className="w-full bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-300 dark:text-slate-100"
                  />
                )}
              </div>
            ))}
          </div>
          {/* Aviso de campos obrigatórios faltando */}
          {!camposPreenchidos && tudo100 && (
            <div className="border-t border-amber-100 bg-amber-50 px-4 py-2.5 dark:border-amber-900/30 dark:bg-amber-900/10">
              <p className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                Preencha todos os campos obrigatórios (*) para enviar.
              </p>
            </div>
          )}
        </div>

        {/* Grupos de itens */}
        {schema.grupos.map((grupo) => {
          const respondidosGrupo = grupo.itens.filter((it) => respostas[it.id] != null).length
          const totalGrupo = grupo.itens.length
          const grupoCompleto = respondidosGrupo === totalGrupo

          return (
            <div key={grupo.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
              {/* Cabeçalho do grupo com contador */}
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  {grupo.titulo}
                </p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                  grupoCompleto
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {respondidosGrupo}/{totalGrupo}
                </span>
              </div>

              {/* Cabeçalho das colunas */}
              <div className="grid grid-cols-[1fr_auto] border-b border-slate-100 bg-slate-50/50 px-4 py-2 dark:border-slate-800 dark:bg-slate-900/30">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Item</span>
                <div className="flex gap-2">
                  {OPCOES.map((o) => (
                    <span key={o.valor} className="w-14 text-center text-[10px] font-extrabold uppercase tracking-widest text-slate-400 sm:w-16">
                      {o.label}
                    </span>
                  ))}
                </div>
              </div>

              {grupo.itens.map((item, idx) => {
                const resp = respostas[item.id] ?? null
                const obs = observacoes[item.id] ?? ''
                const fotos = fotosItem[item.id] ?? []
                const isLast = idx === grupo.itens.length - 1

                // Cor de fundo por resposta
                const bgClass =
                  resp === 'nc' ? 'bg-rose-50/60 dark:bg-rose-900/10' :
                  resp === 'c'  ? 'bg-emerald-50/40 dark:bg-emerald-900/5' :
                  resp === 'na' ? 'bg-slate-50/80 dark:bg-slate-900/20' :
                  ''

                return (
                  <div
                    key={item.id}
                    ref={(el) => { itemRefs.current[item.id] = el }}
                    className={`px-4 py-3 transition-colors ${!isLast ? 'border-b border-slate-100 dark:border-slate-800/80' : ''} ${bgClass}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2 pt-1">
                        {item.imperativo && (
                          <span className="mt-0.5 shrink-0 text-sm" title="Item impeditivo">🚫</span>
                        )}
                        <span className="text-sm font-semibold leading-snug text-slate-800 dark:text-slate-100">
                          {item.label}
                        </span>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {OPCOES.map(({ valor, label, activeClass, idleClass }) => (
                          <button
                            key={valor}
                            type="button"
                            title={OPCOES.find((o) => o.valor === valor)?.titulo}
                            onClick={() => setResposta(item.id, valor)}
                            className={`flex h-11 w-14 items-center justify-center rounded-xl border-2 text-xs font-extrabold transition-transform active:scale-95 sm:h-10 sm:w-16 ${resp === valor ? activeClass : idleClass}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Área expandida quando NC */}
                    {resp === 'nc' && (
                      <div className="mt-3 space-y-2">
                        <textarea
                          rows={2}
                          value={obs}
                          onChange={(e) => setObs(item.id, e.target.value)}
                          placeholder="Descreva o problema encontrado..."
                          className="w-full resize-none rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-rose-400 dark:border-rose-800/60 dark:bg-slate-900/60 dark:text-slate-100"
                        />
                        <FotosItem
                          fotos={fotos}
                          onAdd={(novos) => addFotoItem(item.id, novos)}
                          onRemove={(i) => removeFotoItem(item.id, i)}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}

        {/* Problemas verificados */}
        {schema.temProblemas && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Problemas Verificados
              </p>
              <p className="mt-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                Aponte qualquer problema(s) apresentado(s) (freios, motor, câmbio, pneus, etc.)
              </p>
            </div>
            <div className="space-y-px bg-slate-100 dark:bg-slate-800">
              <div className="bg-white px-4 py-3 dark:bg-slate-950">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Problemas</label>
                <textarea
                  rows={3}
                  value={problemas}
                  onChange={(e) => setProblemas(e.target.value)}
                  placeholder="Descreva os problemas encontrados..."
                  className="mt-1 w-full resize-none bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-300 dark:text-slate-100"
                />
              </div>
              <div className="bg-white px-4 py-3 dark:bg-slate-950">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Descrição do Problema</label>
                <textarea
                  rows={2}
                  value={descricaoProblema}
                  onChange={(e) => setDescricaoProblema(e.target.value)}
                  placeholder="Sua resposta"
                  className="mt-1 w-full resize-none bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-300 dark:text-slate-100"
                />
              </div>
            </div>
          </div>
        )}

        {/* Evidência NR12 (arquivos gerais) */}
        {schema.temEvidencia && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Evidência NR12 *
              </p>
              <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                Upload geral de evidências — até 10 arquivos (imagem ou PDF).
              </p>
            </div>
            <div className="px-4 py-3">
              {arquivos.length > 0 && (
                <div className="mb-3 space-y-2">
                  {arquivos.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/40">
                      <span className="min-w-0 truncate text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removerArquivo(idx)}
                        className="shrink-0 text-slate-400 hover:text-rose-500"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {arquivos.length < 10 && (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={handleArquivos}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-extrabold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300"
                  >
                    <Paperclip size={16} />
                    Adicionar arquivo
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Aviso de veículo bloqueado */}
        {ncImperativos > 0 && (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 dark:border-rose-800 dark:bg-rose-900/20">
            <p className="text-sm font-extrabold text-rose-600 dark:text-rose-400">
              ⚠ ATENÇÃO! O VEÍCULO ESTARÁ IMPEDIDO DE SER CONDUZIDO — {ncImperativos} item(s) IMPEDITIVO(S) marcado(s) como NC.
            </p>
          </div>
        )}

      </div>

      {/* Barra de envio fixa */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div className="min-w-0">
            {erroEnvio ? (
              <p className="text-sm font-extrabold text-rose-500">{erroEnvio}</p>
            ) : ncImperativos > 0 ? (
              <p className="text-sm font-extrabold text-rose-500">🚫 {ncImperativos} item(s) impeditivo(s) NC</p>
            ) : ncCount > 0 ? (
              <p className="truncate text-sm font-extrabold text-amber-600 dark:text-amber-400">
                {ncCount} item(s) NC
              </p>
            ) : tudo100 && camposPreenchidos ? (
              <p className="flex items-center gap-1.5 text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={16} /> Pronto para enviar
              </p>
            ) : tudo100 ? (
              <p className="truncate text-sm font-semibold text-amber-600 dark:text-amber-400">
                Preencha os dados obrigatórios
              </p>
            ) : (
              <p className="truncate text-sm font-semibold text-slate-500 dark:text-slate-400">
                {totalItens - respondidos} item(s) restante(s)
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleEnviar}
            disabled={!podEnviar || enviando}
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
// Página raiz
// ---------------------------------------------------------------------------
export function ChecklistPublicoPage() {
  const { tipo } = useParams<{ tipo: string }>()
  const [operador, setOperador] = useState<string | null>(null)
  const [matricula, setMatricula] = useState<string | null>(null)

  if (!tipo || !SCHEMA_MAP[tipo]) return <Navigate to="/" replace />

  const schema = SCHEMA_MAP[tipo]!

  if (!operador || !matricula) {
    return (
      <TelaIdentificacao
        schema={schema}
        onConfirmar={(n, m) => { setOperador(n); setMatricula(m) }}
      />
    )
  }

  return <FormularioChecklist schema={schema} operador={operador} matricula={matricula} />
}
