import { useRef, useState } from 'react'
import { Camera, CheckCircle2, Loader2, MessageSquareWarning, X } from 'lucide-react'
import {
  CHECKLIST_AUSENCIA_MOTIVOS,
  type ChecklistAusenciaMotivo,
} from '../../checklists/checklistAusenciaJustificativa'
import { uploadChecklistEvidenceFile } from '../../lib/checklistEvidenceUpload'
import { formatPlaca, normalizePlaca } from '../../frota/vehicleRegistry'

type Props = {
  placa: string
  motivoAtual?: ChecklistAusenciaMotivo | null
  placaReservaAtual?: string | null
  obsAtual?: string
  kmUltimo?: number
  saving?: boolean
  onSelect: (motivo: ChecklistAusenciaMotivo, placaReserva?: string, obs?: string, fotoUrl?: string) => void
}

type PendingMotivo = {
  motivo: ChecklistAusenciaMotivo
  placaReserva?: string
  obs?: string
}

// ─── Formulário de placa reserva ─────────────────────────────────────────────

function ReservaPlacaForm({
  placaOriginal,
  initialPlacaReserva,
  saving,
  onConfirm,
  onCancel,
}: {
  placaOriginal: string
  initialPlacaReserva?: string
  saving?: boolean
  onConfirm: (placaReserva: string) => void
  onCancel: () => void
}) {
  const [placaReserva, setPlacaReserva] = useState(initialPlacaReserva ?? '')
  const [erro, setErro] = useState('')

  const confirmar = () => {
    const normalizada = normalizePlaca(placaReserva)
    if (!normalizada || normalizada.length < 7) {
      setErro('Informe a placa completa do veículo reserva.')
      return
    }
    if (normalizada === normalizePlaca(placaOriginal)) {
      setErro('A placa reserva deve ser diferente da placa original.')
      return
    }
    setErro('')
    onConfirm(normalizada)
  }

  return (
    <div className="w-full min-w-[220px] rounded-xl border border-amber-200 bg-amber-50/90 p-2.5 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/40">
      <p className="text-[10px] font-black uppercase tracking-wide text-amber-900 dark:text-amber-100">
        Placa do veículo reserva
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <input
          type="text"
          value={placaReserva}
          disabled={saving}
          onChange={(e) => {
            setPlacaReserva(e.target.value.toUpperCase())
            if (erro) setErro('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); confirmar() }
            if (e.key === 'Escape') onCancel()
          }}
          placeholder="ABC-1234"
          autoFocus
          className="min-w-[110px] flex-1 rounded-lg border border-amber-300/80 bg-white px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-900 outline-none ring-amber-400 focus:ring-2 disabled:opacity-50 dark:border-amber-800 dark:bg-slate-950 dark:text-white"
        />
        <button
          type="button"
          disabled={saving}
          onClick={confirmar}
          className="rounded-lg bg-amber-600 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-white transition hover:bg-amber-700 disabled:opacity-50"
        >
          {saving ? '…' : 'Ok'}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          Cancelar
        </button>
      </div>
      {erro ? <p className="mt-1.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400">{erro}</p> : null}
    </div>
  )
}

// ─── Diálogo de confirmação de desmobilização ─────────────────────────────────

function DesmobilizarConfirmDialog({
  placa,
  saving,
  onConfirm,
  onCancel,
}: {
  placa: string
  saving?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="w-full min-w-[220px] rounded-xl border border-rose-300 bg-rose-50/90 p-2.5 shadow-sm dark:border-rose-900/60 dark:bg-rose-950/40">
      <p className="text-[10px] font-black uppercase tracking-wide text-rose-900 dark:text-rose-100">
        Desmobilizar veículo
      </p>
      <p className="mt-1 text-[10px] text-rose-800 dark:text-rose-200">
        O veículo <strong>{formatPlaca(placa)}</strong> será removido da frota ativa. Esta ação pode ser revertida pelo administrador.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          disabled={saving}
          onClick={onConfirm}
          className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-white transition hover:bg-rose-700 disabled:opacity-50"
        >
          {saving ? '…' : 'Confirmar'}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ─── Diálogo de confirmação de férias ────────────────────────────────────────

function FeriasConfirmDialog({
  placa,
  saving,
  onConfirm,
  onCancel,
}: {
  placa: string
  saving?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="w-full min-w-[220px] rounded-xl border border-sky-300 bg-sky-50/90 p-2.5 shadow-sm dark:border-sky-900/60 dark:bg-sky-950/40">
      <p className="text-[10px] font-black uppercase tracking-wide text-sky-900 dark:text-sky-100">
        Férias — {formatPlaca(placa)}
      </p>
      <p className="mt-1 text-[10px] text-sky-800 dark:text-sky-200">
        O checklist ficará justificado indefinidamente. Somente um justificador pode reverter depois.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          disabled={saving}
          onClick={onConfirm}
          className="rounded-lg bg-sky-600 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-white transition hover:bg-sky-700 disabled:opacity-50"
        >
          {saving ? '…' : 'Confirmar'}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ─── Dropdown de sub-motivo ──────────────────────────────────────────────────

const NAO_RODOU_SUBS = ['Folga', 'Feriado', 'Sem operador', 'Outro'] as const
const OFICINA_SUBS = ['Preventiva', 'Corretiva', 'Revisão'] as const

function SubMotivoDropdown({
  titulo,
  opcoes,
  saving,
  onConfirm,
  onCancel,
}: {
  titulo: string
  opcoes: readonly string[]
  saving?: boolean
  onConfirm: (obs: string) => void
  onCancel: () => void
}) {
  return (
    <div className="w-full min-w-[220px] rounded-xl border border-amber-200 bg-amber-50/90 p-2.5 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/40">
      <p className="text-[10px] font-black uppercase tracking-wide text-amber-900 dark:text-amber-100">
        {titulo}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {opcoes.map((sub) => (
          <button
            key={sub}
            type="button"
            disabled={saving}
            onClick={() => onConfirm(sub)}
            className="rounded-lg border border-amber-300/80 bg-white px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-amber-900 transition hover:border-amber-400 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800 dark:bg-slate-950 dark:text-amber-100 dark:hover:bg-amber-950/40"
          >
            {sub}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={saving}
        onClick={onCancel}
        className="mt-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
      >
        Cancelar
      </button>
    </div>
  )
}

// ─── Formulário de foto de evidência ─────────────────────────────────────────

function FotoEvidenciaForm({
  placa,
  titulo,
  descricao,
  saving,
  onConfirm,
  onCancel,
}: {
  placa: string
  titulo: string
  descricao?: string
  saving?: boolean
  onConfirm: (fotoUrl?: string) => void
  onCancel: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(f)
  }

  const handleConfirm = async () => {
    if (!file) return
    setUploading(true)
    const key = `justificativas/${normalizePlaca(placa)}/${crypto.randomUUID()}.jpg`
    const url = await uploadChecklistEvidenceFile(file, key)
    setUploading(false)
    onConfirm(url ?? undefined)
  }

  const busy = saving || uploading

  return (
    <div className="w-full min-w-[220px] rounded-xl border border-amber-200 bg-amber-50/90 p-2.5 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/40">
      <p className="text-[10px] font-black uppercase tracking-wide text-amber-900 dark:text-amber-100">
        {titulo}
      </p>
      {descricao ? (
        <p className="mt-0.5 text-[10px] text-amber-800/80 dark:text-amber-200/70">{descricao}</p>
      ) : null}

      <div className="mt-2 flex flex-col gap-2">
        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Prévia da foto"
              className="h-24 w-full rounded-lg object-cover ring-2 ring-amber-400/60"
            />
            <button
              type="button"
              onClick={() => { setPreview(null); setFile(null); if (inputRef.current) inputRef.current.value = '' }}
              className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-slate-900/70 text-white hover:bg-slate-900"
            >
              <X size={10} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-amber-300 bg-white py-3 text-[10px] font-bold text-amber-700 transition hover:border-amber-400 hover:bg-amber-50 disabled:opacity-50 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-300 dark:hover:border-amber-700 dark:hover:bg-amber-950/40"
          >
            <Camera size={14} />
            Tirar / Selecionar foto
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFile}
        />

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            disabled={busy || !file}
            onClick={handleConfirm}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-white transition hover:bg-amber-700 disabled:opacity-50"
          >
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
            {uploading ? 'Enviando…' : busy ? '…' : 'Confirmar'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers de estilo ────────────────────────────────────────────────────────

function motivoBtnClass(motivo: ChecklistAusenciaMotivo, base: string, variant: 'default' | 'alt') {
  if (motivo === 'FEITO') {
    return variant === 'default'
      ? `${base} border-emerald-400/70 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:bg-emerald-950/50`
      : `${base} border-emerald-300 bg-white text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-900 dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-300 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-200`
  }
  if (motivo === 'DESMOBILIZADO') {
    return variant === 'default'
      ? `${base} border-rose-400/70 bg-rose-50 text-rose-800 hover:bg-rose-100 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-200 dark:hover:bg-rose-950/50`
      : `${base} border-rose-300 bg-white text-rose-700 hover:border-rose-400 hover:bg-rose-50 hover:text-rose-900 dark:border-rose-900 dark:bg-slate-900 dark:text-rose-300 dark:hover:border-rose-800 dark:hover:bg-rose-950/40 dark:hover:text-rose-200`
  }
  if (motivo === 'FÉRIAS') {
    return variant === 'default'
      ? `${base} border-sky-400/70 bg-sky-50 text-sky-800 hover:bg-sky-100 dark:border-sky-800/50 dark:bg-sky-950/30 dark:text-sky-200 dark:hover:bg-sky-950/50`
      : `${base} border-sky-300 bg-white text-sky-700 hover:border-sky-400 hover:bg-sky-50 hover:text-sky-900 dark:border-sky-900 dark:bg-slate-900 dark:text-sky-300 dark:hover:border-sky-800 dark:hover:bg-sky-950/40 dark:hover:text-sky-200`
  }
  return variant === 'default'
    ? `${base} border-amber-300/70 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-100 dark:hover:bg-amber-950/50`
    : `${base} border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-amber-800 dark:hover:bg-amber-950/40 dark:hover:text-amber-200`
}

function tituloFoto(motivo: ChecklistAusenciaMotivo, obs?: string): string {
  if (motivo === 'FEITO') return 'Foto do checklist físico'
  if (obs) return `Evidência — ${motivo} · ${obs}`
  return `Evidência — ${motivo}`
}

function descricaoFoto(motivo: ChecklistAusenciaMotivo): string | undefined {
  if (motivo === 'FEITO') return 'Tire uma foto do checklist físico como comprovante.'
  return 'Tire uma foto como evidência da justificativa.'
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ChecklistAusenciaJustificar({
  placa,
  motivoAtual,
  placaReservaAtual,
  obsAtual,
  kmUltimo,
  saving,
  onSelect,
}: Props) {
  const [reservaOpen, setReservaOpen] = useState(false)
  const [desmobilizarOpen, setDesmobilizarOpen] = useState(false)
  const [feriasOpen, setFeriasOpen] = useState(false)
  const [naoRodouOpen, setNaoRodouOpen] = useState(false)
  const [oficinaOpen, setOficinaOpen] = useState(false)
  const [pendingMotivo, setPendingMotivo] = useState<PendingMotivo | null>(null)

  const btnBase =
    'rounded-lg border px-2 py-1.5 text-[10px] font-black uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-50'

  const kmChip = kmUltimo !== undefined ? (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      {kmUltimo.toLocaleString('pt-BR')} km
    </span>
  ) : null

  // ── Foto de evidência (etapa final de todos os motivos, exceto DESMOBILIZADO) ─

  if (pendingMotivo) {
    return (
      <FotoEvidenciaForm
        placa={placa}
        titulo={tituloFoto(pendingMotivo.motivo, pendingMotivo.obs)}
        descricao={descricaoFoto(pendingMotivo.motivo)}
        saving={saving}
        onCancel={() => setPendingMotivo(null)}
        onConfirm={(fotoUrl) => {
          onSelect(pendingMotivo.motivo, pendingMotivo.placaReserva, pendingMotivo.obs, fotoUrl)
          setPendingMotivo(null)
        }}
      />
    )
  }

  // ── Fluxos intermediários ─────────────────────────────────────────────────

  if (reservaOpen) {
    return (
      <ReservaPlacaForm
        placaOriginal={placa}
        initialPlacaReserva={motivoAtual === 'RESERVA' ? placaReservaAtual ?? '' : ''}
        saving={saving}
        onCancel={() => setReservaOpen(false)}
        onConfirm={(placaReserva) => {
          setReservaOpen(false)
          setPendingMotivo({ motivo: 'RESERVA', placaReserva })
        }}
      />
    )
  }

  if (desmobilizarOpen) {
    return (
      <DesmobilizarConfirmDialog
        placa={placa}
        saving={saving}
        onCancel={() => setDesmobilizarOpen(false)}
        onConfirm={() => {
          onSelect('DESMOBILIZADO')
          setDesmobilizarOpen(false)
        }}
      />
    )
  }

  if (feriasOpen) {
    return (
      <FeriasConfirmDialog
        placa={placa}
        saving={saving}
        onCancel={() => setFeriasOpen(false)}
        onConfirm={() => {
          setFeriasOpen(false)
          setPendingMotivo({ motivo: 'FÉRIAS' })
        }}
      />
    )
  }

  if (naoRodouOpen) {
    return (
      <SubMotivoDropdown
        titulo="Motivo — Não rodou"
        opcoes={NAO_RODOU_SUBS}
        saving={saving}
        onCancel={() => setNaoRodouOpen(false)}
        onConfirm={(obs) => {
          setNaoRodouOpen(false)
          setPendingMotivo({ motivo: 'NÃO RODOU', obs })
        }}
      />
    )
  }

  if (oficinaOpen) {
    return (
      <SubMotivoDropdown
        titulo="Tipo de serviço — Oficina"
        opcoes={OFICINA_SUBS}
        saving={saving}
        onCancel={() => setOficinaOpen(false)}
        onConfirm={(obs) => {
          setOficinaOpen(false)
          setPendingMotivo({ motivo: 'OFICINA', obs })
        }}
      />
    )
  }

  // ── Click handler ─────────────────────────────────────────────────────────

  const handleMotivoClick = (motivo: ChecklistAusenciaMotivo) => {
    if (motivo === 'FEITO') return setPendingMotivo({ motivo: 'FEITO' })
    if (motivo === 'RESERVA') return setReservaOpen(true)
    if (motivo === 'DESMOBILIZADO') return setDesmobilizarOpen(true)
    if (motivo === 'FÉRIAS') return setFeriasOpen(true)
    if (motivo === 'NÃO RODOU') return setNaoRodouOpen(true)
    if (motivo === 'OFICINA') return setOficinaOpen(true)
  }

  // ── Estado: já justificado ────────────────────────────────────────────────

  if (motivoAtual) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {kmChip}
        <span
          className={`inline-flex max-w-full flex-wrap items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ring-1 ${
            motivoAtual === 'DESMOBILIZADO'
              ? 'bg-rose-100 text-rose-800 ring-rose-200/80 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900/60'
              : motivoAtual === 'FÉRIAS'
                ? 'bg-sky-100 text-sky-800 ring-sky-200/80 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-900/60'
                : 'bg-amber-100 text-amber-800 ring-amber-200/80 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/60'
          }`}
          title={
            motivoAtual === 'RESERVA' && placaReservaAtual
              ? `Justificado: ${motivoAtual} · reserva ${formatPlaca(placaReservaAtual)}`
              : `Justificado: ${motivoAtual}`
          }
        >
          <MessageSquareWarning size={11} aria-hidden />
          {motivoAtual}
          {obsAtual ? (
            <span className="font-bold normal-case tracking-normal opacity-80">· {obsAtual}</span>
          ) : null}
          {motivoAtual === 'RESERVA' && placaReservaAtual ? (
            <span className="font-bold normal-case tracking-normal text-amber-900/90 dark:text-amber-100">
              · {formatPlaca(placaReservaAtual)}
            </span>
          ) : null}
        </span>
        {motivoAtual === 'RESERVA' ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => setReservaOpen(true)}
            className={`${btnBase} border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-amber-800 dark:hover:bg-amber-950/40 dark:hover:text-amber-200`}
            title={`Alterar placa reserva de ${placa}`}
          >
            Trocar reserva
          </button>
        ) : null}
        {CHECKLIST_AUSENCIA_MOTIVOS.filter((m) => m !== motivoAtual).map((motivo) => (
          <button
            key={motivo}
            type="button"
            disabled={saving}
            onClick={() => handleMotivoClick(motivo)}
            className={motivoBtnClass(motivo, btnBase, 'alt')}
            title={`Alterar justificativa de ${placa} para ${motivo}`}
          >
            {motivo}
          </button>
        ))}
      </div>
    )
  }

  // ── Estado: sem justificativa ─────────────────────────────────────────────

  return (
    <div
      className="flex flex-wrap items-center justify-end gap-1.5"
      role="group"
      aria-label={`Justificar ausência do checklist — ${placa}`}
    >
      {kmChip}
      {CHECKLIST_AUSENCIA_MOTIVOS.map((motivo) => (
        <button
          key={motivo}
          type="button"
          disabled={saving}
          onClick={() => handleMotivoClick(motivo)}
          className={motivoBtnClass(motivo, btnBase, 'default')}
          title={
            motivo === 'FEITO'
              ? `Marcar ${placa} como FEITO — move para realizados (checklist feito, mas não chegou ao sistema)`
              : motivo === 'RESERVA'
                ? `Justificar ${placa} como reserva — informe a placa do veículo reserva`
                : motivo === 'DESMOBILIZADO'
                  ? `Desmobilizar ${placa} — remove da frota ativa`
                  : motivo === 'FÉRIAS'
                    ? `Marcar ${placa} como FÉRIAS — justificado indefinidamente até revertido`
                    : motivo === 'NÃO RODOU'
                      ? `Justificar ${placa} como Não rodou — escolha o motivo`
                      : motivo === 'OFICINA'
                        ? `Justificar ${placa} como Oficina — escolha o tipo de serviço`
                        : `Justificar ${placa} como ${motivo}`
          }
        >
          {saving ? '…' : motivo}
        </button>
      ))}
    </div>
  )
}
