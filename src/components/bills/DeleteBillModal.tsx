'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  X, AlertTriangle, FileText, Download, CheckCircle2, Loader2, ExternalLink,
} from 'lucide-react'
import type { BillParticipant } from '@/lib/splithold-db'

interface Props {
  billId: string
  billTitle: string
  confirmedParticipants: BillParticipant[]
  onClose: () => void
}

export default function DeleteBillModal({ billId, billTitle, confirmedParticipants, onClose }: Props) {
  const router = useRouter()
  const [penyataDownloaded, setPenyataDownloaded] = useState(false)
  const [downloadedProofs, setDownloadedProofs] = useState<Set<string>>(new Set())
  const [titleInput, setTitleInput] = useState('')
  const [deleting, setDeleting] = useState(false)

  const confirmedWithProof = confirmedParticipants.filter(p => p.proof_url)
  const allProofsDownloaded = confirmedWithProof.every(p => downloadedProofs.has(p.id))
  const canDelete = penyataDownloaded && allProofsDownloaded && titleInput === billTitle

  function handlePenyataDownload() {
    window.open(`/bills/${billId}/statement`, '_blank')
    setPenyataDownloaded(true)
  }

  async function handleProofDownload(participantId: string, participantName: string) {
    try {
      const res = await fetch(`/api/bills/${billId}/proof/${participantId}`)
      if (!res.ok) { toast.error('Download failed'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const ext = res.headers.get('content-type')?.includes('pdf') ? 'pdf' : 'jpg'
      a.download = `proof-${participantName.replace(/\s+/g, '-')}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
      setDownloadedProofs(prev => new Set([...prev, participantId]))
    } catch {
      toast.error('Download failed')
    }
  }

  async function handleDelete() {
    if (!canDelete) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/bills/${billId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? 'Delete failed')
        return
      }
      toast.success('Bill deleted')
      router.push('/bills')
    } catch {
      toast.error('Connection error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h2 className="text-base font-semibold text-slate-900">Delete Bill</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <p className="text-sm text-slate-600">
            Before deleting <strong className="text-slate-900">{billTitle}</strong>, you must download all records.
            This action cannot be undone.
          </p>

          {/* Step 1 — Penyata */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {penyataDownloaded
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  : <div className="h-4 w-4 rounded-full border-2 border-slate-300" />}
                <span className="text-sm font-medium text-slate-900">Download Penyata (Statement)</span>
              </div>
              <button
                type="button"
                onClick={handlePenyataDownload}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-brand-primary/40 hover:text-brand-primary transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Open
              </button>
            </div>
          </div>

          {/* Step 2 — Payment proofs */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center gap-2">
              {allProofsDownloaded
                ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                : <div className="h-4 w-4 rounded-full border-2 border-slate-300" />}
              <span className="text-sm font-medium text-slate-900">Download Payment Proofs</span>
            </div>
            {confirmedWithProof.length === 0 ? (
              <p className="pl-6 text-xs text-slate-400">No payment proofs to download</p>
            ) : (
              <div className="space-y-2 pl-6">
                {confirmedWithProof.map(p => (
                  <div key={p.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {downloadedProofs.has(p.id)
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        : <div className="h-3.5 w-3.5 rounded-full border-2 border-slate-300" />}
                      <span className="text-xs text-slate-700">{p.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleProofDownload(p.id, p.name)}
                      disabled={downloadedProofs.has(p.id)}
                      className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-brand-primary/40 hover:text-brand-primary disabled:opacity-40 transition-colors"
                    >
                      <Download className="h-3 w-3" />
                      {downloadedProofs.has(p.id) ? 'Done' : 'Download'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Confirmation input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">
              Type the bill title to confirm: <span className="text-red-500 font-semibold">{billTitle}</span>
            </label>
            <input
              type="text"
              value={titleInput}
              onChange={e => setTitleInput(e.target.value)}
              placeholder="Type bill title…"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canDelete || deleting}
            onClick={handleDelete}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40 transition-colors"
          >
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete Bill
          </button>
        </div>
      </div>
    </div>
  )
}
