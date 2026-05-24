import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getBillsByOrganizer } from '@/lib/splithold-db'
import { PlusCircle, Receipt } from 'lucide-react'

function fmtRm(cents: number) {
  return `RM ${(cents / 100).toFixed(2)}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function BillsPage() {
  const user = await getSession()
  if (!user) redirect('/login')

  const bills = await getBillsByOrganizer(user.id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Bills</h1>
          <p className="mt-1 text-sm text-slate-500">All bills you&apos;ve created</p>
        </div>
        <Link
          href="/bills/new"
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90 transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          New Bill
        </Link>
      </div>

      {bills.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <Receipt className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-600">No bills yet</p>
          <p className="mt-1 text-xs text-slate-400">Create a bill and share payment links with your group</p>
          <Link
            href="/bills/new"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            Create bill
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bills.map(bill => {
            const pct = bill.participant_count > 0 ? Math.round((bill.confirmed_count / bill.participant_count) * 100) : 0
            const remainingCents = bill.total_amount_cents - bill.confirmed_amount_cents
            const allPaid = bill.confirmed_count === bill.participant_count && bill.participant_count > 0
            return (
              <Link
                key={bill.id}
                href={`/bills/${bill.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-brand-primary/40 hover:shadow-md transition-all"
              >
                {/* Top row: title + status */}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{bill.title}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Due {formatDate(bill.due_date)} · {fmtRm(bill.total_amount_cents)} total
                    </p>
                  </div>
                  <span className={`shrink-0 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${bill.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {bill.status}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{bill.confirmed_count} of {bill.participant_count} confirmed</span>
                    <span className="font-medium text-brand-primary">{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${allPaid ? 'bg-emerald-500' : 'bg-brand-primary'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* RM collected / remaining */}
                <div className="mt-3 flex items-center gap-3 text-xs">
                  <span className={`font-semibold ${allPaid ? 'text-emerald-600' : 'text-slate-700'}`}>
                    {fmtRm(bill.confirmed_amount_cents)} collected
                  </span>
                  {remainingCents > 0 && (
                    <>
                      <span className="text-slate-200">|</span>
                      <span className="text-amber-600 font-medium">{fmtRm(remainingCents)} remaining</span>
                    </>
                  )}
                  {allPaid && (
                    <span className="ml-auto text-emerald-600 font-semibold">All paid ✓</span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
