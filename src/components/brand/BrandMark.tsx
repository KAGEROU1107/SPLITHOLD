import { cn } from '@/lib/utils'

interface BrandMarkProps {
  tone?: 'light' | 'dark'
  compact?: boolean
  className?: string
}

export default function BrandMark({ tone = 'light', compact = false, className }: BrandMarkProps) {
  const dark = tone === 'dark'

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          'grid h-10 w-10 shrink-0 place-items-center rounded-xl border text-sm font-black tracking-normal',
          dark
            ? 'border-white/10 bg-white text-brand-ink shadow-sm'
            : 'border-brand-primary/15 bg-brand-primary text-white shadow-sm'
        )}
      >
        SH
      </div>
      {!compact && (
        <div className="min-w-0">
          <p className={cn('text-lg font-semibold leading-none tracking-normal', dark ? 'text-white' : 'text-slate-950')}>
            SplitHold
          </p>
          <p className={cn('mt-1 text-xs font-semibold uppercase tracking-widest', dark ? 'text-brand-accent' : 'text-brand-primary')}>
            Bill Tracker
          </p>
        </div>
      )}
    </div>
  )
}
