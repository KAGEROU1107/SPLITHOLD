import BrandMark from '@/components/brand/BrandMark'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-[minmax(320px,0.78fr)_minmax(0,1fr)]">
      <section className="relative hidden overflow-hidden bg-brand-ink px-10 py-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-accent via-violet-400 to-cyan-400" />
        <BrandMark tone="dark" />
        <div className="space-y-6">
          <div className="h-px w-24 bg-brand-accent" />
          <div>
            <p className="text-5xl font-semibold leading-none tracking-normal">SplitHold</p>
            <p className="mt-3 text-sm font-semibold uppercase tracking-widest text-brand-accent">Bill Tracker</p>
          </div>
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Split bills. Track payments.</p>
      </section>
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex justify-center lg:hidden">
            <BrandMark />
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}
