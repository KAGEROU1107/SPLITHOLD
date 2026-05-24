'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  name: string
  email: string
  avatarUrl?: string | null
}

export default function ProfileForm({ name, email }: Props) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name, newPassword: '', currentPassword: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const body: Record<string, string> = { name: form.name }
      if (form.newPassword) {
        body.currentPassword = form.currentPassword
        body.newPassword = form.newPassword
      }
      const res = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Update failed'); return }
      toast.success('Profile updated')
    } catch {
      toast.error('Connection error')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">Email</label>
        <p className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">{email}</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Display Name</label>
        <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
      </div>
      <div className="border-t border-slate-200 pt-4">
        <p className="mb-3 text-sm font-medium text-slate-700">Change Password <span className="font-normal text-slate-400">(optional)</span></p>
        <div className="space-y-3">
          <input type="password" placeholder="Current password" value={form.currentPassword} onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))} className={inputCls} />
          <input type="password" placeholder="New password (min 8 chars)" value={form.newPassword} onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))} className={inputCls} />
        </div>
      </div>
      <button type="submit" disabled={loading} className="flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90 disabled:opacity-50">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  )
}
