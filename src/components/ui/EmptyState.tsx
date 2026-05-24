import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title: string
  description?: string
  className?: string
}

export default function EmptyState({ title, description, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center', className)}>
      <div className="text-3xl">📭</div>
      <p className="mt-3 text-sm font-medium text-slate-700">{title}</p>
      {description && <p className="mt-1 text-xs text-slate-400">{description}</p>}
    </div>
  )
}
