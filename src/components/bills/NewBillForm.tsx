'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Plus, Trash2, Loader2, CreditCard, ChevronDown, ChevronUp, Users, UserPlus } from 'lucide-react'
import { csrfFetch } from '@/lib/csrf-client'

interface Participant {
  name: string
  email: string
  amount_cents: number
  amountRm: string
}

function rmToCents(val: string): number {
  const parsed = parseFloat(val.replace(/[^0-9.]/g, ''))
  return isNaN(parsed) ? 0 : Math.round(parsed * 100)
}

function centsToRm(cents: number): string {
  return (cents / 100).toFixed(2)
}

const BANKS = [
  'Maybank', 'CIMB Bank', 'Public Bank', 'RHB Bank', 'Hong Leong Bank',
  'AmBank', 'Bank Islam', 'Bank Rakyat', 'OCBC Bank', 'Standard Chartered',
  'HSBC Bank', 'Alliance Bank', 'Affin Bank', 'Agrobank', 'BSN',
]

export default function NewBillForm() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [showBank, setShowBank] = useState(false)
  const [mode, setMode] = useState<'manual' | 'open'>('manual')

  // Shared fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [bankName, setBankName] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [bankAccountName, setBankAccountName] = useState('')

  // Manual mode fields
  const [totalRm, setTotalRm] = useState('')
  const [participants, setParticipants] = useState<Participant[]>([
    { name: '', email: '', amount_cents: 0, amountRm: '' },
  ])

  // Open mode fields
  const [amountPerPaxRm, setAmountPerPaxRm] = useState('')
  const [maxParticipants, setMaxParticipants] = useState('')

  const totalCents = rmToCents(totalRm)
  const sumParticipantCents = participants.reduce((s, p) => s + p.amount_cents, 0)
  const diff = totalCents - sumParticipantCents

  const amountPerPaxCents = rmToCents(amountPerPaxRm)
  const maxPax = maxParticipants ? parseInt(maxParticipants) : null
  const openTotalCents = maxPax && amountPerPaxCents ? maxPax * amountPerPaxCents : null

  function addParticipant() {
    setParticipants(prev => [...prev, { name: '', email: '', amount_cents: 0, amountRm: '' }])
  }

  function removeParticipant(i: number) {
    setParticipants(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateParticipant(i: number, field: keyof Participant, value: string) {
    setParticipants(prev => prev.map((p, idx) => {
      if (idx !== i) return p
      if (field === 'amountRm') {
        return { ...p, amountRm: value, amount_cents: rmToCents(value) }
      }
      return { ...p, [field]: value }
    }))
  }

  function splitEvenly() {
    if (totalCents <= 0 || participants.length === 0) return
    const base = Math.floor(totalCents / participants.length)
    const remainder = totalCents - base * participants.length
    setParticipants(prev => prev.map((p, i) => {
      const cents = i === 0 ? base + remainder : base
      return { ...p, amount_cents: cents, amountRm: centsToRm(cents) }
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!title.trim()) { toast.error('Title is required'); return }
    if (!dueDate) { toast.error('Due date is required'); return }

    // Bank details — all 3 must be filled if any one is filled
    const bankFilled = [bankName, bankAccountNumber, bankAccountName].filter(Boolean).length
    if (bankFilled > 0 && bankFilled < 3) {
      toast.error('Fill in all bank details or leave them all blank')
      return
    }

    if (mode === 'open') {
      if (amountPerPaxCents < 1) { toast.error('Enter a valid amount per person'); return }
      if (maxParticipants && (isNaN(parseInt(maxParticipants)) || parseInt(maxParticipants) < 1)) {
        toast.error('Max participants must be a positive number')
        return
      }
    } else {
      if (totalCents < 1) { toast.error('Enter a valid total amount'); return }
      if (participants.length === 0) { toast.error('Add at least one participant'); return }
      for (const p of participants) {
        if (!p.name.trim()) { toast.error('All participants need a name'); return }
        if (p.amount_cents < 1) { toast.error(`Enter amount for ${p.name || 'participant'}`); return }
      }
      if (Math.abs(diff) > 1) {
        toast.error(`Participant amounts (RM ${(sumParticipantCents/100).toFixed(2)}) don't match total (RM ${(totalCents/100).toFixed(2)})`)
        return
      }
    }

    setSubmitting(true)
    try {
      const body = mode === 'open'
        ? {
            title: title.trim(),
            description: description.trim() || undefined,
            due_date: dueDate,
            bank_name: bankName.trim() || undefined,
            bank_account_number: bankAccountNumber.trim() || undefined,
            bank_account_name: bankAccountName.trim() || undefined,
            open_mode: true,
            amount_per_pax_cents: amountPerPaxCents,
            max_participants: maxParticipants ? parseInt(maxParticipants) : undefined,
          }
        : {
            title: title.trim(),
            description: description.trim() || undefined,
            total_amount_cents: totalCents,
            due_date: dueDate,
            bank_name: bankName.trim() || undefined,
            bank_account_number: bankAccountNumber.trim() || undefined,
            bank_account_name: bankAccountName.trim() || undefined,
            participants: participants.map(p => ({
              name: p.name.trim(),
              email: p.email.trim() || undefined,
              amount_cents: p.amount_cents,
            })),
          }

      const res = await csrfFetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to create bill')
        return
      }

      toast.success('Bill created!')
      router.push(`/bills/${data.bill.id}`)
    } catch {
      toast.error('Connection error')
    } finally {
      setSubmitting(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const inputCls = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Mode selector */}
      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm flex gap-2">
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${mode === 'manual' ? 'bg-brand-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Users className="h-4 w-4" />
          Manual Participants
        </button>
        <button
          type="button"
          onClick={() => setMode('open')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${mode === 'open' ? 'bg-brand-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <UserPlus className="h-4 w-4" />
          Open Registration
        </button>
      </div>

      {/* Bill details */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Bill Details</h2>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Title <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Langkawi Trip, Team Dinner"
            maxLength={100}
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Optional details about this bill"
            rows={2}
            maxLength={500}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary resize-none"
          />
        </div>

        <div className={mode === 'manual' ? 'grid grid-cols-2 gap-4' : ''}>
          {mode === 'manual' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Total Amount (RM) <span className="text-red-500">*</span></label>
              <input
                type="number"
                value={totalRm}
                onChange={e => setTotalRm(e.target.value)}
                placeholder="0.00"
                min="0.01"
                step="0.01"
                className={inputCls}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Due Date <span className="text-red-500">*</span></label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              min={today}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Open registration settings */}
      {mode === 'open' && (
        <div className="rounded-2xl border border-brand-primary/20 bg-brand-mist/30 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-brand-primary" />
            <h2 className="text-sm font-semibold text-brand-primary">Open Registration Settings</h2>
          </div>
          <p className="text-xs text-slate-500">
            Share a join link so participants can register themselves. Each person gets their own personal payment link.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount per person (RM) <span className="text-red-500">*</span></label>
              <input
                type="number"
                value={amountPerPaxRm}
                onChange={e => setAmountPerPaxRm(e.target.value)}
                placeholder="0.00"
                min="0.01"
                step="0.01"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max participants</label>
              <input
                type="number"
                value={maxParticipants}
                onChange={e => setMaxParticipants(e.target.value)}
                placeholder="Unlimited"
                min="1"
                step="1"
                className={inputCls}
              />
            </div>
          </div>
          {openTotalCents !== null && (
            <div className="rounded-xl bg-white border border-brand-primary/20 px-4 py-3 text-sm">
              <span className="text-slate-500">Estimated total: </span>
              <span className="font-bold text-brand-primary">
                RM {(openTotalCents / 100).toFixed(2)}
              </span>
              <span className="text-slate-400 text-xs ml-1">({maxPax} × RM {(amountPerPaxCents / 100).toFixed(2)})</span>
            </div>
          )}
          <p className="text-xs text-slate-400">
            You can open/close registration from the bill detail page after creation.
          </p>
        </div>
      )}

      {/* Bank account details */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowBank(v => !v)}
          className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-brand-primary" />
            <span className="text-sm font-semibold text-slate-700">Bank Transfer Details</span>
            <span className="text-xs text-slate-400">(optional)</span>
          </div>
          {showBank ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </button>

        {showBank && (
          <div className="px-6 pb-6 space-y-4 border-t border-slate-100">
            <p className="pt-4 text-xs text-slate-500">
              If filled, members must upload payment proof before confirming. Leave blank to skip proof upload.
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name</label>
              <select
                value={bankName}
                onChange={e => setBankName(e.target.value)}
                className={inputCls}
              >
                <option value="">Select bank...</option>
                {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Account Number</label>
              <input
                type="text"
                value={bankAccountNumber}
                onChange={e => setBankAccountNumber(e.target.value)}
                placeholder="e.g. 1234 5678 9012"
                maxLength={30}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Account Holder Name</label>
              <input
                type="text"
                value={bankAccountName}
                onChange={e => setBankAccountName(e.target.value)}
                placeholder="e.g. Ahmad Razif bin Zainudin"
                maxLength={100}
                className={inputCls}
              />
            </div>
          </div>
        )}
      </div>

      {/* Manual participants section */}
      {mode === 'manual' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Participants</h2>
            {totalCents > 0 && (
              <button
                type="button"
                onClick={splitEvenly}
                className="text-xs text-brand-primary hover:underline"
              >
                Split evenly
              </button>
            )}
          </div>

          <div className="space-y-3">
            {participants.map((p, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={p.name}
                    onChange={e => updateParticipant(i, 'name', e.target.value)}
                    placeholder="Name *"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
                  />
                  <input
                    type="number"
                    value={p.amountRm}
                    onChange={e => updateParticipant(i, 'amountRm', e.target.value)}
                    placeholder="Amount (RM) *"
                    min="0.01"
                    step="0.01"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
                  />
                  <input
                    type="email"
                    value={p.email}
                    onChange={e => updateParticipant(i, 'email', e.target.value)}
                    placeholder="Email (optional)"
                    className="col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
                  />
                </div>
                {participants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeParticipant(i)}
                    className="mt-2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addParticipant}
            className="flex items-center gap-1.5 text-sm text-brand-primary hover:text-brand-primary/80 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add participant
          </button>

          {totalCents > 0 && (
            <div className={`rounded-xl px-3 py-2 text-xs font-medium ${Math.abs(diff) <= 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {Math.abs(diff) <= 1
                ? `Amounts balance: RM ${(totalCents / 100).toFixed(2)}`
                : diff > 0
                ? `RM ${(diff / 100).toFixed(2)} unallocated`
                : `RM ${(Math.abs(diff) / 100).toFixed(2)} over-allocated`
              }
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-3 text-sm font-semibold text-white hover:bg-brand-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating bill...
          </>
        ) : (
          'Create Bill & Generate Links'
        )}
      </button>
    </form>
  )
}
