'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2, Calendar, DollarSign } from 'lucide-react'
import type { PublicParticipant } from '@/lib/splithold-db'

interface Props {
  participant: PublicParticipant
  token: string
}

function fmtRm(cents: number) {
  return `RM ${(cents / 100).toFixed(2)}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function PayConfirmClient({ participant, token }: Props) {
  const [status, setStatus] = useState<'idle' | 'confirming' | 'done' | 'error'>(
    participant.status === 'CONFIRMED' ? 'done' : 'idle'
  )
  const [errorMsg, setErrorMsg] = useState('')

  const isAlreadyConfirmed = participant.status === 'CONFIRMED'
  const isBillClosed = participant.bill.status === 'CLOSED'

  async function handleConfirm() {
    setStatus('confirming')
    try {
      const res = await fetch(`/api/pay/${token}`, { method: 'POST' })
      const data = await res.json()

      if (res.ok) {
        setStatus('done')
      } else if (data.error === 'already_confirmed') {
        setStatus('done')
      } else if (data.error === 'bill_closed') {
        setStatus('error')
        setErrorMsg('This bill has been closed. Payment confirmation is no longer accepted.')
      } else {
        setStatus('error')
        setErrorMsg('Something went wrong. Please try again.')
      }
    } catch {
      setStatus('error')
      setErrorMsg('Connection error. Please check your internet and try again.')
    }
  }

  if (status === 'done' || isAlreadyConfirmed) {
    return (
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-emerald-200 bg-white p-8 shadow-lg text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-emerald-100 p-4">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Payment Confirmed!</h1>
            <p className="mt-2 text-sm text-slate-500">
              Your payment of <span className="font-semibold text-slate-700">{fmtRm(participant.amount_cents)}</span> for <span className="font-semibold text-slate-700">{participant.bill.title}</span> has been confirmed.
            </p>
          </div>
          <p className="text-xs text-slate-400">You can close this page.</p>
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">Powered by SplitHold</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md space-y-4">
      {/* Header */}
      <div className="text-center mb-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-brand-primary">Payment Request</span>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{participant.bill.title}</h1>
      </div>

      {/* Bill card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        {participant.bill.description && (
          <p className="text-sm text-slate-500">{participant.bill.description}</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-brand-mist p-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-brand-primary mb-1">
              <DollarSign className="h-3.5 w-3.5" />
              Your share
            </div>
            <p className="text-xl font-bold text-slate-900">{fmtRm(participant.amount_cents)}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
              <Calendar className="h-3.5 w-3.5" />
              Due date
            </div>
            <p className="text-sm font-semibold text-slate-800">{formatDate(participant.bill.due_date)}</p>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs text-slate-500">Payment for</p>
          <p className="font-semibold text-slate-900">{participant.name}</p>
        </div>

        {isBillClosed ? (
          <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-500 text-center">
            This bill has been closed. No further confirmations accepted.
          </div>
        ) : status === 'error' ? (
          <div className="space-y-3">
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 text-center">{errorMsg}</p>
            <button
              onClick={() => { setStatus('idle'); setErrorMsg('') }}
              className="w-full rounded-2xl border border-slate-200 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Try again
            </button>
          </div>
        ) : (
          <button
            onClick={handleConfirm}
            disabled={status === 'confirming'}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-brand-primary py-3.5 text-sm font-semibold text-white hover:bg-brand-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {status === 'confirming' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Confirming...
              </>
            ) : (
              "I've Paid — Confirm"
            )}
          </button>
        )}
      </div>

      <p className="text-center text-xs text-slate-400">Powered by SplitHold</p>
    </div>
  )
}
