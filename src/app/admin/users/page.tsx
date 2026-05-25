import { supabaseAdmin } from '@/lib/supabase'
import AdminUsersClient from '@/components/admin/AdminUsersClient'

export default async function AdminUsersPage() {
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, name, email, role, is_active, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Users</h1>
        <p className="mt-1 text-sm text-slate-500">{users?.length ?? 0} organizers registered</p>
      </div>
      <AdminUsersClient users={users ?? []} />
    </div>
  )
}
