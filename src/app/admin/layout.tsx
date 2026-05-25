import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase'
import AdminShell from '@/components/admin/AdminShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') redirect('/login')

  const { count } = await supabaseAdmin
    .from('password_reset_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'PENDING')

  return <AdminShell user={session} pendingResets={count ?? 0}>{children}</AdminShell>
}
