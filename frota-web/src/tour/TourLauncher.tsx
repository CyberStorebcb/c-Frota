import { HelpCircle } from 'lucide-react'
import { useTour } from './TourContext'

/** Botão flutuante para iniciar o tour manualmente. */
export function TourLauncher() {
  const { active, start } = useTour()
  if (active) return null

  return (
    <button
      type="button"
      onClick={start}
      title="Iniciar tour guiado"
      className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-white shadow-2xl shadow-brand-500/40 transition hover:scale-110 hover:bg-brand-600"
    >
      <HelpCircle size={22} />
    </button>
  )
}
