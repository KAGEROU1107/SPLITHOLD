import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import AppShell from '@/components/layout/AppShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession()
  if (!user) redirect('/login')

  return <AppShell user={user}>{children}</AppShell>
}
