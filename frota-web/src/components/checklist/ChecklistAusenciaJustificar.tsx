import { useState } from 'react'
import { MessageSquareWarning } from 'lucide-react'
import {
  CHECKLIST_AUSENCIA_MOTIVOS,
  type ChecklistAusenciaMotivo,
} from '../../checklists/checklistAusenciaJustificativa'
import { formatPlaca, normalizePlaca } from '../../frota/vehicleRegistry'

type Props = {
  placa: string
  motivoAtual?: ChecklistAusenciaMotivo | null
  placaReservaAtual?: string | null
  saving?: boolean
  onSelect: (motivo: ChecklistAusenciaMotivo, placaReserva?: string) => void
}

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
            if (e.key === 'Enter') {
              e.preventDefault()
              confirmar()
            }
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

function motivoClickHandler(
  motivo: ChecklistAusenciaMotivo,
  abrirReserva: () => void,
  abrirDesmobilizar: () => void,
  onSelect: (motivo: ChecklistAusenciaMotivo) => void,
) {
  if (motivo === 'RESERVA') return abrirReserva()
  if (motivo === 'DESMOBILIZADO') return abrirDesmobilizar()
  return onSelect(motivo)
}

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
  return variant === 'default'
    ? `${base} border-amber-300/70 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-100 dark:hover:bg-amber-950/50`
    : `${base} border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-amber-800 dark:hover:bg-amber-950/40 dark:hover:text-amber-200`
}

export function ChecklistAusenciaJustificar({
  placa,
  motivoAtual,
  placaReservaAtual,
  saving,
  onSelect,
}: Props) {
  const [reservaOpen, setReservaOpen] = useState(false)
  const [desmobilizarOpen, setDesmobilizarOpen] = useState(false)
  const btnBase =
    'rounded-lg border px-2 py-1.5 text-[10px] font-black uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-50'

  const abrirReserva = () => setReservaOpen(true)
  const fecharReserva = () => setReservaOpen(false)
  const abrirDesmobilizar = () => setDesmobilizarOpen(true)
  const fecharDesmobilizar = () => setDesmobilizarOpen(false)

  if (reservaOpen) {
    return (
      <ReservaPlacaForm
        placaOriginal={placa}
        initialPlacaReserva={motivoAtual === 'RESERVA' ? placaReservaAtual ?? '' : ''}
        saving={saving}
        onCancel={fecharReserva}
        onConfirm={(placaReserva) => {
          onSelect('RESERVA', placaReserva)
          fecharReserva()
        }}
      />
    )
  }

  if (desmobilizarOpen) {
    return (
      <DesmobilizarConfirmDialog
        placa={placa}
        saving={saving}
        onCancel={fecharDesmobilizar}
        onConfirm={() => {
          onSelect('DESMOBILIZADO')
          fecharDesmobilizar()
        }}
      />
    )
  }

  if (motivoAtual) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <span
          className={`inline-flex max-w-full flex-wrap items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ring-1 ${
            motivoAtual === 'DESMOBILIZADO'
              ? 'bg-rose-100 text-rose-800 ring-rose-200/80 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900/60'
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
            onClick={abrirReserva}
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
            onClick={() => motivoClickHandler(motivo, abrirReserva, abrirDesmobilizar, onSelect)}
            className={motivoBtnClass(motivo, btnBase, 'alt')}
            title={`Alterar justificativa de ${placa} para ${motivo}`}
          >
            {motivo}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div
      className="flex flex-wrap items-center justify-end gap-1.5"
      role="group"
      aria-label={`Justificar ausência do checklist — ${placa}`}
    >
      {CHECKLIST_AUSENCIA_MOTIVOS.map((motivo) => (
        <button
          key={motivo}
          type="button"
          disabled={saving}
          onClick={() => motivoClickHandler(motivo, abrirReserva, abrirDesmobilizar, onSelect)}
          className={motivoBtnClass(motivo, btnBase, 'default')}
          title={
            motivo === 'FEITO'
              ? `Marcar ${placa} como FEITO — move para realizados (checklist feito, mas não chegou ao sistema)`
              : motivo === 'RESERVA'
                ? `Justificar ${placa} como reserva — informe a placa do veículo reserva`
                : motivo === 'DESMOBILIZADO'
                  ? `Desmobilizar ${placa} — remove da frota ativa`
                  : `Justificar ${placa} como ${motivo}`
          }
        >
          {saving ? '…' : motivo}
        </button>
      ))}
    </div>
  )
}
