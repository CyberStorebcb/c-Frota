import { Construction, FileText } from 'lucide-react'

export function OsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600 text-white shadow-soft dark:bg-brand-700">
          <FileText size={20} aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">OS</h1>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Ordens de serviço
          </p>
        </div>
      </header>

      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center shadow-sm dark:border-slate-700 dark:bg-slate-950">
        <div className="relative mb-6 grid h-20 w-20 place-items-center rounded-3xl bg-slate-100 dark:bg-slate-900">
          <Construction size={36} className="text-slate-400 dark:text-slate-500" aria-hidden />
          <span className="absolute -right-1 -top-1 rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-950 ring-2 ring-white dark:ring-slate-950">
            Novo
          </span>
        </div>
        <p className="text-lg font-black uppercase tracking-[0.2em] text-slate-700 dark:text-slate-200">
          Em andamento
        </p>
        <p className="mt-3 max-w-sm text-sm font-semibold leading-relaxed text-slate-500 dark:text-slate-400">
          Esta área está sendo preparada. Em breve você poderá consultar e gerenciar ordens de serviço por aqui.
        </p>
      </div>
    </div>
  )
}
