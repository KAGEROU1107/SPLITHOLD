import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  variant?: 'default' | 'warning' | 'danger'
}

export default function StatCard({ title, value, subtitle, icon: Icon, variant = 'default' }: StatCardProps) {
  return (
    <div className={cn(
      'rounded-2xl border bg-white p-5 shadow-sm',
      variant === 'warning' && 'border-amber-200 bg-amber-50',
      variant === 'danger' && 'border-red-200 bg-red-50',
      variant === 'default' && 'border-slate-200',
    )}>
      <div className="flex items-start justify-between">
        <p className={cn(
          'text-xs font-semibold uppercase tracking-widest',
          variant === 'warning' ? 'text-amber-600' : variant === 'danger' ? 'text-red-600' : 'text-slate-400'
        )}>
          {title}
        </p>
        {Icon && (
          <Icon className={cn(
            'h-4 w-4',
            variant === 'warning' ? 'text-amber-400' : variant === 'danger' ? 'text-red-400' : 'text-slate-300'
          )} />
        )}
      </div>
      <p className={cn(
        'mt-2 text-3xl font-semibold',
        variant === 'warning' ? 'text-amber-700' : variant === 'danger' ? 'text-red-700' : 'text-slate-900'
      )}>
        {value}
      </p>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
  )
}
