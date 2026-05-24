import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getBillsByOrganizer } from '@/lib/splithold-db'
import StatCard from '@/components/ui/StatCard'
import { Receipt, CheckCircle2, Clock, PlusCircle } from 'lucide-react'

function fmtRm(cents: number) {
  return `RM ${(cents / 100).toFixed(2)}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function DashboardPage() {
  const user = await getSession()
  if (!user) redirect('/login')

  const bills = await getBillsByOrganizer(user.id)

  const activeBills = bills.filter(b => b.status === 'ACTIVE')
  const totalParticipants = bills.reduce((sum, b) => sum + b.participant_count, 0)
  const totalConfirmed = bills.reduce((sum, b) => sum + b.confirmed_count, 0)
  const totalCollectedCents = bills.reduce((sum, b) => sum + b.confirmed_amount_cents, 0)
  const totalAmountCents = bills.reduce((sum, b) => sum + b.total_amount_cents, 0)
  const totalRemainingCents = totalAmountCents - totalCollectedCents
  const overallPct = totalAmountCents > 0 ? Math.round((totalCollectedCents / totalAmountCents) * 100) : 0
  const recentBills = bills.slice(0, 5)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Welcome back, {user.name}</p>
        </div>
        <Link
          href="/bills/new"
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90 transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          New Bill
        </Link>
      </div>

      {/* Hero collection summary — only shown when there's data */}
      {bills.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-brand-primary via-violet-600 to-purple-700 p-6 text-white shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white/70">Total Collected</p>
              <p className="mt-1 text-3xl font-extrabold tracking-tight">{fmtRm(totalCollectedCents)}</p>
              <p className="mt-1 text-sm text-white/60">of {fmtRm(totalAmountCents)} across all bills</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-4xl font-extrabold tabular-nums">{overallPct}<span className="text-2xl font-semibold">%</span></p>
              <p className="mt-1 text-sm text-white/60">collected</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-5 h-2 rounded-full bg-white/20">
            <div
              className="h-2 rounded-full bg-white transition-all duration-700"
              style={{ width: `${overallPct}%` }}
            />
          </div>

          {/* Collected vs Remaining row */}
          <div className="mt-3 flex justify-between text-xs text-white/70">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-white/90" />
              {fmtRm(totalCollectedCents)} collected
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-white/30" />
              {fmtRm(totalRemainingCents)} remaining
            </span>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Active Bills" value={activeBills.length} icon={Receipt} />
        <StatCard title="Confirmed" value={totalConfirmed} subtitle={`of ${totalParticipants} total`} icon={CheckCircle2} />
        <StatCard
          title="Pending"
          value={totalParticipants - totalConfirmed}
          icon={Clock}
          variant={totalParticipants - totalConfirmed > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Bills list */}
      {bills.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <Receipt className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-600">No bills yet</p>
          <p className="mt-1 text-xs text-slate-400">Create your first bill and share payment links</p>
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
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Recent Bills</h2>
          {recentBills.map(bill => {
            const pct = bill.participant_count > 0 ? Math.round((bill.confirmed_count / bill.participant_count) * 100) : 0
            const remaining = bill.total_amount_cents - bill.confirmed_amount_cents
            return (
              <Link
                key={bill.id}
                href={`/bills/${bill.id}`}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-brand-primary/40 hover:shadow-md transition-all"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">{bill.title}</p>
                  <p className="mt-0.5 text-xs text-slate-400">Due {formatDate(bill.due_date)} · {fmtRm(bill.total_amount_cents)}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="font-medium text-emerald-600">{fmtRm(bill.confirmed_amount_cents)} collected</span>
                    {remaining > 0 && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="text-amber-600">{fmtRm(remaining)} left</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="ml-4 flex flex-col items-end gap-1.5 shrink-0">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${bill.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {bill.status}
                  </span>
                  <span className="text-xs text-slate-400">{bill.confirmed_count}/{bill.participant_count} paid · {pct}%</span>
                </div>
              </Link>
            )
          })}
          {bills.length > 5 && (
            <Link href="/bills" className="block text-center text-xs text-brand-primary hover:underline pt-2">
              View all {bills.length} bills
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
