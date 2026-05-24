'use client'

import { type ReactNode, useRef } from 'react'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, LayoutGrid, LayoutList, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ViewMode = 'table' | 'card'

export interface FilterOption { label: string; value: string }
export interface SortOption { label: string; value: string }
export interface CompanyOption { label: string; value: string; meta?: string }

interface Props {
  view: ViewMode
  onViewChange: (v: ViewMode) => void
  filterValue: string
  onFilterChange: (v: string) => void
  filterOptions: FilterOption[]
  sortField: string
  sortDir: 'asc' | 'desc'
  onSortChange: (field: string, dir: 'asc' | 'desc') => void
  sortOptions: SortOption[]
  latestOldestField?: string
  companyOptions?: CompanyOption[]
  companyValue?: string
  onCompanyChange?: (v: string) => void
  dateValue?: string
  onDateChange?: (v: string) => void
  searchValue?: string
  onSearchChange?: (v: string) => void
  searchPlaceholder?: string
  actionSlot?: ReactNode
  hideViewToggle?: boolean
  className?: string
}

export default function ListToolbar({
  view, onViewChange,
  filterValue, onFilterChange, filterOptions,
  sortField, sortDir, onSortChange, sortOptions,
  latestOldestField,
  companyOptions,
  companyValue = 'ALL',
  onCompanyChange,
  dateValue,
  onDateChange,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Cari...',
  actionSlot,
  hideViewToggle,
  className,
}: Props) {
  const companyRailRef = useRef<HTMLDivElement>(null)
  const showCompany = !!companyOptions?.length && companyOptions.length > 1 && !!onCompanyChange
  const showDate = dateValue !== undefined && !!onDateChange
  const showSearch = searchValue !== undefined && !!onSearchChange
  const secondarySortOptions = latestOldestField
    ? sortOptions.filter(opt => opt.value !== latestOldestField)
    : sortOptions

  function scrollCompanies(offset: number) {
    companyRailRef.current?.scrollBy({ left: offset, behavior: 'smooth' })
  }

  return (
    <div className={cn('space-y-2 rounded-xl border border-slate-200 bg-white/85 p-2 shadow-sm', className)}>
      <div className="flex flex-wrap items-center gap-2">
        {!hideViewToggle && (
          <div className="flex shrink-0 rounded-lg border border-slate-200 bg-white p-0.5">
            <button
              onClick={() => onViewChange('table')}
              className={cn(
                'flex min-h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition',
                view === 'table' ? 'bg-brand-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              )}
              title="Jadual"
            >
              <LayoutList className="h-3.5 w-3.5" />
              <span>Jadual</span>
            </button>
            <button
              onClick={() => onViewChange('card')}
              className={cn(
                'flex min-h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition',
                view === 'card' ? 'bg-brand-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              )}
              title="Kad"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Kad</span>
            </button>
          </div>
        )}

        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-0.5">
          {filterOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => onFilterChange(opt.value)}
              className={cn(
                'min-h-8 shrink-0 rounded-full px-3 text-xs font-medium transition whitespace-nowrap',
                filterValue === opt.value
                  ? 'bg-brand-primary text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {latestOldestField ? (
          <div className="flex shrink-0 rounded-lg border border-slate-200 bg-white p-0.5">
            <button
              onClick={() => onSortChange(latestOldestField, 'desc')}
              className={cn('min-h-8 rounded-md px-3 text-xs font-medium transition', sortField === latestOldestField && sortDir === 'desc' ? 'bg-brand-primary text-white' : 'text-slate-500 hover:text-slate-800')}
            >
              Latest
            </button>
            <button
              onClick={() => onSortChange(latestOldestField, 'asc')}
              className={cn('min-h-8 rounded-md px-3 text-xs font-medium transition', sortField === latestOldestField && sortDir === 'asc' ? 'bg-brand-primary text-white' : 'text-slate-500 hover:text-slate-800')}
            >
              Oldest
            </button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-1">
            <select
              value={sortField}
              onChange={e => onSortChange(e.target.value, sortDir)}
              className="min-h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-brand-primary"
            >
              {sortOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              onClick={() => onSortChange(sortField, sortDir === 'asc' ? 'desc' : 'asc')}
              className="flex min-h-8 items-center rounded-lg border border-slate-200 bg-white px-2 text-slate-500 transition hover:bg-slate-50"
              title={sortDir === 'asc' ? 'Menaik' : 'Menurun'}
            >
              {sortDir === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
        )}

        {secondarySortOptions.length > 0 && latestOldestField && (
          <select
            value={sortField === latestOldestField ? '' : sortField}
            onChange={e => e.target.value && onSortChange(e.target.value, sortDir)}
            className="min-h-8 shrink-0 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-brand-primary"
            aria-label="Susun tambahan"
          >
            <option value="">Susun...</option>
            {secondarySortOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}

        {actionSlot}
      </div>

      {(showCompany || showDate || showSearch) && (
        <div className="flex flex-wrap items-center gap-2">
          {showCompany && (
            <div className="flex min-w-0 flex-1 items-center gap-1">
              <button type="button" onClick={() => scrollCompanies(-180)} className="hidden min-h-8 shrink-0 rounded-lg border border-slate-200 bg-white px-2 text-slate-500 transition hover:bg-slate-50 sm:inline-flex" title="Syarikat sebelumnya">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <div ref={companyRailRef} className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-0.5">
                {companyOptions!.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onCompanyChange!(opt.value)}
                    className={cn(
                      'min-h-8 shrink-0 rounded-full px-3 text-xs font-medium transition whitespace-nowrap',
                      companyValue === opt.value ? 'bg-brand-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    {opt.label}{opt.meta ? <span className="ml-1 opacity-70">{opt.meta}</span> : null}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => scrollCompanies(180)} className="hidden min-h-8 shrink-0 rounded-lg border border-slate-200 bg-white px-2 text-slate-500 transition hover:bg-slate-50 sm:inline-flex" title="Syarikat seterusnya">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {showDate && (
            <label className="relative min-w-[150px] flex-1 sm:flex-none">
              <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={dateValue}
                onChange={e => onDateChange(e.target.value)}
                className="min-h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2 text-sm text-slate-700 outline-none focus:border-brand-primary"
                aria-label="Tarikh"
              />
            </label>
          )}

          {showSearch && (
            <label className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchValue}
                onChange={e => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="min-h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-brand-primary"
              />
            </label>
          )}
        </div>
      )}
    </div>
  )
}
