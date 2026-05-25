import { supabaseAdmin } from '@/lib/supabase'
import { Users, Receipt, KeyRound, Activity } from 'lucide-react'

function StatCard({ title, value, icon: Icon, variant = 'default' }: {
  title: string
  value: number | string
  icon: React.ElementType
  variant?: 'default' | 'warning' | 'danger'
}) {
  const colors = {
    default: 'bg-white border-slate-200',
    warning: 'bg-amber-50 border-amber-200',
    danger: 'bg-red-50 border-red-200',
  }
  const iconColors = {
    default: 'text-brand-primary bg-brand-primary/10',
    warning: 'text-amber-600 bg-amber-100',
    danger: 'text-red-600 bg-red-100',
  }
  return (
    <div className={`rounded-xl border p-5 ${colors[variant]}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <span className={`rounded-lg p-2 ${iconColors[variant]}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  )
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-MY', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function AdminDashboardPage() {
  const [usersRes, billsRes, pendingResetsRes, recentActivityRes] = await Promise.all([
    supabaseAdmin.from('users').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('bills').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('password_reset_requests').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
    supabaseAdmin.from('activity_logs').select('id, actor_name, action, entity_type, created_at').order('created_at', { ascending: false }).limit(10),
  ])

  const totalUsers = usersRes.count ?? 0
  const totalBills = billsRes.count ?? 0
  const pendingResets = pendingResetsRes.count ?? 0
  const recentActivity = recentActivityRes.data ?? []

  function fmtAction(action: string) {
    return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Platform overview</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Users" value={totalUsers} icon={Users} />
        <StatCard title="Total Bills" value={totalBills} icon={Receipt} />
        <StatCard title="Pending Resets" value={pendingResets} icon={KeyRound} variant={pendingResets > 0 ? 'warning' : 'default'} />
        <StatCard title="Activity Log" value="Live" icon={Activity} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Recent Activity</h2>
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          {recentActivity.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">No activity yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Actor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Entity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentActivity.map((row: any) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">{fmtDateTime(row.created_at)}</td>
                    <td className="px-4 py-3 text-slate-700">{row.actor_name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-900 font-medium">{fmtAction(row.action)}</td>
                    <td className="px-4 py-3 text-slate-500 capitalize">{row.entity_type ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
