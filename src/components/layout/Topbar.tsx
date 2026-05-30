'use client'

import { useRouter } from 'next/navigation'
import { Menu, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'
import { csrfFetch } from '@/lib/csrf-client'
import ThemeToggle from '@/components/ui/ThemeToggle'

interface TopbarProps {
  userName: string
  onMenuClick: () => void
}

export default function Topbar({ userName, onMenuClick }: TopbarProps) {
  const router = useRouter()

  async function handleLogout() {
    await csrfFetch('/api/auth/logout', { method: 'POST' })
    toast.success('Logged out successfully')
    router.push('/login')
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 justify-between border-b border-slate-200 bg-white dark:bg-brand-ink dark:border-white/10 px-4 lg:px-6">
      <button onClick={onMenuClick} className="lg:hidden text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shrink-0">
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden lg:block flex-1" />

      <div className="flex items-center gap-3">
        <ThemeToggle />

        <span className="hidden text-sm font-medium text-slate-700 dark:text-slate-300 sm:block">{userName}</span>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:block">Logout</span>
        </button>
      </div>
    </header>
  )
}
