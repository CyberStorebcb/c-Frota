import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  ImagePlus,
  Loader2,
  MapPin,
  Paperclip,
  X,
} from 'lucide-react'
import { uploadChecklistEvidenceFile } from '../lib/checklistEvidenceUpload'
import { supabase } from '../lib/supabase'
import { useTheme } from '../theme/ThemeProvider'
import { enqueueChecklist, type OfflineChecklistFile } from '../checklists/offlineQueue'
import { SyncStatus } from '../checklists/SyncStatus'
import { BrandLogo } from '../branding/BrandLogo'
import { CollapsedNavMark } from '../branding/CollapsedNavMark'
import { CHECKLIST_SCHEMAS, SCHEMA_MAP } from '../data/checklistSchemas'
import type { ChecklistSchemaDef } from '../data/checklistSchemas'
import { getDisplayedFleetVehicles } from '../frota/vehicleRegistry'
import { compressChecklistImageIfNeeded } from '../utils/compressChecklistImage'
import { buildWhatsappLink, getSupervisorWhatsapp, isSupervisorReconhecido, SUPERVISOR_WHATSAPP } from '../data/supervisorContatos'

type Resposta = 'c' | 'nc' | 'na' | null

const CHECKLIST_PAGE_BG =
  'bg-[radial-gradient(circle_at_top_left,rgba(181,22,73,0.14),transparent_34%),linear-gradient(180deg,#fff7f9_0%,#f8fafc_34%,#eef2f7_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(181,22,73,0.24),transparent_35%),linear-gradient(180deg,#090d18_0%,#020617_58%,#01040b_100%)]'

const CGB_CARD =
  'border border-white/70 bg-white/[0.92] shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/[0.88] dark:shadow-black/30'

const CGB_SECTION_HEADER =
  'border-b border-[#7f1022]/10 bg-gradient-to-r from-[#7f1022] via-[#9f1239] to-[#101827] px-4 py-3 text-white dark:border-white/10'

const CGB_FIELD_LABEL = 'text-[10px] font-extrabold uppercase tracking-widest text-[#7f1022] dark:text-rose-300'
const CGB_PRIMARY_BUTTON =
  'bg-gradient-to-r from-[#7f1022] via-[#9f1239] to-[#b51649] text-white shadow-lg shadow-rose-950/15'

function CgbHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-[#0b1020] p-5 text-white shadow-[0_24px_70px_rgba(15,23,42,0.24)] ring-1 ring-white/10">
      <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-[#b51649]/45 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-8 h-40 w-40 rounded-full bg-[#7f1022]/35 blur-3xl" />
      <div className="relative flex flex-col items-center gap-3 text-center">
        <CollapsedNavMark size="lg" className="ring-2 ring-white/15" />
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-rose-200">{eyebrow}</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">{title}</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-relaxed text-slate-300">{description}</p>
        </div>
      </div>
    </div>
  )
}

function TelaEscolhaChecklist({
  onSelecionar,
}: {
  onSelecionar: (tipo: string) => void
}) {
  return (
    <div className={`flex min-h-dvh flex-col items-center justify-center px-4 py-8 ${CHECKLIST_PAGE_BG}`}>
      <div className="w-full max-w-md">
        <CgbHero
          eyebrow="CGB — inspeção frota"
          title="Escolha o checklist"
          description="Preencha com atenção para garantir a qualidade da inspeção. O envio funcionará online e offline."
        />

        <div className="mt-5 space-y-3">
          {CHECKLIST_SCHEMAS.map((schema) => {
            const totalItens = schema.grupos.reduce((acc, g) => acc + g.itens.length, 0)
            return (
              <button
                key={schema.id}
                type="button"
                onClick={() => onSelecionar(schema.id)}
                className={`group flex w-full items-center gap-3 rounded-2xl p-4 text-left transition hover:-translate-y-0.5 hover:border-[#b51649]/35 hover:shadow-[0_16px_35px_rgba(127,16,34,0.12)] active:scale-[.99] ${CGB_CARD}`}
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#7f1022]/10 text-[#7f1022] ring-1 ring-[#7f1022]/10 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/10">
                  <ClipboardList size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-black text-slate-900 dark:text-slate-100">{schema.nome}</div>
                  <div className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {schema.descricao} · {totalItens} itens
                  </div>
                </div>
                <ChevronRight size={18} className="shrink-0 text-[#b51649]/45 transition group-hover:translate-x-0.5 group-hover:text-[#b51649]" />
              </button>
            )
          })}
        </div>

        <p className="mt-6 text-center text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        Atenção ao preenchimento, pois os formulários serão avaliados e validados.
        </p>

        <div className="mt-4">
          <SyncStatus />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tela de identificação
// ---------------------------------------------------------------------------
function TelaIdentificacao({
  schema,
  onConfirmar,
}: {
  schema: ChecklistSchemaDef
  onConfirmar: (nome: string, matricula: string) => void
}) {
  const [nome, setNome] = useState('')
  const [matricula, setMatricula] = useState('')
  const [erros, setErros] = useState<{ nome?: string; matricula?: string }>({})

  const validar = () => {
    const e: typeof erros = {}
    if (!nome.trim()) e.nome = 'Informe seu nome completo.'
    const m = matricula.trim()
    if (!m) e.matricula = 'Informe sua matrícula.'
    else if (!/^\d{1,5}$/.test(m)) e.matricula = 'Matrícula: use apenas números (até 5 dígitos).'
    return e
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errosNovos = validar()
    if (Object.keys(errosNovos).length > 0) { setErros(errosNovos); return }
    onConfirmar(nome.trim(), matricula.trim())
  }

  const totalItens = schema.grupos.reduce((acc, g) => acc + g.itens.length, 0)

  return (
    <div className={`flex min-h-dvh flex-col items-center justify-center px-4 py-8 ${CHECKLIST_PAGE_BG}`}>
      <div className="w-full max-w-sm">

        {/* Cabeçalho */}
        <div className="mb-5">
          <CgbHero
            eyebrow={schema.nome}
            title="Identificação"
            description="Informe os dados do motorista antes de iniciar a inspeção CGB."
          />
        </div>

        {/* Resumo do checklist */}
        <div className={`mb-4 overflow-hidden rounded-2xl ${CGB_CARD}`}>
          <div className="grid divide-x divide-slate-100 dark:divide-slate-800" style={{ gridTemplateColumns: `repeat(${schema.grupos.length + 1}, 1fr)` }}>
            {schema.grupos.map((g, i) => (
              <div key={g.id} className="flex flex-col items-center px-2 py-3 text-center">
                <span className="text-xl font-black text-slate-900 dark:text-slate-100">{g.itens.length}</span>
                <span className="mt-0.5 text-[10px] font-extrabold uppercase leading-tight text-slate-400 dark:text-slate-500">
                  Grupo {i + 1}
                </span>
              </div>
            ))}
            <div className="flex flex-col items-center bg-[#7f1022]/[0.08] px-2 py-3 text-center dark:bg-rose-500/10">
              <span className="text-xl font-black text-[#7f1022] dark:text-rose-300">{totalItens}</span>
              <span className="mt-0.5 text-[10px] font-extrabold uppercase leading-tight text-[#7f1022]/60 dark:text-rose-200/70">
                Total
              </span>
            </div>
          </div>
          {/* nomes completos dos grupos */}
          <div className="border-t border-slate-100 px-4 py-2 dark:border-slate-800">
            {schema.grupos.map((g, i) => (
              <p key={g.id} className="text-[10px] font-semibold leading-relaxed text-slate-500 dark:text-slate-400">
                <span className="font-extrabold text-slate-700 dark:text-slate-300">Grupo {i + 1}:</span> {g.titulo}
              </p>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          <div className={`overflow-hidden rounded-2xl ${CGB_CARD}`}>
            {/* Nome */}
            <div className={`border-b px-4 py-3 ${erros.nome ? 'border-rose-200 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-900/10' : 'border-slate-100 dark:border-slate-800'}`}>
              <label className={erros.nome ? 'text-[10px] font-extrabold uppercase tracking-widest text-rose-500' : CGB_FIELD_LABEL}>
                Nome completo *
              </label>
              <input
                autoFocus
                autoComplete="name"
                value={nome}
                onChange={(e) => { setNome(e.target.value); setErros((prev) => ({ ...prev, nome: undefined })) }}
                placeholder="Ex: João Silva"
                className="mt-0.5 w-full bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-300 dark:text-slate-100"
              />
              {erros.nome && <p className="mt-1 text-xs font-semibold text-rose-500">{erros.nome}</p>}
            </div>
            {/* Matrícula */}
            <div className={`px-4 py-3 ${erros.matricula ? 'bg-rose-50/50 dark:bg-rose-900/10' : ''}`}>
              <label className={erros.matricula ? 'text-[10px] font-extrabold uppercase tracking-widest text-rose-500' : CGB_FIELD_LABEL}>
                Matrícula *
              </label>
              <input
                value={matricula}
                onChange={(e) => {
                  const onlyDigits = e.target.value.replace(/\D/g, '').slice(0, 5)
                  setMatricula(onlyDigits)
                  setErros((prev) => ({ ...prev, matricula: undefined }))
                }}
                placeholder="Ex: 00123"
                inputMode="numeric"
                autoComplete="off"
                maxLength={5}
                className="mt-0.5 w-full bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-300 dark:text-slate-100"
              />
              {erros.matricula && <p className="mt-1 text-xs font-semibold text-rose-500">{erros.matricula}</p>}
            </div>
          </div>

          <button
            type="submit"
            className={`w-full rounded-2xl py-4 text-base font-extrabold transition active:scale-[.98] ${CGB_PRIMARY_BUTTON}`}
          >
            Iniciar Checklist →
          </button>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tela de conclusão com resumo dos NCs
// ---------------------------------------------------------------------------
function TelaConclusao({
  ncImperativos,
  ncCount,
  itensNc,
  offline,
  nomeSupervisor,
  veiculo,
  operador,
}: {
  ncImperativos: number
  ncCount: number
  itensNc: { label: string; imperativo: boolean; obs: string }[]
  offline?: boolean
  nomeSupervisor: string
  veiculo: string
  operador: string
}) {
  const { theme } = useTheme()
  const footerTone = theme === 'dark' ? 'on-dark' : 'on-light'
  const bloqueado = ncImperativos > 0
  const comNc = ncCount > 0

  const whatsappLink = comNc && nomeSupervisor
    ? buildWhatsappLink({
        numero: getSupervisorWhatsapp(nomeSupervisor) ?? '',
        nomeSupervisor,
        operador,
        veiculo,
        ncCount,
        ncImperativos,
        itensNc,
      })
    : null

  return (
    <div className="flex min-h-dvh flex-col items-center justify-start bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
        <BrandLogo tone={footerTone} variant="horizontal" className="!max-h-9 opacity-90" />

        {/* Ícone de status */}
        <div className={`grid h-20 w-20 place-items-center rounded-full ${
          bloqueado ? 'bg-rose-100 text-rose-500' :
          comNc     ? 'bg-amber-100 text-amber-500' :
                      'bg-emerald-100 text-emerald-500'
        }`}>
          {bloqueado ? <AlertTriangle size={40} /> : <CheckCircle2 size={40} />}
        </div>

        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {offline ? 'Checklist salvo no dispositivo' : bloqueado ? 'Veículo impedido!' : comNc ? 'Checklist enviado' : 'Tudo Conforme!'}
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
            {offline
              ? 'Assim que a internet voltar, o aplicativo tentará sincronizar automaticamente.'
              : bloqueado
              ? `${ncImperativos} item(s) impeditivo(s) NC. O veículo está impedido de ser conduzido até a correção.`
              : comNc
                ? `${ncCount} item(s) com NC registrado(s). Avise o supervisor.`
                : 'Todos os itens estão Conformes. Bom trabalho!'}
          </p>
        </div>

        {/* Banner de bloqueio */}
        {bloqueado && (
          <div className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-left dark:border-rose-900/50 dark:bg-rose-900/20">
            <p className="text-xs font-extrabold text-rose-600 dark:text-rose-400">
              ⚠ VEÍCULO IMPEDIDO — NÃO CONDUZA ATÉ QUE OS ITENS IMPEDITIVOS SEJAM CORRIGIDOS E VERIFICADOS PELO SUPERVISOR.
            </p>
          </div>
        )}

        {/* Alerta WhatsApp para supervisor */}
        {comNc && whatsappLink && (
          <div className={`w-full rounded-2xl border px-4 py-4 text-left ${
            bloqueado
              ? 'border-rose-300 bg-rose-50 dark:border-rose-800/60 dark:bg-rose-900/20'
              : 'border-amber-300 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-900/20'
          }`}>
            <p className={`mb-3 text-xs font-extrabold uppercase tracking-wide ${
              bloqueado ? 'text-rose-700 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300'
            }`}>
              {bloqueado ? '🚫 Aviso urgente ao supervisor' : '⚠ Avise o supervisor'}
            </p>
            <p className="mb-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
              {bloqueado
                ? 'Itens impeditivos foram encontrados. Notifique o supervisor imediatamente antes de qualquer movimentação do veículo.'
                : 'Foram encontrados itens não conformes. Clique abaixo para notificar o supervisor via WhatsApp.'}
            </p>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold text-white shadow-md transition active:scale-95 ${
                bloqueado
                  ? 'bg-rose-600 shadow-rose-200 hover:bg-rose-700 dark:shadow-rose-900/40'
                  : 'bg-[#25D366] shadow-green-200 hover:bg-[#1ebe5d] dark:shadow-green-900/40'
              }`}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Alertar {nomeSupervisor} no WhatsApp
            </a>
          </div>
        )}

        {/* Resumo dos itens NC */}
        {itensNc.length > 0 && (
          <div className="w-full space-y-2 text-left">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Itens com NC ({itensNc.length})
            </p>
            {itensNc.map((it, i) => (
              <div
                key={i}
                className={`rounded-xl border px-3 py-2.5 ${
                  it.imperativo
                    ? 'border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-900/20'
                    : 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20'
                }`}
              >
                <p className={`text-xs font-extrabold ${it.imperativo ? 'text-rose-600 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400'}`}>
                  {it.imperativo ? '🚫 ' : '⚠ '}{it.label}
                </p>
                {it.obs && (
                  <p className="mt-0.5 text-xs font-semibold text-slate-600 dark:text-slate-400">{it.obs}</p>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="text-xs font-semibold text-slate-400">Você já pode fechar esta página.</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Fotos por item NC
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
  const slots = 3
  const restantes = slots - fotos.length

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <ImagePlus size={13} className="text-rose-400" />
        <span className="text-[11px] font-extrabold uppercase tracking-wide text-rose-500">
          Foto do problema
          {fotos.length > 0 ? ` (${fotos.length}/${slots})` : ` — opcional, até ${slots} · máx. 155 KB (ajuste automático)`}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {fotos.map((file, idx) => {
          const url = URL.createObjectURL(file)
          return (
            <div
              key={idx}
              className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 border-slate-200 shadow-sm dark:border-slate-700"
            >
              <img
                src={url}
                alt={`Foto ${idx + 1}`}
                className="h-full w-full object-cover"
                onLoad={() => URL.revokeObjectURL(url)}
                onError={() => URL.revokeObjectURL(url)}
              />
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white shadow-md"
                aria-label="Remover foto"
              >
                <X size={10} />
              </button>
            </div>
          )
        })}
        {restantes > 0 && (
          <>
            <input
              ref={ref}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => {
                const input = e.target
                void (async () => {
                  const novos = Array.from(input.files ?? []).slice(0, restantes)
                  if (!novos.length) {
                    input.value = ''
                    return
                  }
                  const processed = await Promise.all(novos.map((f) => compressChecklistImageIfNeeded(f)))
                  onAdd(processed)
                  input.value = ''
                })()
              }}
            />
            <button
              type="button"
              onClick={() => ref.current?.click()}
              className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-rose-300 bg-rose-50/80 text-rose-500 transition active:bg-rose-100 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-400"
            >
              <Camera size={22} />
              <span className="text-[9px] font-extrabold uppercase leading-none tracking-wide">
                {fotos.length === 0 ? 'Tirar foto' : `+${restantes}`}
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function normalizePlacaChecklistInput(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

// ---------------------------------------------------------------------------
// Autocomplete de supervisor
// ---------------------------------------------------------------------------
const SUPERVISORES = Object.keys(SUPERVISOR_WHATSAPP)
  .sort((a, b) => a.localeCompare(b, 'pt-BR'))
  .map((nome) => ({ label: nome }))

function SupervisorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const reconhecido = value.trim().length > 0 && isSupervisorReconhecido(value)

  const sugestoes = value.trim().length === 0
    ? SUPERVISORES
    : SUPERVISORES.filter((s) =>
        s.label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(
          value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
        )
      )

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className={`overflow-hidden rounded-2xl ${CGB_CARD}`}>
      <div className={CGB_SECTION_HEADER}>
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-white">
          Supervisor Responsável
        </p>
      </div>
      <div className="relative px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            value={value}
            onChange={(e) => { onChange(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            placeholder="Digite para buscar o supervisor..."
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          {reconhecido && (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <CheckCircle2 size={12} />
              Reconhecido
            </span>
          )}
        </div>

        {/* Badge de confirmação abaixo do input */}
        {reconhecido && (
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-800/50 dark:bg-emerald-900/20">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <p className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300">
              WhatsApp reconhecido — alerta será enviado automaticamente se houver NC.
            </p>
          </div>
        )}

        {open && sugestoes.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mx-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
            {sugestoes.map((s) => (
              <button
                key={s.label}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  onChange(s.label)
                  setOpen(false)
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-800 transition-colors hover:bg-rose-50 hover:text-rose-700 dark:text-slate-200 dark:hover:bg-rose-900/30 dark:hover:text-rose-300"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[11px] font-extrabold text-rose-700 dark:bg-rose-900/50 dark:text-rose-300">
                  {s.label.charAt(0)}
                </span>
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
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

  const [respostas, setRespostas]         = useState<Record<string, Resposta>>({})
  const [observacoes, setObservacoes]     = useState<Record<string, string>>({})
  const [fotosItem, setFotosItem]         = useState<Record<string, File[]>>({})
  const [dadosVeiculo, setDadosVeiculo]   = useState<Record<string, string>>({})
  const [localidadeGeoLoading, setLocalidadeGeoLoading] = useState(false)
  const [localidadeGeoErro, setLocalidadeGeoErro] = useState('')
  const [dataInspecao, setDataInspecao]   = useState(() => new Date().toISOString().split('T')[0] ?? '')
  const [problemas, setProblemas]         = useState('')
  const [descricaoProblema, setDescricaoProblema] = useState('')
  const [supervisor, setSupervisor]       = useState('')
  const [arquivos, setArquivos]           = useState<File[]>([])
  const [enviando, setEnviando]           = useState(false)
  const [erroEnvio, setErroEnvio]         = useState('')
  const [concluido, setConcluido]         = useState(false)
  const [resultadoFinal, setResultadoFinal] = useState<{
    ncCount: number
    ncImperativos: number
    itensNc: { label: string; imperativo: boolean; obs: string }[]
    offline?: boolean
    nomeSupervisor: string
    veiculo: string
  } | null>(null)
  // highlight do item atual após scroll
  const [itemDestacado, setItemDestacado] = useState<string | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const scrollTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const [fleetTick, setFleetTick] = useState(0)
  const [placaSuggestOpen, setPlacaSuggestOpen] = useState(false)
  const [placaHighlightIdx, setPlacaHighlightIdx] = useState(0)

  useEffect(() => {
    const bump = () => setFleetTick((t) => t + 1)
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === 'frota.vehicles.registry' ||
        e.key === 'frota.vehicles.statusByPlaca' ||
        e.key === 'frota.vehicles.manutencaoByPlaca' ||
        e.key === null
      ) {
        bump()
      }
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', bump)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', bump)
      scrollTimers.current.forEach(clearTimeout)
      scrollTimers.current = []
    }
  }, [])

  const fleetByPlaca = useMemo(() => {
    void fleetTick
    const map = new Map<string, ReturnType<typeof getDisplayedFleetVehicles>[number]>()
    for (const v of getDisplayedFleetVehicles()) {
      map.set(v.placa, v)
    }
    return map
  }, [fleetTick])

  const placasOrdenadas = useMemo(
    () => [...fleetByPlaca.keys()].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [fleetByPlaca],
  )

  const placasSugeridas = useMemo(() => {
    const q = normalizePlacaChecklistInput(dadosVeiculo.placa ?? '')
    const limite = 20
    if (!q) return placasOrdenadas.slice(0, limite)
    const matches = placasOrdenadas.filter((p) => p.includes(q))
    return matches.slice(0, limite)
  }, [placasOrdenadas, dadosVeiculo.placa])

  useEffect(() => {
    setPlacaHighlightIdx((i) => {
      if (placasSugeridas.length === 0) return 0
      return Math.min(i, placasSugeridas.length - 1)
    })
  }, [placasSugeridas])

  const selecionarPlacaSugestao = useCallback(
    (placaEscolhida: string) => {
      const raw = normalizePlacaChecklistInput(placaEscolhida)
      const v = fleetByPlaca.get(raw)
      setDadosVeiculo((p) => ({
        ...p,
        placa: raw,
        marca_modelo: v ? v.modelo : '',
      }))
      setPlacaSuggestOpen(false)
    },
    [fleetByPlaca],
  )

  const onPlacaChange = useCallback(
    (rawInput: string) => {
      const raw = normalizePlacaChecklistInput(rawInput)
      const v = fleetByPlaca.get(raw)
      setDadosVeiculo((p) => ({
        ...p,
        placa: raw,
        ...(v ? { marca_modelo: v.modelo } : !raw ? { marca_modelo: '' } : {}),
      }))
    },
    [fleetByPlaca],
  )

  const onPlacaBlur = useCallback(() => {
    setDadosVeiculo((p) => {
      const raw = normalizePlacaChecklistInput(p.placa ?? '')
      const v = fleetByPlaca.get(raw)
      return { ...p, placa: raw, marca_modelo: v ? v.modelo : '' }
    })
  }, [fleetByPlaca])

  const respondidos   = Object.values(respostas).filter((v) => v !== null).length
  const ncCount       = Object.values(respostas).filter((v) => v === 'nc').length
  const ncImperativos = todosItens.filter((it) => it.imperativo && respostas[it.id] === 'nc').length
  const progresso     = totalItens > 0 ? Math.round((respondidos / totalItens) * 100) : 0
  const tudo100       = progresso === 100

  const camposObrigatorios = schema.camposExtras?.filter((c) => c.obrigatorio) ?? []
  const camposPreenchidos  = camposObrigatorios.every((c) => (dadosVeiculo[c.id] ?? '').trim() !== '')
  const evidenciaNr12Ok = !schema.temEvidencia || arquivos.length > 0
  const podEnviar = tudo100 && camposPreenchidos && evidenciaNr12Ok

  // Número sequencial global de cada item
  const numeroItem = (grupoIdx: number, itemIdx: number) => {
    let n = 0
    for (let g = 0; g < grupoIdx; g++) n += schema.grupos[g]!.itens.length
    return n + itemIdx + 1
  }

  const setResposta = useCallback((id: string, valor: Resposta) => {
    setRespostas((prev) => {
      const nova = prev[id] === valor ? null : valor
      if (nova !== 'nc') {
        setFotosItem((fp) => { const cp = { ...fp }; delete cp[id]; return cp })
      }
      return { ...prev, [id]: nova }
    })

    // Scroll com highlight para o próximo item sem resposta
    const t1 = setTimeout(() => {
      setRespostas((current) => {
        const novas = { ...current, [id]: current[id] === valor ? null : valor }
        const proximoId = todosItens.find((it) => novas[it.id] == null)?.id
        if (proximoId && itemRefs.current[proximoId]) {
          itemRefs.current[proximoId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          setItemDestacado(proximoId)
          const t2 = setTimeout(() => setItemDestacado(null), 1200)
          scrollTimers.current.push(t2)
        }
        return current // não alterar state aqui, só lemos
      })
    }, 150)
    scrollTimers.current.push(t1)
  }, [todosItens])

  const setDado = (id: string, valor: string) =>
    setDadosVeiculo((prev) => ({ ...prev, [id]: valor }))

  const pedirLocalizacao = useCallback(() => {
    setLocalidadeGeoErro('')
    if (!navigator.geolocation) {
      setLocalidadeGeoErro('Geolocalização não disponível neste navegador.')
      return
    }
    setLocalidadeGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6)
        const lng = pos.coords.longitude.toFixed(6)
        setDadosVeiculo((p) => ({ ...p, localidade: `${lat}, ${lng}` }))
        setLocalidadeGeoLoading(false)
      },
      (err) => {
        setLocalidadeGeoLoading(false)
        const code = err.code
        const msg =
          code === 1
            ? 'Permissão de localização negada.'
            : code === 2
              ? 'Posição indisponível.'
              : code === 3
                ? 'Tempo esgotado. Tente novamente em área aberta.'
                : 'Não foi possível obter a localização.'
        setLocalidadeGeoErro(msg)
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    )
  }, [])

  const addFotoItem  = (id: string, novos: File[]) =>
    setFotosItem((prev) => ({ ...prev, [id]: [...(prev[id] ?? []), ...novos].slice(0, 3) }))

  const handleArquivos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const room = Math.max(0, 10 - arquivos.length)
    const novos = Array.from(input.files ?? []).slice(0, room)
    input.value = ''
    if (!novos.length) return
    void (async () => {
      const processed = await Promise.all(
        novos.map((f) =>
          f.type.startsWith('image/') && f.type !== 'image/svg+xml'
            ? compressChecklistImageIfNeeded(f)
            : Promise.resolve(f),
        ),
      )
      setArquivos((prev) => [...prev, ...processed].slice(0, 10))
    })()
  }

  const removerArquivo = (idx: number) =>
    setArquivos((prev) => prev.filter((_, i) => i !== idx))

  const removeFotoItem = (id: string, idx: number) =>
    setFotosItem((prev) => ({ ...prev, [id]: (prev[id] ?? []).filter((_, i) => i !== idx) }))

  const uploadFile = async (file: File, path: string): Promise<string | null> =>
    uploadChecklistEvidenceFile(file, path)

  const buildChecklistPayload = (observacoesFinais: Record<string, string>, evidenciaUrls: string[]) => {
    const respostasLimpas = Object.fromEntries(
      Object.entries(respostas).filter((e): e is [string, 'c' | 'nc' | 'na'] => e[1] !== null),
    )

    return {
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
    }
  }

  const buildOfflineFiles = (): OfflineChecklistFile[] => {
    const gerais = arquivos.map((file) => ({
      name: file.name,
      type: file.type,
      itemId: null,
      file,
    }))
    const porItem = Object.entries(fotosItem).flatMap(([itemId, fotos]) =>
      fotos.map((file) => ({
        name: file.name,
        type: file.type,
        itemId,
        file,
      })),
    )
    return [...gerais, ...porItem]
  }

  const handleEnviar = async () => {
    if (!podEnviar) return
    setEnviando(true)
    setErroEnvio('')

    if (!navigator.onLine) {
      try {
        await enqueueChecklist(buildChecklistPayload({ ...observacoes }, []), buildOfflineFiles())
      } catch {
        setErroEnvio('Sem internet e não foi possível salvar offline. Verifique o armazenamento do dispositivo.')
        setEnviando(false)
        return
      }
      const itensNc = todosItens
        .filter((it) => respostas[it.id] === 'nc')
        .map((it) => ({ label: it.label, imperativo: !!it.imperativo, obs: observacoes[it.id] ?? '' }))
      setResultadoFinal({ ncCount, ncImperativos, itensNc, offline: true, nomeSupervisor: supervisor, veiculo: dadosVeiculo['placa'] ?? '' })
      setConcluido(true)
      setEnviando(false)
      return
    }

    const ts = Date.now()
    const evidenciaUrls: string[] = []

    for (const file of arquivos) {
      const url = await uploadFile(file, `${schema.id}/${ts}-${file.name.replace(/\s+/g, '_')}`)
      if (url) evidenciaUrls.push(url)
    }

    const fotasUrls: Record<string, string[]> = {}
    for (const [itemId, fotos] of Object.entries(fotosItem)) {
      fotasUrls[itemId] = []
      for (const [i, file] of fotos.entries()) {
        const ext = file.name.split('.').pop() ?? 'jpg'
        const url = await uploadFile(file, `${schema.id}/item-${itemId}-${ts}-${i}.${ext}`)
        if (url) { fotasUrls[itemId].push(url); evidenciaUrls.push(url) }
      }
    }

    const observacoesFinais = { ...observacoes }
    for (const [itemId, urls] of Object.entries(fotasUrls)) {
      if (urls.length > 0) {
        const t = observacoesFinais[itemId] ?? ''
        // Salva as URLs reais separadas por \n após o texto da observação
        observacoesFinais[itemId] = t
          ? `${t}\n__fotos__:${urls.join('|')}`
          : `__fotos__:${urls.join('|')}`
      }
    }

    const payload = buildChecklistPayload(observacoesFinais, evidenciaUrls)
    const { error } = await supabase.from('checklists').insert(payload)

    if (error) {
      try {
        // Usa observacoesFinais (com URLs de fotos já embutidas) no fallback offline
        await enqueueChecklist(buildChecklistPayload(observacoesFinais, evidenciaUrls), buildOfflineFiles())
      } catch {
        setErroEnvio('Erro ao enviar e salvar offline. Verifique o armazenamento do dispositivo.')
        setEnviando(false)
        return
      }
    }

    // Monta lista de itens NC para a tela de conclusão
    const itensNc = todosItens
      .filter((it) => respostas[it.id] === 'nc')
      .map((it) => ({ label: it.label, imperativo: !!it.imperativo, obs: observacoes[it.id] ?? '' }))

    setResultadoFinal({ ncCount, ncImperativos, itensNc, offline: Boolean(error), nomeSupervisor: supervisor, veiculo: dadosVeiculo['placa'] ?? '' })
    setConcluido(true)
    setEnviando(false)
  }

  if (concluido && resultadoFinal) {
    return (
      <TelaConclusao
        ncImperativos={resultadoFinal.ncImperativos}
        ncCount={resultadoFinal.ncCount}
        itensNc={resultadoFinal.itensNc}
        offline={resultadoFinal.offline}
        nomeSupervisor={resultadoFinal.nomeSupervisor}
        veiculo={resultadoFinal.veiculo}
        operador={operador}
      />
    )
  }

  return (
    <div className={`min-h-dvh ${CHECKLIST_PAGE_BG}`} style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>

      {/* ── Header fixo ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b1020]/95 px-4 py-3 text-white shadow-[0_12px_30px_rgba(15,23,42,0.22)] backdrop-blur dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <CollapsedNavMark size="md" className="ring-1 ring-white/15" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-black text-white">{schema.nome}</div>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.12]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    ncImperativos > 0 ? 'bg-rose-500' :
                    tudo100        ? 'bg-emerald-500' :
                    'bg-[#c81e55]'
                  }`}
                  style={{ width: `${progresso}%` }}
                />
              </div>
              <span className="shrink-0 text-[11px] font-extrabold tabular-nums text-slate-300">
                {respondidos}/{totalItens}
              </span>
              <span className="shrink-0 text-[11px] font-black tabular-nums text-white">
                {progresso}%
              </span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xs font-extrabold text-white">{operador}</div>
            <div className="text-[10px] font-semibold text-slate-400">Mat. {matricula}</div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-4 px-4 pt-4">
        <SyncStatus />

        {/* ── Legenda C / NC / NA ──────────────────────────────────── */}
        <div className={`overflow-hidden rounded-2xl ${CGB_CARD}`}>
          <div className={CGB_SECTION_HEADER}>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-rose-100">Como responder</p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800">
            {[
              { cor: 'bg-emerald-500', label: 'C', nome: 'Conforme', desc: 'Item ok, sem problemas' },
              { cor: 'bg-rose-500',    label: 'NC', nome: 'Não Conforme', desc: 'Problema encontrado' },
              { cor: 'bg-slate-400',   label: 'NA', nome: 'Não se Aplica', desc: 'Item não existe no veículo' },
            ].map(({ cor, label, nome, desc }) => (
              <div key={label} className="flex flex-col items-center gap-1.5 px-2 py-3 text-center">
                <span className={`flex h-8 w-12 items-center justify-center rounded-lg text-xs font-extrabold text-white ${cor}`}>
                  {label}
                </span>
                <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200">{nome}</span>
                <span className="text-[10px] font-semibold leading-tight text-slate-400 dark:text-slate-500">{desc}</span>
              </div>
            ))}
          </div>
          {schema.grupos.some((g) => g.itens.some((i) => i.imperativo)) && (
            <div className="border-t border-amber-100 bg-amber-50 px-4 py-2.5 dark:border-amber-900/30 dark:bg-amber-900/10">
              <p className="text-xs font-extrabold text-amber-700 dark:text-amber-400">
                🚫 Itens marcados com este símbolo são <strong>IMPEDITIVOS</strong> — NC neles impede a condução do veículo.
              </p>
            </div>
          )}
        </div>

        {/* ── Dados do Veículo ─────────────────────────────────────── */}
        <div className={`overflow-visible rounded-2xl ${CGB_CARD}`}>
          <div className={CGB_SECTION_HEADER}>
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-white">
              Dados do Veículo
            </p>
            <p className="mt-0.5 text-xs font-semibold text-rose-100/85">Preencha antes de iniciar a inspeção</p>
          </div>
          <div className="grid grid-cols-2 gap-px bg-slate-100 dark:bg-slate-800">
            <div className="flex flex-col gap-0.5 bg-white px-4 py-3 dark:bg-slate-950">
              <label className={CGB_FIELD_LABEL}>Data *</label>
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
                <label className={CGB_FIELD_LABEL}>
                  {campo.label}{campo.obrigatorio ? ' *' : ''}
                </label>
                {campo.id === 'placa' ? (
                  <div className="relative z-10">
                    <input
                      type="text"
                      autoComplete="off"
                      aria-autocomplete="list"
                      aria-expanded={placaSuggestOpen}
                      aria-controls={`checklist-placa-sugestoes-${schema.id}`}
                      role="combobox"
                      value={dadosVeiculo.placa ?? ''}
                      onChange={(e) => {
                        onPlacaChange(e.target.value)
                        setPlacaSuggestOpen(true)
                      }}
                      onFocus={() => setPlacaSuggestOpen(true)}
                      onBlur={() => {
                        onPlacaBlur()
                        window.setTimeout(() => setPlacaSuggestOpen(false), 200)
                      }}
                      onKeyDown={(e) => {
                        if (!placaSuggestOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
                          setPlacaSuggestOpen(true)
                          return
                        }
                        if (e.key === 'Escape') {
                          setPlacaSuggestOpen(false)
                          return
                        }
                        if (e.key === 'ArrowDown') {
                          e.preventDefault()
                          setPlacaHighlightIdx((i) =>
                            placasSugeridas.length === 0 ? 0 : Math.min(placasSugeridas.length - 1, i + 1),
                          )
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault()
                          setPlacaHighlightIdx((i) => Math.max(0, i - 1))
                        } else if (e.key === 'Enter' && placaSuggestOpen && placasSugeridas[placaHighlightIdx]) {
                          e.preventDefault()
                          const p = placasSugeridas[placaHighlightIdx]
                          if (p) selecionarPlacaSugestao(p)
                        }
                      }}
                      placeholder="Digite para buscar..."
                      className="w-full bg-transparent text-base font-semibold uppercase tracking-wide text-slate-900 outline-none placeholder:normal-case placeholder:text-slate-300 dark:text-slate-100"
                    />
                    {placaSuggestOpen && placasSugeridas.length > 0 ? (
                      <ul
                        id={`checklist-placa-sugestoes-${schema.id}`}
                        role="listbox"
                        className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-600 dark:bg-slate-900"
                      >
                        {placasSugeridas.map((placaVal, idx) => (
                          <li key={placaVal}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={idx === placaHighlightIdx}
                              className={`flex w-full px-3 py-2 text-left text-sm font-bold uppercase tracking-wide ${
                                idx === placaHighlightIdx
                                  ? 'bg-[#7f1022]/12 text-[#7f1022] dark:bg-rose-500/20 dark:text-rose-200'
                                  : 'text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800'
                              }`}
                              onMouseDown={(ev) => ev.preventDefault()}
                              onMouseEnter={() => setPlacaHighlightIdx(idx)}
                              onClick={() => selecionarPlacaSugestao(placaVal)}
                            >
                              {placaVal}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : campo.id === 'localidade' ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-stretch gap-2">
                      <input
                        type="text"
                        inputMode="text"
                        value={dadosVeiculo.localidade ?? ''}
                        onChange={(e) => {
                          setLocalidadeGeoErro('')
                          setDado('localidade', e.target.value)
                        }}
                        placeholder="Endereço ou use o GPS"
                        className="min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-300 dark:text-slate-100"
                      />
                      <button
                        type="button"
                        onClick={pedirLocalizacao}
                        disabled={localidadeGeoLoading}
                        className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#7f1022]/35 bg-[#7f1022]/[0.08] px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-[#7f1022] transition hover:bg-[#7f1022]/15 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-500/35 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20"
                      >
                        {localidadeGeoLoading ? (
                          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                        ) : (
                          <MapPin className="size-4 shrink-0" aria-hidden />
                        )}
                        GPS
                      </button>
                    </div>
                    {localidadeGeoErro ? (
                      <p className="text-xs font-semibold text-rose-500 dark:text-rose-400">{localidadeGeoErro}</p>
                    ) : null}
                  </div>
                ) : campo.tipo === 'select' && campo.opcoes && campo.opcoes.length > 0 ? (
                  <select
                    value={dadosVeiculo[campo.id] ?? ''}
                    onChange={(e) => setDado(campo.id, e.target.value)}
                    className="w-full bg-transparent text-base font-semibold text-slate-900 outline-none dark:text-slate-100"
                  >
                    <option value="">Escolher...</option>
                    {campo.opcoes.map((op) => <option key={op} value={op}>{op}</option>)}
                  </select>
                ) : (
                  <input
                    type={campo.tipo === 'number' ? 'number' : 'text'}
                    inputMode={campo.tipo === 'number' ? 'numeric' : 'text'}
                    value={dadosVeiculo[campo.id] ?? ''}
                    onChange={(e) => setDado(campo.id, e.target.value)}
                    placeholder="—"
                    className="w-full bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-300 dark:text-slate-100"
                  />
                )}
              </div>
            ))}
          </div>
          {!camposPreenchidos && tudo100 && (
            <div className="border-t border-rose-100 bg-rose-50 px-4 py-2.5 dark:border-rose-900/30 dark:bg-rose-900/10">
              <p className="text-xs font-extrabold text-rose-600 dark:text-rose-400">
                ⚠ Preencha todos os campos obrigatórios (*) para poder enviar.
              </p>
            </div>
          )}
        </div>

        {/* ── Supervisor ───────────────────────────────────────────── */}
        {schema.temSupervisor && (
          <SupervisorField value={supervisor} onChange={setSupervisor} />
        )}

        {/* ── Grupos de itens ──────────────────────────────────────── */}
        {schema.grupos.map((grupo, grupoIdx) => {
          const respondidosGrupo = grupo.itens.filter((it) => respostas[it.id] != null).length
          const grupoCompleto    = respondidosGrupo === grupo.itens.length

          return (
            <div
              key={grupo.id}
              className={`overflow-hidden rounded-2xl ${CGB_CARD}`}
            >
              {/* Cabeçalho do grupo */}
              <div className="flex items-center justify-between border-b border-[#7f1022]/10 bg-gradient-to-r from-white to-rose-50/80 px-4 py-3 dark:border-white/10 dark:from-slate-950 dark:to-rose-950/20">
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#7f1022] dark:text-rose-200">
                  {grupo.titulo}
                </p>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                  grupoCompleto
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-[#7f1022]/10 text-[#7f1022] dark:bg-rose-500/10 dark:text-rose-200'
                }`}>
                  {grupoCompleto ? '✓ ' : ''}{respondidosGrupo}/{grupo.itens.length}
                </span>
              </div>

              {/* Rótulos das colunas */}
              <div className="flex items-center justify-between border-b border-slate-100 bg-white/70 px-4 py-1.5 dark:border-slate-800 dark:bg-slate-900/30">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#7f1022]/50 dark:text-rose-200/50">#  Item</span>
                <div className="flex gap-2">
                  {['C', 'NC', 'NA'].map((l) => (
                    <span key={l} className="w-14 text-center text-[10px] font-extrabold uppercase tracking-widest text-[#7f1022]/50 sm:w-16 dark:text-rose-200/50">
                      {l}
                    </span>
                  ))}
                </div>
              </div>

              {grupo.itens.map((item, itemIdx) => {
                const resp      = respostas[item.id] ?? null
                const obs       = observacoes[item.id] ?? ''
                const fotos     = fotosItem[item.id] ?? []
                const isLast    = itemIdx === grupo.itens.length - 1
                const numero    = numeroItem(grupoIdx, itemIdx)
                const destacado = itemDestacado === item.id

                const bgClass =
                  destacado   ? 'bg-rose-50 dark:bg-rose-900/20' :
                  resp === 'nc' ? 'bg-rose-50/70 dark:bg-rose-900/15' :
                  resp === 'c'  ? 'bg-emerald-50/50 dark:bg-emerald-900/[0.08]' :
                  resp === 'na' ? 'bg-slate-50/80 dark:bg-slate-900/20' :
                  ''

                return (
                  <div
                    key={item.id}
                    ref={(el) => { itemRefs.current[item.id] = el }}
                    className={`px-4 py-3 transition-colors duration-300 ${!isLast ? 'border-b border-slate-100 dark:border-slate-800/80' : ''} ${bgClass}`}
                  >
                    {/* Linha principal: número + label + botões */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-2 pt-0.5">
                        {/* Número do item */}
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-extrabold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {numero}
                        </span>
                        {/* 🚫 imperativo */}
                        {item.imperativo && (
                          <span className="shrink-0 text-sm leading-tight" title="Item impeditivo — NC impede condução">🚫</span>
                        )}
                        <span className="text-sm font-semibold leading-snug text-slate-800 dark:text-slate-100">
                          {item.label}
                        </span>
                      </div>

                      {/* Botões C / NC / NA */}
                      <div className="flex shrink-0 gap-1.5">
                        {[
                          { valor: 'c'  as const, label: 'C',  activeClass: 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-200 shadow-sm' },
                          { valor: 'nc' as const, label: 'NC', activeClass: 'bg-rose-500 border-rose-500 text-white shadow-rose-200 shadow-sm' },
                          { valor: 'na' as const, label: 'NA', activeClass: 'bg-[#7f1022] border-[#7f1022] text-white shadow-sm' },
                        ].map(({ valor, label, activeClass }) => (
                          <button
                            key={valor}
                            type="button"
                            onClick={() => setResposta(item.id, valor)}
                            className={`flex h-11 w-14 items-center justify-center rounded-xl border-2 text-xs font-extrabold transition-all active:scale-95 sm:w-16 ${
                              resp === valor
                                ? activeClass
                                : 'border-slate-200 bg-white/70 text-slate-400 hover:border-[#b51649]/40 hover:text-[#7f1022] dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-500 dark:hover:border-rose-400/40 dark:hover:text-rose-200'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Área expandida quando NC */}
                    {resp === 'nc' && (
                      <div className="mt-3 ml-7 space-y-3">
                        <div>
                          <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wide text-rose-500">
                            Descreva o problema *
                          </label>
                          <textarea
                            rows={2}
                            value={obs}
                            onChange={(e) => setObservacoes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                            placeholder="O que foi encontrado de errado? Seja específico..."
                            className="w-full resize-none rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:border-rose-800/60 dark:bg-slate-900/60 dark:text-slate-100 dark:focus:ring-rose-900/30"
                          />
                        </div>
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

        {/* ── Problemas Verificados ────────────────────────────────── */}
        {schema.temProblemas && (
          <div className={`overflow-hidden rounded-2xl ${CGB_CARD}`}>
            <div className={CGB_SECTION_HEADER}>
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-white">
                Problemas Adicionais
              </p>
              <p className="mt-0.5 text-xs font-semibold text-rose-100/85">
                Registre qualquer problema não coberto pelos itens acima (freios, motor, câmbio, pneus, etc.)
              </p>
            </div>
            <div className="px-4 py-3">
              <textarea
                rows={4}
                value={problemas}
                onChange={(e) => setProblemas(e.target.value)}
                placeholder="Ex: 'Barulho no câmbio ao trocar de marcha' ou 'Nenhum problema adicional'..."
                className="w-full resize-none bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400 dark:text-slate-100"
              />
              {problemas && (
                <>
                  <div className="my-2 border-t border-slate-100 dark:border-slate-800" />
                  <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                    Detalhe / local do problema
                  </label>
                  <textarea
                    rows={2}
                    value={descricaoProblema}
                    onChange={(e) => setDescricaoProblema(e.target.value)}
                    placeholder="Ex: 'Lado traseiro direito', 'Ao frear em alta velocidade'..."
                    className="w-full resize-none bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400 dark:text-slate-100"
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Evidência NR12 ───────────────────────────────────────── */}
        {schema.temEvidencia && (
          <div className={`overflow-hidden rounded-2xl ${CGB_CARD}`}>
            <div className={CGB_SECTION_HEADER}>
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-white">
                Evidência NR12 *
              </p>
              <p className="mt-0.5 text-xs font-semibold text-rose-100/85">
                Obrigatório — anexe fotos ou PDFs da inspeção geral (máx. 10 arquivos · imagens até 155 KB, ajuste automático)
              </p>
            </div>
            <div className="px-4 py-3">
              {arquivos.length > 0 && (
                <div className="mb-3 space-y-2">
                  {arquivos.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/40">
                      <Paperclip size={13} className="shrink-0 text-slate-400" />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {file.name}
                      </span>
                      <span className="shrink-0 text-[10px] font-semibold text-slate-400">
                        {(file.size / 1024 / 1024).toFixed(1)} MB
                      </span>
                      <button type="button" onClick={() => removerArquivo(idx)} className="shrink-0 text-slate-400 hover:text-rose-500">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {arquivos.length < 10 && (
                <>
                  <input ref={fileRef} type="file" multiple accept="image/*,.pdf" className="hidden" onChange={handleArquivos} />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#7f1022]/20 bg-[#7f1022]/[0.08] px-4 py-2.5 text-sm font-extrabold text-[#7f1022] transition hover:bg-[#7f1022]/[0.12] dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200"
                  >
                    <Paperclip size={15} />
                    Adicionar arquivo
                    {arquivos.length > 0 && (
                      <span className="ml-1 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                        {arquivos.length}/10
                      </span>
                    )}
                  </button>
                </>
              )}
            </div>
            {tudo100 && camposPreenchidos && arquivos.length === 0 && (
              <div className="border-t border-rose-100 bg-rose-50 px-4 py-2.5 dark:border-rose-900/30 dark:bg-rose-900/10">
                <p className="text-xs font-extrabold text-rose-600 dark:text-rose-400">
                  ⚠ Anexe pelo menos um arquivo de evidência NR12 para enviar o checklist.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Aviso bloqueio ───────────────────────────────────────── */}
        {ncImperativos > 0 && (
          <div className="rounded-2xl border-2 border-rose-400 bg-rose-50 px-4 py-4 dark:border-rose-700 dark:bg-rose-900/20">
            <p className="text-sm font-extrabold text-rose-700 dark:text-rose-400">
              🚫 ATENÇÃO — VEÍCULO IMPEDIDO DE SER CONDUZIDO
            </p>
            <p className="mt-1 text-xs font-semibold text-rose-600 dark:text-rose-500">
              {ncImperativos} item(s) impeditivo(s) marcado(s) como Não Conforme. Acione o supervisor antes de mover o veículo.
            </p>
          </div>
        )}

      </div>

      {/* ── Barra de envio fixa ──────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-[#0b1020]/95 px-4 pt-3 text-white shadow-[0_-18px_45px_rgba(15,23,42,0.18)] backdrop-blur dark:bg-slate-950/95" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div className="min-w-0">
            {erroEnvio ? (
              <p className="text-sm font-extrabold text-rose-500">{erroEnvio}</p>
            ) : ncImperativos > 0 ? (
              <p className="text-sm font-extrabold text-rose-500">🚫 {ncImperativos} item(s) impeditivo(s)</p>
            ) : ncCount > 0 ? (
              <p className="text-sm font-extrabold text-amber-600 dark:text-amber-400">{ncCount} NC registrado(s)</p>
            ) : tudo100 && camposPreenchidos && evidenciaNr12Ok ? (
              <p className="flex items-center gap-1.5 text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={16} /> Pronto para enviar
              </p>
            ) : tudo100 && camposPreenchidos && schema.temEvidencia && !evidenciaNr12Ok ? (
              <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                Anexe a evidência NR12 (obrigatória)
              </p>
            ) : tudo100 ? (
              <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">Preencha os dados obrigatórios</p>
            ) : (
              <p className="text-sm font-semibold text-slate-300">
                Faltam {totalItens - respondidos} item(s)
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleEnviar}
            disabled={!podEnviar || enviando}
            className={`h-12 shrink-0 rounded-xl px-6 text-sm font-extrabold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
              ncImperativos > 0
                ? 'bg-rose-600 dark:bg-rose-700'
                : CGB_PRIMARY_BUTTON
            }`}
          >
            {enviando ? 'Enviando…' : ncImperativos > 0 ? 'Enviar e Reportar' : 'Enviar Checklist'}
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
  const [tipoSelecionado, setTipoSelecionado] = useState<string | null>(null)
  const [operador, setOperador]   = useState<string | null>(null)
  const [matricula, setMatricula] = useState<string | null>(null)

  if (!tipoSelecionado) {
    return <TelaEscolhaChecklist onSelecionar={setTipoSelecionado} />
  }

  const schema = SCHEMA_MAP[tipoSelecionado]
  if (!schema) {
    return <Navigate to="/checklist" replace />
  }

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
