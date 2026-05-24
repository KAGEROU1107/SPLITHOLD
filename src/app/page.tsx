import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import Link from 'next/link'
import { CheckCircle2, Link2, Users } from 'lucide-react'

export default async function Home() {
  const user = await getSession()
  if (user) redirect('/dashboard')

  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-mist via-white to-slate-50">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-primary text-sm font-bold text-white">SH</div>
          <span className="font-bold text-slate-900">SplitHold</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Log in</Link>
          <Link href="/register" className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90 transition-colors">
            Get started
          </Link>
        </div>
      </nav>

      <section className="mx-auto max-w-3xl px-6 pt-16 pb-24 text-center">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-brand-primary/30 bg-brand-mist px-3 py-1 text-xs font-medium text-brand-primary">
          ✦ Free to use · No account needed to pay
        </p>
        <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Split bills.<br />
          <span className="text-brand-primary">Track who&apos;s paid.</span>
        </h1>
        <p className="mt-5 text-lg text-slate-500 max-w-xl mx-auto">
          Create a bill, generate shareable payment links per person, and track confirmations in real time. No group chats needed.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/register"
            className="w-full sm:w-auto rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-white hover:bg-brand-primary/90 transition-colors shadow-sm"
          >
            Create your first bill →
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:border-brand-primary/40 transition-colors"
          >
            Log in
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            {
              icon: Users,
              title: 'Create a bill',
              desc: 'Add participants and their amounts. SplitHold generates a unique payment link for each person.',
            },
            {
              icon: Link2,
              title: 'Share the link',
              desc: 'Send each person their personal link via WhatsApp, Telegram, or email. No account needed to confirm.',
            },
            {
              icon: CheckCircle2,
              title: 'Track payments',
              desc: 'Your dashboard shows who has confirmed and who hasn\'t, with a live progress bar.',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-mist">
                <Icon className="h-5 w-5 text-brand-primary" />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        SplitHold — built for Kracked Devs bounty
      </footer>
    </main>
  )
}
