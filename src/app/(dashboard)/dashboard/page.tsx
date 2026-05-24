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
  const recentBills = bills.slice(0, 5)

  return (
    <div className="space-y-8">
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
          {recentBills.map(bill => (
            <Link
              key={bill.id}
              href={`/bills/${bill.id}`}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-brand-primary/40 hover:shadow-md transition-all"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">{bill.title}</p>
                <p className="mt-0.5 text-xs text-slate-400">Due {formatDate(bill.due_date)} · {fmtRm(bill.total_amount_cents)}</p>
              </div>
              <div className="ml-4 flex flex-col items-end gap-1.5 shrink-0">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${bill.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {bill.status}
                </span>
                <span className="text-xs text-slate-400">{bill.confirmed_count}/{bill.participant_count} paid</span>
              </div>
            </Link>
          ))}
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
