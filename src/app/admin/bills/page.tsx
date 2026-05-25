import { supabaseAdmin } from '@/lib/supabase'

function fmtRm(cents: number) {
  return `RM ${(cents / 100).toFixed(2)}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function AdminBillsPage() {
  const { data: bills } = await supabaseAdmin
    .from('bills')
    .select(`
      id, title, status, total_amount_cents, amount_per_pax, created_at,
      organizer:users!bills_organizer_id_fkey(name, email),
      participants:bill_participants(id, status)
    `)
    .order('created_at', { ascending: false })

  const rows = (bills ?? []).map((b: any) => ({
    id: b.id,
    title: b.title,
    status: b.status,
    total_amount_cents: b.total_amount_cents,
    amount_per_pax: b.amount_per_pax,
    created_at: b.created_at,
    organizer_name: b.organizer?.name ?? '—',
    organizer_email: b.organizer?.email ?? '',
    total_participants: b.participants?.length ?? 0,
    confirmed: b.participants?.filter((p: any) => p.status === 'CONFIRMED').length ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">All Bills</h1>
        <p className="mt-1 text-sm text-slate-500">{rows.length} bills on the platform</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">No bills yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Organizer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Participants</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(row => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900 max-w-[200px] truncate">{row.title}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <div>{row.organizer_name}</div>
                    <div className="text-xs text-slate-400">{row.organizer_email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                      row.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {row.confirmed}/{row.total_participants}
                    <span className="ml-1 text-xs text-slate-400">confirmed</span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {row.amount_per_pax
                      ? `${fmtRm(row.amount_per_pax)}/pax`
                      : fmtRm(row.total_amount_cents)}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{fmtDate(row.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
