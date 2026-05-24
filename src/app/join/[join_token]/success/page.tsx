import { redirect } from 'next/navigation'
import Link from 'next/link'

interface Props {
  params: Promise<{ join_token: string }>
  searchParams: Promise<{ token?: string }>
}

export default async function JoinSuccessPage({ params, searchParams }: Props) {
  const { join_token } = await params
  const { token } = await searchParams

  if (!token) redirect(`/join/${join_token}`)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const payLink = `${appUrl}/pay/${token}`

  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-mist via-white to-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <span className="text-2xl">✓</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">You&apos;re registered!</h1>
            <p className="mt-1 text-sm text-slate-500">
              Use the link below to confirm your payment when you&apos;re ready.
            </p>
          </div>

          {/* Pay link — big and obvious */}
          <div className="rounded-xl border-2 border-brand-primary/30 bg-brand-mist/40 p-4 text-left space-y-2">
            <p className="text-xs font-semibold text-brand-primary uppercase tracking-wider">Your personal pay link</p>
            <p className="break-all text-xs font-mono text-slate-700 select-all">{payLink}</p>
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-left">
            <p className="text-xs font-semibold text-amber-700">⚠ Save this link now</p>
            <p className="mt-0.5 text-xs text-amber-600">
              Screenshot this page or copy the link. There is no recovery option if you lose it.
            </p>
          </div>

          <Link
            href={payLink}
            className="block w-full rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white text-center hover:bg-brand-primary/90 transition-colors"
          >
            Go to payment page
          </Link>
        </div>

        <p className="text-center text-xs text-slate-400">Powered by SplitHold</p>
      </div>
    </main>
  )
}
