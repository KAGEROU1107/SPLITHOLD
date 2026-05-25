'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Receipt, PlusCircle, User, X, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import BrandMark from '@/components/brand/BrandMark'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/bills', label: 'My Bills', icon: Receipt },
  { href: '/bills/new', label: 'New Bill', icon: PlusCircle },
  { href: '/profile', label: 'Profile', icon: User },
]

interface SidebarProps {
  userName: string
  role: string
  open: boolean
  onClose: () => void
}

export default function Sidebar({ userName, role, open, onClose }: SidebarProps) {
  const pathname = usePathname()

  const sidebar = (
    <aside className="flex h-full w-60 flex-col bg-brand-ink">
      <div className="flex items-center justify-between px-5 py-5">
        <BrandMark tone="dark" />
        <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
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
              {label}
            </Link>
          )
        })}
        {role === 'ADMIN' && (
          <Link
            href="/admin"
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors mt-2 border-t border-white/10 pt-4',
              pathname.startsWith('/admin')
                ? 'bg-brand-primary text-white'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            )}
          >
            <ShieldCheck className="h-4 w-4 shrink-0" />
            Admin Panel
          </Link>
        )}
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <p className="text-xs text-slate-500 uppercase tracking-widest">Organizer</p>
        <p className="mt-0.5 truncate text-sm font-medium text-white">{userName}</p>
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
