// Returns UTC midnight of today and tomorrow — safe on any server timezone
export function todayUTCRange(): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  return { start, end }
}

// Parse a YYYY-MM-DD string into a UTC day range
export function parseDateUTCRange(dateStr: string): { start: Date; end: Date } {
  const [y, m, d] = dateStr.split('-').map(Number)
  const start = new Date(Date.UTC(y, m - 1, d))
  const end = new Date(Date.UTC(y, m - 1, d + 1))
  return { start, end }
}

export function todayUTCString(): string {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
