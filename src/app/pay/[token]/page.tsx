import { getParticipantByToken } from '@/lib/splithold-db'
import PayConfirmClient from '@/components/pay/PayConfirmClient'

interface Props {
  params: Promise<{ token: string }>
}

export default async function PayPage({ params }: Props) {
  const { token } = await params
  const participant = await getParticipantByToken(token)

  if (!participant) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center max-w-sm">
          <p className="text-4xl">🔗</p>
          <h1 className="mt-4 text-lg font-bold text-slate-900">Link not found</h1>
          <p className="mt-2 text-sm text-slate-500">This payment link is invalid or has expired.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-mist via-white to-slate-50 flex items-center justify-center px-4 py-12">
      <PayConfirmClient participant={participant} token={token} />
    </main>
  )
}
