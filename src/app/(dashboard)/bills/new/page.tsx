import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'

export default async function NewBillPage() {
  const user = await getSession()
  if (!user) redirect('/login')

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">New Bill</h1>
        <p className="mt-1 text-sm text-slate-500">Create a bill and share payment links</p>
      </div>
      <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center">
        <p className="text-sm text-slate-400">Bill creation form coming soon.</p>
      </div>
    </div>
  )
}
