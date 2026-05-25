import { supabaseAdmin } from '@/lib/supabase'
import PasswordResetsClient from '@/components/admin/PasswordResetsClient'

export default async function AdminPasswordResetsPage() {
  const { data: requests } = await supabaseAdmin
    .from('password_reset_requests')
    .select('id, email, status, requested_at, fulfilled_at, users!password_reset_requests_user_id_fkey(name)')
    .order('requested_at', { ascending: false })

  const normalized = (requests ?? []).map((r: any) => ({
    id: r.id,
    email: r.email,
    status: r.status,
    requested_at: r.requested_at,
    fulfilled_at: r.fulfilled_at,
    user_name: r.users?.name ?? null,
  }))

  const pending = normalized.filter(r => r.status === 'PENDING').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Password Resets</h1>
        <p className="mt-1 text-sm text-slate-500">
          {pending > 0 ? `${pending} pending request${pending > 1 ? 's' : ''}` : 'No pending requests'}
        </p>
      </div>
      <PasswordResetsClient requests={normalized} />
    </div>
  )
}
