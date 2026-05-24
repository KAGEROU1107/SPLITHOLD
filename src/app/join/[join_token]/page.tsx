import { getBillByJoinToken } from '@/lib/splithold-db'
import JoinFormClient from '@/components/join/JoinFormClient'

interface Props {
  params: Promise<{ join_token: string }>
}

export default async function JoinPage({ params }: Props) {
  const { join_token } = await params
  const bill = await getBillByJoinToken(join_token)

  if (!bill) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center max-w-sm">
          <p className="text-4xl">🔗</p>
          <h1 className="mt-4 text-lg font-bold text-slate-900">Link not found</h1>
          <p className="mt-2 text-sm text-slate-500">This registration link is invalid or has expired.</p>
        </div>
      </main>
    )
  }

  const slotsRemaining = bill.max_participants !== null
    ? Math.max(0, bill.max_participants - bill.slot_count)
    : null

  return <JoinFormClient bill={bill} joinToken={join_token} slotsRemaining={slotsRemaining} />
}
