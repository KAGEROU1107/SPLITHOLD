'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Receipt, KeyRound, Activity,
  ArrowLeft, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import BrandMark from '@/components/brand/BrandMark'

interface AdminSidebarProps {
  pendingResets: number
  open: boolean
  onClose: () => void
}

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'Users', icon: Users, exact: false },
  { href: '/admin/bills', label: 'All Bills', icon: Receipt, exact: false },
  { href: '/admin/password-resets', label: 'Password Resets', icon: KeyRound, exact: false },
  { href: '/admin/activity-log', label: 'Activity Log', icon: Activity, exact: false },
]

export default function AdminSidebar({ pendingResets, open, onClose }: AdminSidebarProps) {
  const pathname = usePathname()

  const sidebar = (
    <aside className="flex h-full w-60 flex-col bg-slate-900">
      <div className="flex items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <BrandMark tone="dark" />
          <span className="rounded bg-brand-primary px-1.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">Admin</span>
        </div>
        <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-primary text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {href === '/admin/password-resets' && pendingResets > 0 && (
                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white min-w-[18px] text-center">
                  {pendingResets > 99 ? '99+' : pendingResets}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-white/10 px-3 pb-4 pt-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Back to App
        </Link>
      </div>
    </aside>
  )

  return (
    <>
      <div className="hidden lg:flex h-screen w-60 shrink-0 flex-col">{sidebar}</div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <div className="absolute left-0 top-0 h-full">{sidebar}</div>
        </div>
      )}
    </>
  )
}
