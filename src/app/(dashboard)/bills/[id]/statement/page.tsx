import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { getBillById } from '@/lib/splithold-db'
import StatementActions from '@/components/bills/StatementActions'

function fmtRm(cents: number) {
  return `RM ${(cents / 100).toFixed(2)}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-MY', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function StatementPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getSession()
  if (!user) redirect('/login')

  const { id } = await params
  const bill = await getBillById(id, user.id)
  if (!bill) redirect('/bills')

  const confirmedParts = bill.participants.filter(p => p.status === 'CONFIRMED')
  const pendingParts = bill.participants.filter(p => p.status === 'PENDING')
  const confirmedCents = confirmedParts.reduce((s, p) => s + p.amount_cents, 0)
  const remainingCents = bill.total_amount_cents - confirmedCents
  const pct = bill.participants.length > 0
    ? Math.round((confirmedParts.length / bill.participants.length) * 100)
    : 0
  const generatedAt = new Date().toLocaleString('en-MY', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <>
      <StatementActions />

      <main className="min-h-screen bg-white p-8 max-w-3xl mx-auto print:p-0 print:max-w-full">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-brand-primary pb-6 mb-6">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-brand-primary uppercase">SplitHold</p>
            <h1 className="mt-1 text-3xl font-extrabold text-slate-900">Penyata Bayaran</h1>
            <p className="mt-1 text-sm text-slate-500">Payment Statement</p>
          </div>
          <div className="text-right text-sm text-slate-500 space-y-0.5">
            <p className="font-semibold text-slate-800">{bill.title}</p>
            <p>Due: {formatDate(bill.due_date)}</p>
            <p>Generated: {generatedAt}</p>
            <p>
              Status:{' '}
              <span className={bill.status === 'ACTIVE' ? 'text-emerald-600 font-semibold' : 'text-slate-500'}>
                {bill.status}
              </span>
            </p>
          </div>
        </div>

        {/* Bill description */}
        {bill.description && (
          <p className="mb-6 text-sm text-slate-500 italic">{bill.description}</p>
        )}

        {/* Bank account */}
        {bill.bank_name && bill.bank_account_number && bill.bank_account_name && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Bank Transfer Details</p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><p className="text-xs text-slate-400">Bank</p><p className="font-medium">{bill.bank_name}</p></div>
              <div><p className="text-xs text-slate-400">Account No.</p><p className="font-mono font-semibold">{bill.bank_account_number}</p></div>
              <div><p className="text-xs text-slate-400">Account Name</p><p className="font-medium">{bill.bank_account_name}</p></div>
            </div>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total Bill', value: fmtRm(bill.total_amount_cents), color: 'text-slate-900' },
            { label: 'Collected', value: fmtRm(confirmedCents), color: 'text-emerald-700' },
            { label: 'Remaining', value: fmtRm(remainingCents), color: 'text-amber-700' },
            { label: 'Progress', value: `${pct}%`, color: 'text-brand-primary' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-400 mb-1">{label}</p>
              <p className={`text-lg font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Participants table */}
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">No.</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Confirmed At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bill.participants.map((p, i) => (
              <tr key={p.id} className={p.status === 'CONFIRMED' ? 'bg-white' : 'bg-slate-50/50'}>
                <td className="py-3 px-4 text-slate-400">{i + 1}</td>
                <td className="py-3 px-4 font-medium text-slate-900">{p.name}</td>
                <td className="py-3 px-4 text-slate-500">{p.email ?? '—'}</td>
                <td className="py-3 px-4 text-right font-semibold text-slate-800">{fmtRm(p.amount_cents)}</td>
                <td className="py-3 px-4 text-center">
                  {p.status === 'CONFIRMED' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      ✓ Confirmed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      ○ Pending
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-slate-400 text-xs">
                  {p.confirmed_at ? formatDateTime(p.confirmed_at) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          {/* Totals row */}
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50">
              <td colSpan={3} className="py-3 px-4 text-sm font-semibold text-slate-700">
                {confirmedParts.length} confirmed · {pendingParts.length} pending
              </td>
              <td className="py-3 px-4 text-right font-bold text-slate-900">{fmtRm(bill.total_amount_cents)}</td>
              <td colSpan={2} className="py-3 px-4 text-xs text-slate-400">
                {fmtRm(confirmedCents)} collected · {fmtRm(remainingCents)} remaining
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Footer */}
        <div className="mt-10 border-t border-slate-100 pt-6 text-center text-xs text-slate-400">
          Dijana oleh SplitHold · splithold.vercel.app · {generatedAt}
        </div>
      </main>

      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </>
  )
}
