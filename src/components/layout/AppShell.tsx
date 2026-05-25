'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import type { SessionUser } from '@/lib/session'

interface AppShellProps {
  user: SessionUser
  children: React.ReactNode
}

export default function AppShell({ user, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      <Sidebar
        userName={user.name}
        role={user.role}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          userName={user.name}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 sm:py-6">
          {children}
        </main>
      </div>
    </div>
  )
}
