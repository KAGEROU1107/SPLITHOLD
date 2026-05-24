'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Copy, CheckCircle2, Clock, ChevronLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import type { BillWithParticipants } from '@/lib/splithold-db'

interface Props {
  bill: BillWithParticipants
  appUrl: string
}

function fmtRm(cents: number) {
  return `RM ${(cents / 100).toFixed(2)}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function BillDetailClient({ bill: initialBill, appUrl }: Props) {
  const [bill, setBill] = useState(initialBill)
  const [togglingStatus, setTogglingStatus] = useState(false)

  const confirmed = bill.participants.filter(p => p.status === 'CONFIRMED').length
  const total = bill.participants.length
  const pct = total > 0 ? Math.round((confirmed / total) * 100) : 0
  const confirmedCents = bill.participants
    .filter(p => p.status === 'CONFIRMED')
    .reduce((s, p) => s + p.amount_cents, 0)
  const remainingCents = bill.total_amount_cents - confirmedCents

  function copyLink(token: string) {
    const url = `${appUrl}/pay/${token}`
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Link copied!')
    }).catch(() => {
      toast.error('Could not copy — try manually')
    })
  }

  async function toggleStatus() {
    const newStatus = bill.status === 'ACTIVE' ? 'CLOSED' : 'ACTIVE'
    setTogglingStatus(true)
    try {
      const res = await fetch(`/api/bills/${bill.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        setBill(prev => ({ ...prev, status: newStatus }))
        toast.success(`Bill ${newStatus === 'CLOSED' ? 'closed' : 're-opened'}`)
      } else {
        toast.error('Failed to update status')
      }
    } catch {
      toast.error('Connection error')
    } finally {
      setTogglingStatus(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start gap-4">
        <Link href="/bills" className="mt-1 text-slate-400 hover:text-slate-600 transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 truncate">{bill.title}</h1>
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${bill.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              {bill.status}
            </span>
          </div>
          {bill.description && <p className="mt-1 text-sm text-slate-500">{bill.description}</p>}
          <p className="mt-1 text-xs text-slate-400">Due {formatDate(bill.due_date)} · {fmtRm(bill.total_amount_cents)} total</p>
        </div>
      </div>

      {/* Progress */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <div className="flex justify-between text-sm">
          <span className="font-medium text-slate-700">{confirmed} of {total} confirmed</span>
          <span className="font-semibold text-brand-primary">{pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${confirmed === total && total > 0 ? 'bg-emerald-500' : 'bg-brand-primary'}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* RM breakdown */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="rounded-xl bg-emerald-50 px-4 py-3">
            <p className="text-xs text-emerald-600 font-medium">Collected</p>
            <p className="mt-0.5 text-lg font-bold text-emerald-700">
              RM {(confirmedCents / 100).toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl bg-amber-50 px-4 py-3">
            <p className="text-xs text-amber-600 font-medium">Remaining</p>
            <p className={`mt-0.5 text-lg font-bold ${remainingCents > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
              RM {(remainingCents / 100).toFixed(2)}
            </p>
          </div>
        </div>

        {confirmed === total && total > 0 && (
          <p className="text-xs text-emerald-600 font-semibold">All payments confirmed!</p>
        )}
      </div>

      {/* Participants */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Participants</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {bill.participants.map(p => (
            <div key={p.id} className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{p.name}</p>
                {p.email && <p className="text-xs text-slate-400 truncate">{p.email}</p>}
                <p className="text-xs text-slate-500 mt-0.5">{fmtRm(p.amount_cents)}</p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {p.status === 'CONFIRMED' ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Confirmed
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
                    <Clock className="h-3.5 w-3.5" />
                    Pending
                  </span>
                )}

                {bill.status === 'ACTIVE' && p.status === 'PENDING' && (
                  <button
                    type="button"
                    onClick={() => copyLink(p.payment_token)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:border-brand-primary/40 hover:text-brand-primary transition-colors"
                  >
                    <Copy className="h-3 w-3" />
                    Copy link
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={toggleStatus}
          disabled={togglingStatus}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
            bill.status === 'ACTIVE'
              ? 'border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-600'
              : 'border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-600'
          }`}
        >
          {togglingStatus && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {bill.status === 'ACTIVE' ? 'Close Bill' : 'Re-open Bill'}
        </button>
      </div>
    </div>
  )
}
