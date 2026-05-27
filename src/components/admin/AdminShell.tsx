'use client'

import { useState } from 'react'
import { Menu, LogOut } from 'lucide-react'
import AdminSidebar from './AdminSidebar'
import type { SessionUser } from '@/lib/session'
import toast from 'react-hot-toast'
import { csrfFetch } from '@/lib/csrf-client'

interface AdminShellProps {
  user: SessionUser
  pendingResets?: number
  children: React.ReactNode
}

export default function AdminShell({ user, pendingResets = 0, children }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  async function logout() {
    await csrfFetch('/api/auth/logout', { method: 'POST' })
    toast.success('Logged out')
    window.location.href = '/login'
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar
        pendingResets={pendingResets}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium text-slate-700 hidden lg:block">
            Admin Panel
          </span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">{user.name}</span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  )
}
