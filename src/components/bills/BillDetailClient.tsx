'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  Copy, CheckCircle2, Clock, XCircle, ChevronLeft, Loader2,
  ExternalLink, Download, FileText, Link2, UserPlus, Users, Trash2,
} from 'lucide-react'
import Link from 'next/link'
import type { BillWithParticipants, BillParticipant } from '@/lib/splithold-db'
import DeleteBillModal from './DeleteBillModal'
import { csrfFetch } from '@/lib/csrf-client'

interface Props {
  bill: BillWithParticipants
  appUrl: string
}

type RowMode = 'idle' | 'approve' | 'reject'
type FilterTab = 'all' | 'pending' | 'confirmed' | 'rejected'

function fmtRm(cents: number) {
  return `RM ${(cents / 100).toFixed(2)}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-MY', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function StatusBadge({ status }: { status: BillParticipant['status'] }) {
  if (status === 'CONFIRMED') {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Confirmed
      </span>
    )
  }
  if (status === 'REJECTED') {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-red-500">
        <XCircle className="h-3.5 w-3.5" />
        Rejected
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
      <Clock className="h-3.5 w-3.5" />
      Pending
    </span>
  )
}

export default function BillDetailClient({ bill: initialBill, appUrl }: Props) {
  const [bill, setBill] = useState(initialBill)
  const [togglingStatus, setTogglingStatus] = useState(false)
  const [togglingReg, setTogglingReg] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [filterTab, setFilterTab] = useState<FilterTab>('all')
  const [rowModes, setRowModes] = useState<Record<string, RowMode>>({})
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({})
  const [reviewingId, setReviewingId] = useState<string | null>(null)

  const isOpenMode = bill.amount_per_pax !== null

  const confirmed = bill.participants.filter(p => p.status === 'CONFIRMED').length
  const pending = bill.participants.filter(p => p.status === 'PENDING').length
  const rejected = bill.participants.filter(p => p.status === 'REJECTED').length
  const total = bill.participants.length
  const pct = total > 0 ? Math.round((confirmed / total) * 100) : 0
  const confirmedCents = bill.participants
    .filter(p => p.status === 'CONFIRMED')
    .reduce((s, p) => s + p.amount_cents, 0)
  const remainingCents = isOpenMode
    ? (total * (bill.amount_per_pax ?? 0)) - confirmedCents
    : bill.total_amount_cents - confirmedCents
  const effectiveTotalCents = isOpenMode
    ? total * (bill.amount_per_pax ?? 0)
    : bill.total_amount_cents

  const filteredParticipants = bill.participants.filter(p => {
    if (filterTab === 'all') return true
    return p.status === filterTab.toUpperCase()
  })

  function getRowMode(id: string): RowMode {
    return rowModes[id] ?? 'idle'
  }

  function setRowMode(id: string, mode: RowMode) {
    setRowModes(prev => ({ ...prev, [id]: mode }))
  }

  function copyToClipboard(text: string, label = 'Copied!') {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(label)
    }).catch(() => {
      toast.error('Could not copy — try manually')
    })
  }

  function copyPayLink(token: string) {
    copyToClipboard(`${appUrl}/pay/${token}`, 'Link copied!')
  }

  function copyJoinLink() {
    if (!bill.join_token) return
    copyToClipboard(`${appUrl}/join/${bill.join_token}`, 'Join link copied!')
  }

  async function toggleStatus() {
    const newStatus = bill.status === 'ACTIVE' ? 'CLOSED' : 'ACTIVE'
    setTogglingStatus(true)
    try {
      const res = await csrfFetch(`/api/bills/${bill.id}/status`, {
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

  async function toggleRegistration() {
    const newOpen = !bill.registration_open
    setTogglingReg(true)
    try {
      const res = await csrfFetch(`/api/bills/${bill.id}/registration`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ open: newOpen }),
      })
      if (res.ok) {
        setBill(prev => ({ ...prev, registration_open: newOpen }))
        toast.success(newOpen ? 'Registration opened' : 'Registration closed')
      } else {
        toast.error('Failed to update registration')
      }
    } catch {
      toast.error('Connection error')
    } finally {
      setTogglingReg(false)
    }
  }

  async function reviewParticipant(
    participantId: string,
    action: 'approve' | 'reject',
    reason?: string
  ) {
    setReviewingId(participantId)
    try {
      const res = await csrfFetch(`/api/bills/${bill.id}/participants/${participantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      })
      if (res.status === 409) {
        toast.error('Already reviewed')
        setRowMode(participantId, 'idle')
        return
      }
      if (!res.ok) {
        toast.error('Failed — try again')
        return
      }
      const newStatus = action === 'approve' ? 'CONFIRMED' : 'REJECTED'
      setBill(prev => ({
        ...prev,
        participants: prev.participants.map(p =>
          p.id === participantId
            ? {
                ...p,
                status: newStatus,
                confirmed_at: action === 'approve' ? new Date().toISOString() : null,
                reviewed_at: new Date().toISOString(),
                rejection_reason: action === 'reject' ? (reason ?? null) : null,
              }
            : p
        ),
      }))
      setRowMode(participantId, 'idle')
      toast.success(action === 'approve' ? 'Payment approved' : 'Payment rejected')
    } catch {
      toast.error('Connection error')
    } finally {
      setReviewingId(null)
    }
  }

  function viewProof(participantId: string) {
    // API endpoint redirects to a Supabase signed URL — open directly to avoid
    // noopener/noreferrer blocking tab.location.href navigation.
    window.open(`/api/bills/${bill.id}/proof/${participantId}`, '_blank', 'noreferrer')
  }

  async function downloadProof(participantId: string, participantName: string) {
    setDownloadingId(participantId)
    try {
      const res = await fetch(`/api/bills/${bill.id}/proof/${participantId}`)
      if (!res.ok) { toast.error('Could not load proof'); return }
      // API now redirects — res.url is the final signed URL after the redirect
      const a = document.createElement('a')
      a.href = res.url
      a.download = `proof-${participantName.replace(/\s+/g, '-')}`
      a.click()
    } catch {
      toast.error('Connection error')
    } finally {
      setDownloadingId(null)
    }
  }

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: total },
    { key: 'pending', label: 'Pending', count: pending },
    { key: 'confirmed', label: 'Confirmed', count: confirmed },
    { key: 'rejected', label: 'Rejected', count: rejected },
  ]

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
            {isOpenMode && (
              <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-brand-mist text-brand-primary">
                Open Registration
              </span>
            )}
          </div>
          {bill.description && <p className="mt-1 text-sm text-slate-500">{bill.description}</p>}
          <p className="mt-1 text-xs text-slate-400">
            Due {formatDate(bill.due_date)} ·{' '}
            {isOpenMode
              ? `${fmtRm(bill.amount_per_pax!)} per person`
              : `${fmtRm(bill.total_amount_cents)} total`
            }
          </p>
        </div>
      </div>

      {/* Open registration panel */}
      {isOpenMode && bill.join_token && (
        <div className="rounded-2xl border border-brand-primary/20 bg-brand-mist/30 px-5 py-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-brand-primary" />
              <p className="text-sm font-semibold text-brand-primary">Self-Registration</p>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${bill.registration_open ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {bill.registration_open ? 'Open' : 'Closed'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs text-slate-500">
                {total} joined{bill.max_participants ? ` / ${bill.max_participants} max` : ''}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs text-slate-600 font-mono truncate">
              {appUrl}/join/{bill.join_token}
            </code>
            <button
              type="button"
              onClick={copyJoinLink}
              className="shrink-0 flex items-center gap-1.5 rounded-lg border border-brand-primary/30 bg-white px-3 py-1.5 text-xs text-brand-primary hover:bg-brand-mist/50 transition-colors"
            >
              <Link2 className="h-3.5 w-3.5" />
              Copy
            </button>
          </div>

          <button
            type="button"
            onClick={toggleRegistration}
            disabled={togglingReg || bill.status === 'CLOSED'}
            className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
              bill.registration_open
                ? 'border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-600'
                : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            {togglingReg && <Loader2 className="h-3 w-3 animate-spin" />}
            {bill.registration_open ? 'Close Registration' : 'Open Registration'}
          </button>
        </div>
      )}

      {/* Bank details */}
      {bill.bank_name && bill.bank_account_number && bill.bank_account_name && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Bank Transfer Details</p>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-xs text-slate-400">Bank</p>
              <p className="font-medium text-slate-800">{bill.bank_name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Account No.</p>
              <p className="font-mono font-semibold text-slate-900">{bill.bank_account_number}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Account Name</p>
              <p className="font-medium text-slate-800">{bill.bank_account_name}</p>
            </div>
          </div>
        </div>
      )}

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
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="rounded-xl bg-emerald-50 px-4 py-3">
            <p className="text-xs text-emerald-600 font-medium">Collected</p>
            <p className="mt-0.5 text-lg font-bold text-emerald-700">{fmtRm(confirmedCents)}</p>
          </div>
          <div className="rounded-xl bg-amber-50 px-4 py-3">
            <p className="text-xs text-amber-600 font-medium">Remaining</p>
            <p className={`mt-0.5 text-lg font-bold ${remainingCents > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
              {fmtRm(remainingCents > 0 ? remainingCents : 0)}
            </p>
          </div>
        </div>
        {effectiveTotalCents > 0 && (
          <p className="text-xs text-slate-400 text-right">of {fmtRm(effectiveTotalCents)} total</p>
        )}
        {confirmed === total && total > 0 && (
          <p className="text-xs text-emerald-600 font-semibold">All payments confirmed!</p>
        )}
      </div>

      {/* Participants */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Header + filter tabs */}
        <div className="px-5 pt-4 pb-0 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3">Participants</h2>
          <div className="flex gap-1 overflow-x-auto pb-0 -mb-px">
            {tabs.map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                  filterTab === tab.key
                    ? 'border-brand-primary text-brand-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    filterTab === tab.key ? 'bg-brand-mist text-brand-primary' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable participant list */}
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100">
          {filteredParticipants.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-400">
              {filterTab === 'all'
                ? (isOpenMode ? 'No participants yet.' : 'No participants.')
                : `No ${filterTab} participants.`
              }
            </div>
          ) : (
            filteredParticipants.map(p => {
              const mode = getRowMode(p.id)
              const isReviewing = reviewingId === p.id

              return (
                <div key={p.id} className="px-5 py-4 space-y-2">
                  {/* Row: name + status + actions */}
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{p.name}</p>
                      {p.email && <p className="text-xs text-slate-400 truncate">{p.email}</p>}
                      {p.phone_number && (
                        <p className="text-xs text-slate-400 truncate">{p.phone_number}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-0.5">{fmtRm(p.amount_cents)}</p>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <StatusBadge status={p.status} />

                      {/* Idle actions — only for PENDING on ACTIVE bills */}
                      {bill.status === 'ACTIVE' && p.status === 'PENDING' && mode === 'idle' && (
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setRowMode(p.id, 'approve')}
                            className="flex items-center gap-1 rounded-lg border border-emerald-300 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => setRowMode(p.id, 'reject')}
                            className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <XCircle className="h-3 w-3" />
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => copyPayLink(p.payment_token)}
                            className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-500 hover:border-brand-primary/40 hover:text-brand-primary transition-colors"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Approve confirmation inline */}
                  {mode === 'approve' && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 space-y-2">
                      <p className="text-xs font-medium text-emerald-800">
                        Approve {p.name}&apos;s payment of {fmtRm(p.amount_cents)}?
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={isReviewing}
                          onClick={() => reviewParticipant(p.id, 'approve')}
                          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                        >
                          {isReviewing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                          Confirm
                        </button>
                        <button
                          type="button"
                          disabled={isReviewing}
                          onClick={() => setRowMode(p.id, 'idle')}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-white transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Reject with reason inline */}
                  {mode === 'reject' && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 space-y-2">
                      <p className="text-xs font-medium text-red-800">Reject {p.name}&apos;s payment</p>
                      <input
                        type="text"
                        placeholder="Reason (optional)"
                        value={rejectReasons[p.id] ?? ''}
                        onChange={e => setRejectReasons(prev => ({ ...prev, [p.id]: e.target.value }))}
                        className="w-full rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-400"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={isReviewing}
                          onClick={() => reviewParticipant(p.id, 'reject', rejectReasons[p.id] || undefined)}
                          className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          {isReviewing ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                          Reject
                        </button>
                        <button
                          type="button"
                          disabled={isReviewing}
                          onClick={() => { setRowMode(p.id, 'idle'); setRejectReasons(prev => ({ ...prev, [p.id]: '' })) }}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-white transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Confirmed: timestamp + proof */}
                  {p.status === 'CONFIRMED' && (
                    <div className="flex items-center justify-between pt-1">
                      <p className="text-xs text-slate-400" suppressHydrationWarning>
                        {p.confirmed_at ? `Confirmed ${formatDateTime(p.confirmed_at)}` : 'Confirmed'}
                      </p>
                      {p.proof_url && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => viewProof(p.id)}
                            className="flex items-center gap-1 text-xs text-brand-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View proof
                          </button>
                          <span className="text-slate-200">|</span>
                          <button
                            type="button"
                            onClick={() => downloadProof(p.id, p.name)}
                            disabled={downloadingId === p.id}
                            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 disabled:opacity-50"
                          >
                            {downloadingId === p.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <Download className="h-3 w-3" />
                            }
                            Download
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rejected: reason */}
                  {p.status === 'REJECTED' && p.rejection_reason && (
                    <p className="text-xs text-red-500 pt-1">
                      Reason: {p.rejection_reason}
                    </p>
                  )}
                  {p.status === 'REJECTED' && !p.rejection_reason && (
                    <p className="text-xs text-slate-400 pt-1">No reason provided</p>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Link
          href={`/bills/${bill.id}/statement`}
          target="_blank"
          className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-brand-primary/40 hover:text-brand-primary transition-colors"
        >
          <FileText className="h-4 w-4" />
          Penyata
        </Link>

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

      {/* Danger zone */}
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-red-700">Delete this bill</p>
            <p className="mt-0.5 text-xs text-red-500">Permanently removes the bill and all participants. You must download all records first.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      {showDeleteModal && (
        <DeleteBillModal
          billId={bill.id}
          billTitle={bill.title}
          confirmedParticipants={bill.participants.filter(p => p.status === 'CONFIRMED')}
          onClose={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  )
}
