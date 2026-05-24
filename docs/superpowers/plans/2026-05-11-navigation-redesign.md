# Navigation Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the 5-role navigation redesign — correct sidebars, new pages (admin/statements, owner/vehicles, owner/statements, staff/accounts, staff/statements), and per-staff statement access toggle.

**Architecture:** Each role's sidebar is driven by a static NAV config in `Sidebar.tsx`. New pages follow the server-component pattern already established (fetch in page, pass serialized data to client components). The statement-access gate is a boolean on the User model checked at the page level and toggled via `PATCH /api/accounts/[id]`.

**Tech Stack:** Next.js 16 App Router, Prisma + Supabase PostgreSQL, Tailwind CSS, TypeScript, react-hot-toast

---

## File Map

### Modified
- `prisma/schema.prisma` — add `statementAccess` field to User model
- `src/lib/session.ts` — add `statementAccess: boolean` to `SessionUser`
- `src/app/api/accounts/[id]/route.ts` — accept `statementAccess` in PATCH body
- `src/components/layout/Sidebar.tsx` — update NAV config for all 5 roles
- `src/components/owner/StationManager.tsx` — add statementAccess toggle column

### Created
- `src/app/(dashboard)/admin/statements/page.tsx` — all-station statement viewer
- `src/app/(dashboard)/owner/vehicles/page.tsx` — per-station vehicle list for owner
- `src/app/(dashboard)/owner/statements/page.tsx` — per-station statement viewer for owner
- `src/app/(dashboard)/staff/accounts/page.tsx` — read-only company + vehicle list
- `src/app/(dashboard)/staff/statements/page.tsx` — gated statement viewer

---

## Task 1: Schema — add `statementAccess` to User

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add field to User model**

Open `prisma/schema.prisma`. Find the User model. Add this line after the `language` field:

```prisma
statementAccess Boolean  @default(false) @map("statement_access")
```

The User model block should now include:
```prisma
language        Language  @default(BM)
statementAccess Boolean   @default(false) @map("statement_access")
avatarUrl       String?   @map("avatar_url")
```

- [ ] **Step 2: Push to database and regenerate client**

```bash
npx prisma db push
npx prisma generate
```

Expected: "Your database is now in sync with your Prisma schema" followed by Prisma Client generated.

- [ ] **Step 3: Verify in Prisma Studio (optional)**

```bash
npx prisma studio
```

Check that `users` table now has a `statement_access` column defaulting to `false`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add statementAccess field to User model"
```

---

## Task 2: Session — expose `statementAccess` in `SessionUser`

**Files:**
- Modify: `src/lib/session.ts`

- [ ] **Step 1: Update `SessionUser` type**

In `src/lib/session.ts`, update the `SessionUser` type to add the new field:

```ts
export type SessionUser = {
  id: string
  name: string
  email: string | null
  role: UserRole
  stationId: string | null
  language: Language
  avatarUrl: string | null
  profileComplete: boolean
  statementAccess: boolean   // ← add this line
}
```

- [ ] **Step 2: Select the field from the database**

In the `prisma.user.findUnique` call inside `getSession`, add `statementAccess` to the `select` block:

```ts
const user = await prisma.user.findUnique({
  where: { id: payload.userId },
  select: {
    id: true,
    name: true,
    email: true,
    role: true,
    stationId: true,
    language: true,
    avatarUrl: true,
    isActive: true,
    staffId: true,
    statementAccess: true,   // ← add this line
  },
})
```

- [ ] **Step 3: Include in the returned object**

The destructuring at the bottom of `getSession` already spreads `rest` which will now include `statementAccess`. Verify the destructure line excludes only `isActive` and `staffId`:

```ts
const { isActive: _, staffId: __, ...rest } = user
return { ...rest, profileComplete }
```

No change needed here — `statementAccess` will flow through automatically.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/session.ts
git commit -m "feat: include statementAccess in session"
```

---

## Task 3: API — `PATCH /api/accounts/[id]` accepts `statementAccess`

**Files:**
- Modify: `src/app/api/accounts/[id]/route.ts`

- [ ] **Step 1: Update the PATCH handler to accept `statementAccess`**

Replace the current PATCH handler body in `src/app/api/accounts/[id]/route.ts` with the following. The key changes: parse both `isActive` and `statementAccess` from the body; build an update payload based on which fields are present; block STAFF from changing their own access.

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !['ADMIN', 'OWNER', 'MANAGER'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json() as { isActive?: boolean; statementAccess?: boolean }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, stationId: true },
  })

  if (!target) return NextResponse.json({ error: 'Akaun tidak dijumpai' }, { status: 404 })

  if (target.role === 'ADMIN') {
    return NextResponse.json({ error: 'Tidak boleh ubah akaun admin' }, { status: 403 })
  }
  if (target.role === 'OWNER' && session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Tidak boleh ubah akaun pemilik' }, { status: 403 })
  }

  // statementAccess can only be set on STAFF accounts
  if (body.statementAccess !== undefined && target.role !== 'STAFF') {
    return NextResponse.json({ error: 'statementAccess hanya untuk akaun kakitangan' }, { status: 400 })
  }

  if (session.role === 'MANAGER') {
    if (target.role === 'MANAGER') {
      return NextResponse.json({ error: 'Pengurus tidak boleh ubah pengurus lain' }, { status: 403 })
    }
    if (target.stationId !== session.stationId) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }
  }

  if (session.role === 'OWNER') {
    const station = await prisma.station.findUnique({ where: { id: target.stationId ?? '' } })
    if (!station || station.ownerId !== session.id) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }
  }

  const data: { isActive?: boolean; statementAccess?: boolean } = {}
  if (body.isActive !== undefined) data.isActive = body.isActive
  if (body.statementAccess !== undefined) data.statementAccess = body.statementAccess

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Tiada perubahan' }, { status: 400 })
  }

  await prisma.user.update({ where: { id }, data })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/accounts/[id]/route.ts
git commit -m "feat: PATCH /api/accounts/[id] supports statementAccess toggle"
```

---

## Task 4: StationManager — per-staff statement access toggle

**Files:**
- Modify: `src/components/owner/StationManager.tsx`

- [ ] **Step 1: Update `StaffRow` type to include `statementAccess`**

At the top of `StationManager.tsx`, update the `StaffRow` type:

```ts
type StaffRow = {
  id: string
  name: string
  email: string | null
  staffId: string | null
  role: string
  position: string | null
  isActive: boolean
  statementAccess: boolean   // ← add this line
  createdAt: string
}
```

- [ ] **Step 2: Add `toggleStatementAccess` function**

Inside the component, add this function alongside `toggleActive`:

```ts
async function toggleStatementAccess(userId: string, access: boolean) {
  const res = await fetch(`/api/accounts/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ statementAccess: access }),
  })
  if (!res.ok) { const d = await res.json(); toast.error(d.error ?? 'Gagal'); return }
  toast.success(access ? 'Akses penyata dibenarkan' : 'Akses penyata ditarik')
  router.refresh()
}
```

- [ ] **Step 3: Add "Penyata" column header to staff table**

In the `<thead>` of the staff table (look for the `<tr>` with existing `th` elements), add a new header after "Status":

```tsx
<th className="px-4 py-3 text-center font-medium text-slate-600">Penyata</th>
```

The header row should now read: ID | Nama | E-mel | Role | Status | **Penyata** | Tindakan

- [ ] **Step 4: Add toggle cell to each staff row**

In the `<tbody>` rows, add a cell after the Status cell. Only show the toggle for STAFF role rows — MANAGER/OWNER rows show `—`:

```tsx
<td className="px-4 py-3 text-center">
  {u.role === 'STAFF' ? (
    <button
      onClick={() => toggleStatementAccess(u.id, !u.statementAccess)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        u.statementAccess ? 'bg-brand-petrol' : 'bg-slate-200'
      }`}
      title={u.statementAccess ? 'Klik untuk tarik akses' : 'Klik untuk beri akses'}
    >
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
        u.statementAccess ? 'translate-x-4' : 'translate-x-0.5'
      }`} />
    </button>
  ) : (
    <span className="text-slate-300">—</span>
  )}
</td>
```

- [ ] **Step 5: Update all server pages that pass `users` to StationManager**

The three pages that render `<StationManager>` pass `serializedUsers`. Each needs `statementAccess` added to its serialized output.

In `src/app/(dashboard)/admin/accounts/page.tsx`, update the serialization:
```ts
const serializedUsers = station.users.map(u => ({
  id: u.id,
  name: u.name,
  email: u.email,
  staffId: u.staffId,
  role: u.role,
  position: u.position,
  isActive: u.isActive,
  statementAccess: u.statementAccess,   // ← add
  createdAt: u.createdAt.toISOString(),
}))
```

Also add `statementAccess: true` to the `select` block in that page's Prisma query:
```ts
users: {
  where: { role: { in: ['OWNER', 'MANAGER', 'STAFF'] } },
  select: {
    id: true, name: true, email: true, staffId: true,
    role: true, position: true, isActive: true, statementAccess: true,  // ← add
    createdAt: true,
  },
```

Apply the **same two changes** (Prisma select + serialization map) to:
- `src/app/(dashboard)/owner/stations/[id]/page.tsx`
- `src/app/(dashboard)/manager/accounts/page.tsx`

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/owner/StationManager.tsx \
        src/app/(dashboard)/admin/accounts/page.tsx \
        src/app/(dashboard)/owner/stations/[id]/page.tsx \
        src/app/(dashboard)/manager/accounts/page.tsx
git commit -m "feat: statement access toggle per staff in StationManager"
```

---

## Task 5: Sidebar — update NAV config for all 5 roles

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Replace the NAV constant**

Find the `const NAV: Record<UserRole, NavItem[]> = {` block in `Sidebar.tsx` and replace it entirely:

```ts
const NAV: Record<UserRole, NavItem[]> = {
  ADMIN: [
    { href: '/admin',               labelKey: 'nav_dashboard',     icon: LayoutDashboard },
    { href: '/admin/accounts',      labelKey: 'nav_accounts',      icon: Users },
    { href: '/admin/deposits',      labelKey: 'nav_deposits',      icon: Wallet },
    { href: '/admin/transactions',  labelKey: 'nav_transactions',  icon: Receipt },
    { href: '/admin/vehicles',      labelKey: 'nav_vehicles',      icon: Car },
    { href: '/admin/statements',    labelKey: 'nav_statements',    icon: FileText },
    { href: '/admin/profile',       labelKey: 'nav_profile',       icon: User },
  ],
  OWNER: [
    { href: '/owner',               labelKey: 'nav_dashboard',     icon: LayoutDashboard },
    { href: '/owner/stations',      labelKey: 'nav_accounts',      icon: Building2 },
    { href: '/owner/deposits',      labelKey: 'nav_deposits',      icon: Wallet },
    { href: '/owner/transactions',  labelKey: 'nav_transactions',  icon: Receipt },
    { href: '/owner/vehicles',      labelKey: 'nav_vehicles',      icon: Car },
    { href: '/owner/statements',    labelKey: 'nav_statements',    icon: FileText },
    { href: '/owner/profile',       labelKey: 'nav_profile',       icon: User },
  ],
  MANAGER: [
    { href: '/manager',             labelKey: 'nav_dashboard',     icon: LayoutDashboard },
    { href: '/manager/accounts',    labelKey: 'nav_accounts',      icon: Users },
    { href: '/manager/deposits',    labelKey: 'nav_deposits',      icon: Wallet },
    { href: '/manager/transactions',labelKey: 'nav_transactions',  icon: Receipt },
    { href: '/manager/vehicles',    labelKey: 'nav_vehicles',      icon: Car },
    { href: '/manager/statements',  labelKey: 'nav_statements',    icon: FileText },
    { href: '/manager/profile',     labelKey: 'nav_profile',       icon: User },
  ],
  STAFF: [
    { href: '/staff',               labelKey: 'nav_dashboard',     icon: LayoutDashboard },
    { href: '/staff/accounts',      labelKey: 'nav_accounts',      icon: Users },
    { href: '/staff/transactions',  labelKey: 'nav_transactions',  icon: Receipt },
    { href: '/staff/statements',    labelKey: 'nav_statements',    icon: FileText },
    { href: '/staff/vehicles',      labelKey: 'nav_vehicles',      icon: Car },
    { href: '/staff/profile',       labelKey: 'nav_profile',       icon: User },
  ],
  COMPANY: [
    { href: '/company',             labelKey: 'nav_dashboard',     icon: LayoutDashboard },
    { href: '/company/deposits',    labelKey: 'nav_deposits',      icon: Wallet },
    { href: '/company/transactions',labelKey: 'nav_transactions',  icon: Receipt },
    { href: '/company/statements',  labelKey: 'nav_statements',    icon: FileText },
    { href: '/company/vehicles',    labelKey: 'nav_vehicles',      icon: Car },
    { href: '/company/profile',     labelKey: 'nav_profile',       icon: User },
  ],
}
```

- [ ] **Step 2: Verify `nav_statements` key exists in i18n**

Open `src/lib/i18n.ts`. Search for `nav_statements`. If missing, add it to both BM and EN:
```ts
nav_statements: 'Penyata',        // BM
nav_statements: 'Statements',     // EN
```

Also check `nav_accounts` is present (it should be).

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Sidebar.tsx src/lib/i18n.ts
git commit -m "feat: update sidebar nav for all 5 roles"
```

---

## Task 6: Build `/admin/statements`

**Files:**
- Create: `src/app/(dashboard)/admin/statements/page.tsx`

Admin sees statements for **any station in the system** (no ownerId filter). Station picker + company picker + month picker.

- [ ] **Step 1: Create the page**

Create `src/app/(dashboard)/admin/statements/page.tsx`:

```ts
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import StatementViewer from '@/components/statements/StatementViewer'

export default async function AdminStatementsPage({
  searchParams,
}: {
  searchParams: Promise<{ stationId?: string; companyId?: string; month?: string }>
}) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') redirect('/login')

  const { stationId, companyId, month: monthParam } = await searchParams

  // Admin can pick any station
  const allStations = await prisma.station.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  const companies = stationId
    ? await prisma.company.findMany({
        where: { stationId },
        select: { id: true, companyName: true },
        orderBy: { companyName: 'asc' },
      })
    : []

  const now = new Date()
  const selectedMonth = monthParam ?? `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const [year, month] = selectedMonth.split('-').map(Number)
  const periodStart = new Date(Date.UTC(year, month - 1, 1))
  const periodEnd = new Date(Date.UTC(year, month, 1))

  let statementData: Awaited<ReturnType<typeof buildStatement>> | null = null
  if (companyId && stationId) {
    statementData = await buildStatement(companyId, stationId, periodStart, periodEnd)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Penyata Akaun Syarikat</h1>
        <p className="text-sm text-slate-500">Lihat penyata untuk mana-mana stesen dan syarikat</p>
      </div>

      <form method="GET" className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Stesen</label>
          <select
            name="stationId"
            defaultValue={stationId ?? ''}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-petrol focus:ring-1 focus:ring-brand-petrol min-w-[200px]"
          >
            <option value="">-- Pilih stesen --</option>
            {allStations.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Syarikat</label>
          <select
            name="companyId"
            defaultValue={companyId ?? ''}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-petrol focus:ring-1 focus:ring-brand-petrol min-w-[220px]"
            disabled={companies.length === 0}
          >
            <option value="">{companies.length === 0 ? '-- Pilih stesen dahulu --' : '-- Pilih syarikat --'}</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.companyName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Bulan</label>
          <input
            type="month"
            name="month"
            defaultValue={selectedMonth}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-petrol"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-brand-petrol px-4 py-2 text-sm font-medium text-white hover:bg-brand-petrol/90 transition"
        >
          Jana Penyata
        </button>
      </form>

      {companyId && stationId && !statementData && (
        <p className="text-sm text-red-500">Syarikat tidak dijumpai.</p>
      )}

      {statementData && (
        <StatementViewer
          company={statementData.company}
          selectedMonth={selectedMonth}
          periodStart={periodStart.toISOString()}
          periodEnd={new Date(Date.UTC(year, month, 0)).toISOString()}
          openingBal={statementData.openingBal}
          totalDeposit={statementData.totalDeposit}
          totalUsage={statementData.totalUsage}
          closingBal={statementData.closingBal}
          deposits={statementData.deposits}
          transactions={statementData.transactions}
        />
      )}
    </div>
  )
}

async function buildStatement(companyId: string, stationId: string, periodStart: Date, periodEnd: Date) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, stationId },
    select: {
      companyName: true, ssmNo: true, picName: true,
      companyPhone: true, companyEmail: true, address: true, depositBalance: true,
    },
  })
  if (!company) return null

  const [deposits, transactions] = await Promise.all([
    prisma.deposit.findMany({
      where: { companyId, status: 'APPROVED', createdAt: { gte: periodStart, lt: periodEnd } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.transaction.findMany({
      where: { companyId, createdAt: { gte: periodStart, lt: periodEnd }, deletedAt: null },
      include: { vehicle: { select: { plateNo: true } }, staff: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const totalDeposit = deposits.reduce((s, d) => s + Number(d.amount), 0)
  const totalUsage = transactions.reduce((s, t) => s + Number(t.amount), 0)

  return {
    company: {
      companyName: company.companyName, ssmNo: company.ssmNo, picName: company.picName,
      companyPhone: company.companyPhone, companyEmail: company.companyEmail, address: company.address,
    },
    openingBal: Number(company.depositBalance) - totalDeposit + totalUsage,
    totalDeposit,
    totalUsage,
    closingBal: Number(company.depositBalance),
    deposits: deposits.map(d => ({ id: d.id, createdAt: d.createdAt.toISOString(), amount: Number(d.amount) })),
    transactions: transactions.map(tx => ({
      id: tx.id, invoiceNo: tx.invoiceNo, createdAt: tx.createdAt.toISOString(),
      fuelType: tx.fuelType, amount: Number(tx.amount), plateNo: tx.vehicle.plateNo,
      staffName: tx.staff.name, balanceAfter: Number(tx.balanceAfter),
    })),
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/admin/statements/page.tsx
git commit -m "feat: /admin/statements with cross-station picker"
```

---

## Task 7: Build `/owner/vehicles`

**Files:**
- Create: `src/app/(dashboard)/owner/vehicles/page.tsx`

Owner picks one of their stations from a dropdown, then sees that station's vehicles (same table as manager). Station ID passed via `?stationId=` URL param.

- [ ] **Step 1: Create the page**

Create `src/app/(dashboard)/owner/vehicles/page.tsx`:

```ts
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { cn } from '@/lib/utils'
import type { FuelType } from '@prisma/client'
import VehicleToggle from '@/components/vehicles/VehicleToggle'
import VehicleApprovalActions from '@/components/vehicles/VehicleApprovalActions'

const FUEL_BADGE: Record<FuelType, string> = {
  RON95: 'bg-blue-100 text-blue-700',
  RON97: 'bg-indigo-100 text-indigo-700',
  DIESEL: 'bg-amber-100 text-amber-700',
  ALL: 'bg-slate-100 text-slate-600',
}

export default async function OwnerVehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ stationId?: string }>
}) {
  const session = await getSession()
  if (!session || session.role !== 'OWNER') redirect('/login')

  const { stationId } = await searchParams

  const ownedStations = await prisma.station.findMany({
    where: { ownerId: session.id },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  // Verify selected station belongs to this owner
  const selectedStation = stationId
    ? ownedStations.find(s => s.id === stationId) ?? null
    : null

  const vehicles = selectedStation
    ? await prisma.vehicle.findMany({
        where: { company: { stationId: selectedStation.id } },
        select: {
          id: true, plateNo: true, vehicleType: true, driverName: true,
          fuelType: true, isActive: true, approvalStatus: true, letterUrl: true,
          company: { select: { companyName: true } },
        },
        orderBy: { plateNo: 'asc' },
      })
    : []

  const pending = vehicles.filter(v => v.approvalStatus === 'PENDING')
  const rest = vehicles.filter(v => v.approvalStatus !== 'PENDING')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Kenderaan</h1>
        <p className="text-sm text-slate-500">Pilih stesen untuk lihat kenderaan berdaftar</p>
      </div>

      {/* Station picker */}
      <form method="GET" className="flex items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Stesen</label>
          <select
            name="stationId"
            defaultValue={stationId ?? ''}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-petrol focus:ring-1 focus:ring-brand-petrol min-w-[220px]"
          >
            <option value="">-- Pilih stesen --</option>
            {ownedStations.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-brand-petrol px-4 py-2 text-sm font-medium text-white hover:bg-brand-petrol/90 transition"
        >
          Papar
        </button>
      </form>

      {stationId && !selectedStation && (
        <p className="text-sm text-red-500">Stesen tidak dijumpai.</p>
      )}

      {selectedStation && (
        <>
          {pending.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-amber-700">Menunggu Kelulusan</h2>
              <div className="overflow-x-auto rounded-2xl border border-amber-200 bg-amber-50">
                <table className="w-full min-w-[700px] text-sm">
                  <thead>
                    <tr className="border-b border-amber-100">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-amber-600">Plat</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-amber-600">Syarikat</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-amber-600">Jenis</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-amber-600">Pemandu</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-amber-600">Bahan Api</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-amber-600">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100">
                    {pending.map(v => (
                      <tr key={v.id}>
                        <td className="px-4 py-3 font-mono font-semibold text-slate-900">{v.plateNo}</td>
                        <td className="px-4 py-3 text-slate-600">{v.company.companyName}</td>
                        <td className="px-4 py-3 text-slate-500">{v.vehicleType}</td>
                        <td className="px-4 py-3 text-slate-400">{v.driverName ?? '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', FUEL_BADGE[v.fuelType])}>
                            {v.fuelType}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <VehicleApprovalActions vehicleId={v.id} letterUrl={v.letterUrl} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {rest.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
              Tiada kenderaan berdaftar di stesen ini.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full min-w-[650px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-400">Plat</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-400">Syarikat</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-400">Jenis</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-400">Pemandu</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-400">Bahan Api</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-400">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-400">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rest.map(v => (
                    <tr key={v.id} className={cn('hover:bg-slate-50', !v.isActive && 'opacity-50')}>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-900">{v.plateNo}</td>
                      <td className="px-4 py-3 text-slate-600">{v.company.companyName}</td>
                      <td className="px-4 py-3 text-slate-500">{v.vehicleType}</td>
                      <td className="px-4 py-3 text-slate-400">{v.driverName ?? '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', FUEL_BADGE[v.fuelType])}>
                          {v.fuelType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-medium',
                          v.approvalStatus === 'REJECTED' ? 'bg-red-100 text-red-600'
                            : v.isActive ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        )}>
                          {v.approvalStatus === 'REJECTED' ? 'Ditolak' : v.isActive ? 'Aktif' : 'Tidak Aktif'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {v.letterUrl && (
                            <a href={v.letterUrl} target="_blank" rel="noopener noreferrer"
                              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
                              Surat
                            </a>
                          )}
                          {v.approvalStatus === 'APPROVED' && (
                            <VehicleToggle vehicleId={v.id} isActive={v.isActive} />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/owner/vehicles/page.tsx
git commit -m "feat: /owner/vehicles with per-station picker"
```

---

## Task 8: Build `/owner/statements`

**Files:**
- Create: `src/app/(dashboard)/owner/statements/page.tsx`

Same pattern as manager/statements but station picker is restricted to owned stations.

- [ ] **Step 1: Create the page**

Create `src/app/(dashboard)/owner/statements/page.tsx`:

```ts
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import StatementViewer from '@/components/statements/StatementViewer'

export default async function OwnerStatementsPage({
  searchParams,
}: {
  searchParams: Promise<{ stationId?: string; companyId?: string; month?: string }>
}) {
  const session = await getSession()
  if (!session || session.role !== 'OWNER') redirect('/login')

  const { stationId, companyId, month: monthParam } = await searchParams

  const ownedStations = await prisma.station.findMany({
    where: { ownerId: session.id },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  // Only load companies for a verified-owned station
  const isOwned = stationId ? ownedStations.some(s => s.id === stationId) : false

  const companies = isOwned && stationId
    ? await prisma.company.findMany({
        where: { stationId },
        select: { id: true, companyName: true },
        orderBy: { companyName: 'asc' },
      })
    : []

  const now = new Date()
  const selectedMonth = monthParam ?? `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const [year, month] = selectedMonth.split('-').map(Number)
  const periodStart = new Date(Date.UTC(year, month - 1, 1))
  const periodEnd = new Date(Date.UTC(year, month, 1))

  let statementData: Awaited<ReturnType<typeof buildStatement>> | null = null
  if (companyId && stationId && isOwned) {
    statementData = await buildStatement(companyId, stationId, periodStart, periodEnd)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Penyata Akaun Syarikat</h1>
        <p className="text-sm text-slate-500">Jana penyata untuk syarikat di stesen anda</p>
      </div>

      <form method="GET" className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Stesen</label>
          <select name="stationId" defaultValue={stationId ?? ''}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-petrol min-w-[200px]">
            <option value="">-- Pilih stesen --</option>
            {ownedStations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Syarikat</label>
          <select name="companyId" defaultValue={companyId ?? ''}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-petrol min-w-[220px]"
            disabled={companies.length === 0}>
            <option value="">{companies.length === 0 ? '-- Pilih stesen dahulu --' : '-- Pilih syarikat --'}</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Bulan</label>
          <input type="month" name="month" defaultValue={selectedMonth}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-petrol" />
        </div>
        <button type="submit"
          className="rounded-lg bg-brand-petrol px-4 py-2 text-sm font-medium text-white hover:bg-brand-petrol/90 transition">
          Jana Penyata
        </button>
      </form>

      {companyId && stationId && !statementData && (
        <p className="text-sm text-red-500">Syarikat tidak dijumpai atau bukan dari stesen anda.</p>
      )}

      {statementData && (
        <StatementViewer
          company={statementData.company}
          selectedMonth={selectedMonth}
          periodStart={periodStart.toISOString()}
          periodEnd={new Date(Date.UTC(year, month, 0)).toISOString()}
          openingBal={statementData.openingBal}
          totalDeposit={statementData.totalDeposit}
          totalUsage={statementData.totalUsage}
          closingBal={statementData.closingBal}
          deposits={statementData.deposits}
          transactions={statementData.transactions}
        />
      )}
    </div>
  )
}

async function buildStatement(companyId: string, stationId: string, periodStart: Date, periodEnd: Date) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, stationId },
    select: {
      companyName: true, ssmNo: true, picName: true,
      companyPhone: true, companyEmail: true, address: true, depositBalance: true,
    },
  })
  if (!company) return null

  const [deposits, transactions] = await Promise.all([
    prisma.deposit.findMany({
      where: { companyId, status: 'APPROVED', createdAt: { gte: periodStart, lt: periodEnd } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.transaction.findMany({
      where: { companyId, createdAt: { gte: periodStart, lt: periodEnd }, deletedAt: null },
      include: { vehicle: { select: { plateNo: true } }, staff: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const totalDeposit = deposits.reduce((s, d) => s + Number(d.amount), 0)
  const totalUsage = transactions.reduce((s, t) => s + Number(t.amount), 0)

  return {
    company: {
      companyName: company.companyName, ssmNo: company.ssmNo, picName: company.picName,
      companyPhone: company.companyPhone, companyEmail: company.companyEmail, address: company.address,
    },
    openingBal: Number(company.depositBalance) - totalDeposit + totalUsage,
    totalDeposit,
    totalUsage,
    closingBal: Number(company.depositBalance),
    deposits: deposits.map(d => ({ id: d.id, createdAt: d.createdAt.toISOString(), amount: Number(d.amount) })),
    transactions: transactions.map(tx => ({
      id: tx.id, invoiceNo: tx.invoiceNo, createdAt: tx.createdAt.toISOString(),
      fuelType: tx.fuelType, amount: Number(tx.amount), plateNo: tx.vehicle.plateNo,
      staffName: tx.staff.name, balanceAfter: Number(tx.balanceAfter),
    })),
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/owner/statements/page.tsx
git commit -m "feat: /owner/statements with owned-station picker"
```

---

## Task 9: Build `/staff/accounts` (read-only)

**Files:**
- Create: `src/app/(dashboard)/staff/accounts/page.tsx`

Staff sees companies + their active vehicles. No actions. Purely for reference (looking up a company's vehicles when a driver arrives without knowing the plate).

- [ ] **Step 1: Create the page**

Create `src/app/(dashboard)/staff/accounts/page.tsx`:

```ts
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { cn } from '@/lib/utils'
import type { FuelType } from '@prisma/client'

const FUEL_BADGE: Record<FuelType, string> = {
  RON95: 'bg-blue-100 text-blue-700',
  RON97: 'bg-indigo-100 text-indigo-700',
  DIESEL: 'bg-amber-100 text-amber-700',
  ALL: 'bg-slate-100 text-slate-600',
}

export default async function StaffAccountsPage() {
  const session = await getSession()
  if (!session || session.role !== 'STAFF') redirect('/login')

  const companies = await prisma.company.findMany({
    where: { stationId: session.stationId! },
    select: {
      id: true,
      companyName: true,
      ssmNo: true,
      picName: true,
      companyPhone: true,
      depositBalance: true,
      user: { select: { isActive: true } },
      vehicles: {
        where: { isActive: true, approvalStatus: 'APPROVED' },
        select: { id: true, plateNo: true, vehicleType: true, driverName: true, fuelType: true },
        orderBy: { plateNo: 'asc' },
      },
    },
    orderBy: { companyName: 'asc' },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Akaun Syarikat</h1>
        <p className="text-sm text-slate-500">{companies.length} syarikat berdaftar di stesen ini</p>
      </div>

      {companies.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          Tiada syarikat berdaftar.
        </div>
      ) : (
        <div className="space-y-4">
          {companies.map(c => (
            <div key={c.id} className={cn('rounded-2xl border border-slate-200 bg-white overflow-hidden', !c.user.isActive && 'opacity-60')}>
              {/* Company header */}
              <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <p className="font-semibold text-slate-900">{c.companyName}</p>
                  <p className="text-xs text-slate-400 mt-0.5">SSM: {c.ssmNo} · {c.picName} · {c.companyPhone}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Baki</p>
                  <p className={cn('text-sm font-semibold', Number(c.depositBalance) < 100 ? 'text-red-600' : 'text-slate-900')}>
                    RM {Number(c.depositBalance).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Vehicles */}
              {c.vehicles.length === 0 ? (
                <p className="px-5 py-3 text-xs text-slate-400">Tiada kenderaan aktif</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-2 text-left text-xs font-medium text-slate-500">No. Plat</th>
                      <th className="px-5 py-2 text-left text-xs font-medium text-slate-500">Jenis</th>
                      <th className="px-5 py-2 text-left text-xs font-medium text-slate-500">Pemandu</th>
                      <th className="px-5 py-2 text-center text-xs font-medium text-slate-500">Bahan Api</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {c.vehicles.map(v => (
                      <tr key={v.id} className="hover:bg-slate-50">
                        <td className="px-5 py-2.5 font-mono font-semibold text-slate-800">{v.plateNo}</td>
                        <td className="px-5 py-2.5 text-slate-500">{v.vehicleType}</td>
                        <td className="px-5 py-2.5 text-slate-500">{v.driverName ?? '—'}</td>
                        <td className="px-5 py-2.5 text-center">
                          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', FUEL_BADGE[v.fuelType])}>
                            {v.fuelType}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/staff/accounts/page.tsx
git commit -m "feat: /staff/accounts read-only company and vehicle list"
```

---

## Task 10: Build `/staff/statements` (gated)

**Files:**
- Create: `src/app/(dashboard)/staff/statements/page.tsx`

If `session.statementAccess === false`, shows a locked card. If `true`, shows the statement form (own station only, same picker as manager).

- [ ] **Step 1: Create the page**

Create `src/app/(dashboard)/staff/statements/page.tsx`:

```ts
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import StatementViewer from '@/components/statements/StatementViewer'
import { Lock } from 'lucide-react'

export default async function StaffStatementsPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string; month?: string }>
}) {
  const session = await getSession()
  if (!session || session.role !== 'STAFF') redirect('/login')

  // Gated: show locked state if access not granted
  if (!session.statementAccess) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Penyata Akaun Syarikat</h1>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <Lock className="h-7 w-7 text-slate-400" />
          </div>
          <p className="text-base font-semibold text-slate-700">Akses Dikunci</p>
          <p className="mt-1 max-w-xs text-sm text-slate-400">
            Akses penyata belum dibenarkan. Hubungi Pengurus atau Pemilik untuk mendapatkan akses.
          </p>
        </div>
      </div>
    )
  }

  const stationId = session.stationId!
  const { companyId, month: monthParam } = await searchParams

  const companies = await prisma.company.findMany({
    where: { stationId },
    select: { id: true, companyName: true },
    orderBy: { companyName: 'asc' },
  })

  const now = new Date()
  const selectedMonth = monthParam ?? `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const [year, month] = selectedMonth.split('-').map(Number)
  const periodStart = new Date(Date.UTC(year, month - 1, 1))
  const periodEnd = new Date(Date.UTC(year, month, 1))

  let statementData: Awaited<ReturnType<typeof buildStatement>> | null = null
  if (companyId) {
    statementData = await buildStatement(companyId, stationId, periodStart, periodEnd)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Penyata Akaun Syarikat</h1>
        <p className="text-sm text-slate-500">Jana penyata untuk syarikat di stesen ini</p>
      </div>

      <form method="GET" className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Syarikat</label>
          <select name="companyId" defaultValue={companyId ?? ''}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-petrol min-w-[220px]">
            <option value="">-- Pilih syarikat --</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Bulan</label>
          <input type="month" name="month" defaultValue={selectedMonth}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-petrol" />
        </div>
        <button type="submit"
          className="rounded-lg bg-brand-petrol px-4 py-2 text-sm font-medium text-white hover:bg-brand-petrol/90 transition">
          Jana Penyata
        </button>
      </form>

      {companyId && !statementData && (
        <p className="text-sm text-red-500">Syarikat tidak dijumpai atau bukan dari stesen ini.</p>
      )}

      {statementData && (
        <StatementViewer
          company={statementData.company}
          selectedMonth={selectedMonth}
          periodStart={periodStart.toISOString()}
          periodEnd={new Date(Date.UTC(year, month, 0)).toISOString()}
          openingBal={statementData.openingBal}
          totalDeposit={statementData.totalDeposit}
          totalUsage={statementData.totalUsage}
          closingBal={statementData.closingBal}
          deposits={statementData.deposits}
          transactions={statementData.transactions}
        />
      )}
    </div>
  )
}

async function buildStatement(companyId: string, stationId: string, periodStart: Date, periodEnd: Date) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, stationId },
    select: {
      companyName: true, ssmNo: true, picName: true,
      companyPhone: true, companyEmail: true, address: true, depositBalance: true,
    },
  })
  if (!company) return null

  const [deposits, transactions] = await Promise.all([
    prisma.deposit.findMany({
      where: { companyId, status: 'APPROVED', createdAt: { gte: periodStart, lt: periodEnd } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.transaction.findMany({
      where: { companyId, createdAt: { gte: periodStart, lt: periodEnd }, deletedAt: null },
      include: { vehicle: { select: { plateNo: true } }, staff: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const totalDeposit = deposits.reduce((s, d) => s + Number(d.amount), 0)
  const totalUsage = transactions.reduce((s, t) => s + Number(t.amount), 0)

  return {
    company: {
      companyName: company.companyName, ssmNo: company.ssmNo, picName: company.picName,
      companyPhone: company.companyPhone, companyEmail: company.companyEmail, address: company.address,
    },
    openingBal: Number(company.depositBalance) - totalDeposit + totalUsage,
    totalDeposit,
    totalUsage,
    closingBal: Number(company.depositBalance),
    deposits: deposits.map(d => ({ id: d.id, createdAt: d.createdAt.toISOString(), amount: Number(d.amount) })),
    transactions: transactions.map(tx => ({
      id: tx.id, invoiceNo: tx.invoiceNo, createdAt: tx.createdAt.toISOString(),
      fuelType: tx.fuelType, amount: Number(tx.amount), plateNo: tx.vehicle.plateNo,
      staffName: tx.staff.name, balanceAfter: Number(tx.balanceAfter),
    })),
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/staff/statements/page.tsx
git commit -m "feat: /staff/statements with statementAccess gate"
```

---

## Self-Review Checklist

- [x] Schema: `statementAccess` added (Task 1)
- [x] Session: `statementAccess` in `SessionUser` and DB select (Task 2)
- [x] API: `PATCH /api/accounts/[id]` handles `statementAccess` (Task 3)
- [x] UI toggle: StationManager staff table (Task 4)
- [x] Sidebar: all 5 roles updated (Task 5)
- [x] `/admin/statements`: cross-station, station picker (Task 6)
- [x] `/owner/vehicles`: per-station picker, ownership verified (Task 7)
- [x] `/owner/statements`: per-station picker, owned-only verification (Task 8)
- [x] `/staff/accounts`: read-only companies + vehicles (Task 9)
- [x] `/staff/statements`: gated by `statementAccess` (Task 10)
- [x] All server pages that pass `users` to StationManager updated to include `statementAccess` (Task 4 Step 5)
- [x] `nav_statements` i18n key checked (Task 5 Step 2)
- [x] No TBD, no "similar to above", all code blocks present
