'use client'

export default function StatementActions() {
  return (
    <div className="print:hidden fixed top-4 right-4 z-50 flex gap-2">
      <button
        onClick={() => window.print()}
        className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-brand-primary/90 transition-colors"
      >
        Print / Save PDF
      </button>
      <button
        onClick={() => window.history.back()}
        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
      >
        Close
      </button>
    </div>
  )
}
