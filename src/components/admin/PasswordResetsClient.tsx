'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Loader2, CheckCircle2, Clock } from 'lucide-react'
import { csrfFetch } from '@/lib/csrf-client'

interface ResetRequest {
  id: string
  email: string
  user_name: string | null
  status: 'PENDING' | 'FULFILLED' | 'CANCELLED'
  requested_at: string
  fulfilled_at: string | null
}

interface Props {
  requests: ResetRequest[]
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-MY', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function PasswordResetsClient({ requests: initial }: Props) {
  const [requests, setRequests] = useState(initial)
  const [fulfillingId, setFulfillingId] = useState<string | null>(null)

  async function fulfill(id: string) {
    setFulfillingId(id)
    try {
      const res = await csrfFetch(`/api/admin/password-resets/${id}/fulfill`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to fulfill request')
        return
      }
      setRequests(prev => prev.map(r => r.id === id
        ? { ...r, status: 'FULFILLED', fulfilled_at: new Date().toISOString() }
        : r
      ))
      toast.success('Temp password sent via email')
    } catch {
      toast.error('Connection error')
    } finally {
      setFulfillingId(null)
    }
  }

  const pending = requests.filter(r => r.status === 'PENDING')
  const fulfilled = requests.filter(r => r.status !== 'PENDING')

  function renderTable(rows: ResetRequest[], showFulfillBtn: boolean) {
    if (rows.length === 0) return null
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">Requested</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
              {showFulfillBtn && (
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Action</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 min-w-[140px]">
                  <div className="font-medium text-slate-900">{r.user_name ?? '—'}</div>
                  <div className="text-xs text-slate-400">{r.email}</div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{fmtDateTime(r.requested_at)}</td>
                <td className="px-4 py-3 min-w-[120px]">
                  {r.status === 'PENDING' ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-amber-600">
                      <Clock className="h-3.5 w-3.5" /> Pending
                    </span>
                  ) : (
                    <span className="flex flex-col gap-0.5 text-xs font-semibold text-emerald-600">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Fulfilled
                      </span>
                      {r.fulfilled_at && (
                        <span className="font-normal text-slate-400">{fmtDateTime(r.fulfilled_at)}</span>
                      )}
                    </span>
                  )}
                </td>
                {showFulfillBtn && (
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={fulfillingId === r.id}
                      onClick={() => fulfill(r.id)}
                      className="flex items-center gap-1.5 rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity whitespace-nowrap"
                    >
                      {fulfillingId === r.id && <Loader2 className="h-3 w-3 animate-spin" />}
                      Send Temp Password
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Pending</h2>
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          {pending.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">No pending requests</p>
          ) : renderTable(pending, true)}
        </div>
      </div>

      {fulfilled.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Fulfilled</h2>
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            {renderTable(fulfilled, false)}
          </div>
        </div>
      )}
    </div>
  )
}
