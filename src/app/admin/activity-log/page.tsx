import { supabaseAdmin } from '@/lib/supabase'

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-MY', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtAction(action: string) {
  return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default async function ActivityLogPage() {
  const { data: logs } = await supabaseAdmin
    .from('activity_logs')
    .select('id, actor_name, action, entity_type, entity_id, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  const rows = logs ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Activity Log</h1>
        <p className="mt-1 text-sm text-slate-500">Last {rows.length} events</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">No activity yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Actor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Entity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row: any) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">{fmtDateTime(row.created_at)}</td>
                  <td className="px-4 py-3 text-slate-700">{row.actor_name ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{fmtAction(row.action)}</td>
                  <td className="px-4 py-3 text-slate-500 capitalize">{row.entity_type ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 max-w-[200px]">
                    {row.metadata
                      ? Object.entries(row.metadata as Record<string, unknown>)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(', ')
                      : row.entity_id ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
