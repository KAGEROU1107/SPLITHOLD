'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Loader2, Users, CalendarDays, Banknote } from 'lucide-react'
import type { PublicBillInfo } from '@/lib/splithold-db'

interface Props {
  bill: PublicBillInfo
  joinToken: string
  slotsRemaining: number | null
}

function fmtRm(cents: number) {
  return `RM ${(cents / 100).toFixed(2)}`
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function JoinFormClient({ bill, joinToken, slotsRemaining }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  const isFull = slotsRemaining !== null && slotsRemaining <= 0
  const isClosed = !bill.registration_open || bill.status === 'CLOSED'

  const inputCls = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Name is required'); return }
    if (!phone.trim()) { toast.error('Phone number is required'); return }

    setLoading(true)
    try {
      const res = await fetch(`/api/join/${joinToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), email: email.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Registration failed')
        return
      }
      router.push(`/join/${joinToken}/success?token=${data.payment_token}`)
    } catch {
      toast.error('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-mist via-white to-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-4">
        {/* Bill info card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <div>
            <p className="text-xs font-bold tracking-[0.15em] text-brand-primary uppercase">SplitHold</p>
            <h1 className="mt-1 text-xl font-bold text-slate-900">{bill.title}</h1>
            {bill.description && <p className="mt-1 text-sm text-slate-500">{bill.description}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="rounded-xl bg-brand-mist/60 p-3 text-center">
              <Banknote className="h-4 w-4 text-brand-primary mx-auto mb-1" />
              <p className="text-xs text-slate-500">Per person</p>
              <p className="text-sm font-bold text-brand-primary">{fmtRm(bill.amount_per_pax)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-center">
              <CalendarDays className="h-4 w-4 text-slate-400 mx-auto mb-1" />
              <p className="text-xs text-slate-500">Due date</p>
              <p className="text-xs font-semibold text-slate-700">{formatDate(bill.due_date)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-center">
              <Users className="h-4 w-4 text-slate-400 mx-auto mb-1" />
              <p className="text-xs text-slate-500">Slots</p>
              <p className="text-xs font-semibold text-slate-700">
                {bill.max_participants
                  ? `${bill.slot_count}/${bill.max_participants}`
                  : `${bill.slot_count} joined`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Closed / full states */}
        {(isClosed || isFull) ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-center space-y-2">
            <p className="text-3xl">{isFull ? '🚫' : '🔒'}</p>
            <p className="font-semibold text-slate-800">
              {isFull ? 'Registration is full' : 'Registration is closed'}
            </p>
            <p className="text-sm text-slate-500">
              {isFull
                ? `All ${bill.max_participants} slots have been taken.`
                : 'The organizer has closed registration for this bill.'}
            </p>
          </div>
        ) : (
          /* Join form */
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Register to join</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Full Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  maxLength={100}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Phone Number <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. 012-3456789"
                  maxLength={20}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email <span className="text-slate-400 font-normal">(optional)</span></label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputCls}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'Registering...' : `Join · ${fmtRm(bill.amount_per_pax)}`}
              </button>
            </form>
          </div>
        )}

        <p className="text-center text-xs text-slate-400">Powered by SplitHold</p>
      </div>
    </main>
  )
}
