'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Registration failed'); return }
      toast.success('Account created!')
      window.location.href = data.redirect ?? '/dashboard'
    } catch {
      toast.error('Connection error')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary'

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Create Account</h1>
        <p className="mt-1 text-sm text-slate-500">Start splitting bills with SplitHold</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Full Name</label>
            <input required value={form.name} onChange={set('name')} className={inputCls} placeholder="Your name" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input type="email" required value={form.email} onChange={set('email')} className={inputCls} placeholder="you@example.com" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input type="password" required value={form.password} onChange={set('password')} className={inputCls} placeholder="Min 8 characters" />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-primary/90 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-brand-primary underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
