import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PlusCircle } from 'lucide-react'

export default async function BillsPage() {
  const user = await getSession()
  if (!user) redirect('/login')

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
      <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center">
        <p className="text-sm text-slate-400">No bills yet. Create your first one!</p>
      </div>
    </div>
  )
}
