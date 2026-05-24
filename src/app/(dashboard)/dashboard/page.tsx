import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const user = await getSession()
  if (!user) redirect('/login')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Welcome back, {user.name}</p>
      </div>
      <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center">
        <p className="text-sm text-slate-400">Your bills will appear here.</p>
        <a
          href="/bills/new"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90 transition-colors"
        >
          Create your first bill
        </a>
      </div>
    </div>
  )
}
