import { getSession } from '@/lib/session'
import { redirect, notFound } from 'next/navigation'
import { getBillById } from '@/lib/splithold-db'
import BillDetailClient from '@/components/bills/BillDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function BillDetailPage({ params }: Props) {
  const user = await getSession()
  if (!user) redirect('/login')

  const { id } = await params
  const bill = await getBillById(id, user.id, user.role === 'ADMIN')
  if (!bill) notFound()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return <BillDetailClient bill={bill} appUrl={appUrl} />
}
