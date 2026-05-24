# NullHold - Navigation Redesign Spec
**Date:** 2026-05-11  
**Status:** Approved for implementation

---

## Overview

Full navigation and sidebar redesign for all five roles: ADMIN, OWNER, MANAGER, STAFF, COMPANY.

Key goals:
- Each role has a consistent, complete sidebar (no missing pages)
- Search bar lives in the **topbar top-right** (already implemented)
- Staff can be granted statement access by ADMIN/OWNER/MANAGER (toggle per-staff)
- Admin has full cross-station privilege (no station scope restriction)
- Owner's Kenderaan is per-station (select station → see vehicles)

---

## 1. Sidebar Structure

All roles share the same layout: **Logo → Nav links → User footer**.  
The mobile hamburger remains. No changes to sidebar width or colour scheme.

### 1.1 ADMIN Sidebar

| Order | Label | Route | Notes |
|-------|-------|-------|-------|
| 1 | Dashboard | `/admin` | |
| 2 | Urus Akaun | `/admin/accounts` | All stations + users |
| 3 | Deposit | `/admin/deposits` | |
| 4 | Transaksi | `/admin/transactions` | |
| 5 | Kenderaan | `/admin/vehicles` | Station-scoped |
| 6 | Penyata | `/admin/statements` | **NEW** — all stations |
| 7 | Profil | `/admin/profile` | |

### 1.2 OWNER Sidebar

| Order | Label | Route | Notes |
|-------|-------|-------|-------|
| 1 | Dashboard | `/owner` | |
| 2 | Urus Akaun | `/owner/stations` | Lists all owned stations |
| 3 | Deposit | `/owner/deposits` | |
| 4 | Transaksi | `/owner/transactions` | |
| 5 | Kenderaan | `/owner/vehicles` | **NEW** — per-station picker |
| 6 | Penyata | `/owner/statements` | **NEW** |
| 7 | Profil | `/owner/profile` | |

### 1.3 MANAGER Sidebar

| Order | Label | Route | Notes |
|-------|-------|-------|-------|
| 1 | Dashboard | `/manager` | |
| 2 | Urus Akaun | `/manager/accounts` | |
| 3 | Deposit | `/manager/deposits` | |
| 4 | Transaksi | `/manager/transactions` | |
| 5 | Kenderaan | `/manager/vehicles` | |
| 6 | Penyata | `/manager/statements` | Already exists |
| 7 | Profil | `/manager/profile` | |

### 1.4 STAFF Sidebar

| Order | Label | Route | Notes |
|-------|-------|-------|-------|
| 1 | Dashboard | `/staff` | |
| 2 | Urus Akaun | `/staff/accounts` | **NEW** — read-only |
| 3 | Transaksi | `/staff/transactions` | |
| 4 | Penyata | `/staff/statements` | **NEW** — gated |
| 5 | Kenderaan | `/staff/vehicles` | |
| 6 | Profil | `/staff/profile` | |

### 1.5 COMPANY Sidebar

| Order | Label | Route | Notes |
|-------|-------|-------|-------|
| 1 | Dashboard | `/company` | |
| 2 | Deposit | `/company/deposits` | |
| 3 | Transaksi | `/company/transactions` | |
| 4 | Penyata | `/company/statements` | |
| 5 | Kenderaan | `/company/vehicles` | |
| 6 | Profil | `/company/profile` | |

---

## 2. Dashboard Cards Per Role

### 2.1 ADMIN Dashboard (`/admin`)

1. **Stesen Saya** — big card(s) linking to `/admin/accounts` (admin's station)
2. **Transaksi Hari Ini** — count + RM total
3. **Perlu Tindakan** — pending deposits count + pending vehicle approvals count (links to respective pages)
4. **Entri Terkini** — last 10 transactions (inline quick-view table)
5. **Penyata Pantas** — link to `/admin/statements`

### 2.2 OWNER Dashboard (`/owner`)

1. **Stesen Saya** — one card per owned station, big clickable → `/owner/stations/[id]`; shows staff count, company count, manager name, pending deposit badge
2. **+ Stesen Baru** button (top-right of heading row — already implemented)
3. **Transaksi Hari Ini** — across all owned stations
4. **Perlu Tindakan** — pending deposits across all stations
5. **Entri Terkini** — last 10 transactions across all stations

### 2.3 MANAGER Dashboard (`/manager`)

1. **Stesen Ini** — info card: name, address, manager name
2. **Transaksi Hari Ini** — count + RM total
3. **Perlu Tindakan** — pending deposits + pending vehicles
4. **Entri Terkini** — last 10 transactions
5. **Penyata Pantas** — link to `/manager/statements`

### 2.4 STAFF Dashboard (`/staff`)

1. **Stesen Ini** — info card (read-only: name, address)
2. **Rekod Pengisian Baru** — `FuelEntryForm` (already exists)
3. **Transaksi Hari Ini** — own count + RM total
4. **Kenderaan Aktif** — total at station
5. **Entri Terkini Saya** — last 10 own transactions

### 2.5 COMPANY Dashboard (`/company`)

1. **Akaun Saya** — company name, SSM, baki deposit, threshold alert
2. **Kenderaan Saya** — active/total count, link to `/company/vehicles`
3. **Transaksi Hari Ini** — own count + RM
4. **Perlu Tindakan** — pending vehicle approvals
5. **Entri Terkini** — last 10 own transactions

---

## 3. Staff Statement Gate

### 3.1 Schema Change

Add to `User` model in `schema.prisma`:
```prisma
statementAccess Boolean @default(false) @map("statement_access")
```

### 3.2 Toggle UI

In every place staff accounts are managed (ADMIN Urus Akaun, OWNER station Urus Akaun, MANAGER Urus Akaun), the staff list table gets an extra column **"Penyata"** with a toggle switch (on/off) per STAFF row. OWNER and MANAGER rows do not show this toggle (they always have access).

Clicking the toggle calls `PATCH /api/accounts/[userId]` with `{ statementAccess: true/false }`.

### 3.3 Access Enforcement

`/staff/statements` server page checks `session.statementAccess`. If false → renders a locked state card: _"Akses penyata belum dibenarkan. Hubungi Pengurus atau Pemilik."_ (not a redirect, just a visible lock screen within the page layout).

The sidebar nav item for Penyata is **always visible** to STAFF (so they know it exists), but the page itself shows the lock state.

### 3.4 API

`PATCH /api/accounts/[id]` — add `statementAccess` to the allowed PATCH fields. Only ADMIN, OWNER, MANAGER can set this field. STAFF cannot change their own.

---

## 4. New Pages

### 4.1 `/admin/statements` (NEW)

- Station picker dropdown (admin can pick any station in the system, or own station by default)
- Company picker within selected station
- Month picker
- Renders existing `StatementViewer` component
- Admin privilege: can query `prisma.station.findMany()` without ownerId filter

### 4.2 `/owner/vehicles` (NEW)

- Station picker: dropdown of all owned stations (required selection)
- Once station selected → shows vehicles table for that station (same columns as `/manager/vehicles`)
- `?stationId=` URL param for deep-linking
- Uses existing vehicle list/management components

### 4.3 `/owner/statements` (NEW)

- Station picker (owned stations only)
- Company picker (within selected station)
- Month picker
- Renders `StatementViewer`

### 4.4 `/staff/accounts` (NEW — read-only)

- Lists companies registered at the station (name, SSM, phone, baki, status)
- Each company row is expandable or links to a sub-view of their active vehicles (plate, type, fuel type, driver)
- No create/edit/delete actions — purely read-only for staff reference

### 4.5 `/staff/statements` (NEW — gated)

- If `session.statementAccess === false` → show lock state card
- If `session.statementAccess === true` → show company picker + month picker + `StatementViewer`
- Scope: own station only

---

## 5. Pages to Update

| Page | Change |
|------|--------|
| `Sidebar.tsx` | Update NAV config for all 5 roles to match spec |
| `/admin/accounts` (StationManager) | Add statementAccess toggle column for STAFF rows |
| `/owner/stations/[id]` (StationManager) | Add statementAccess toggle column for STAFF rows |
| `/manager/accounts` (StationManager) | Add statementAccess toggle column for STAFF rows |
| `StationManager.tsx` | Add toggle UI in staff table; call PATCH /api/accounts/[id] |
| `PATCH /api/accounts/[id]` | Accept `statementAccess` field |
| `getSession` / session type | Add `statementAccess: boolean` to `SessionUser` type and include it in the session cookie payload read from DB |

---

## 6. Schema Changes Summary

```prisma
// User model — add:
statementAccess Boolean @default(false) @map("statement_access")

// Transaction model — already added:
receiptUrl String? @map("receipt_url")
```

Run after changes:
```bash
npx prisma db push
npx prisma generate
```

---

## 7. Supabase Bucket

Create bucket **`transaction-receipts`** (public) in Supabase dashboard before deploying the receipt upload feature.

---

## 8. Implementation Order

1. Schema migration (`statementAccess` + `receiptUrl`) + `npx prisma db push` + `npx prisma generate`
2. Update `Sidebar.tsx` NAV config (all 5 roles)
3. Update `PATCH /api/accounts/[id]` to support `statementAccess`
4. Update `StationManager.tsx` — add statementAccess toggle column
5. Update `getSession` to include `statementAccess` in session
6. Build `/staff/accounts` (read-only)
7. Build `/staff/statements` (gated)
8. Build `/admin/statements`
9. Build `/owner/vehicles`
10. Build `/owner/statements`
11. Update dashboards (Admin, Owner, Manager, Staff, Company) to match card spec

---

## 9. Out of Scope (this spec)

- Push notifications for "Perlu Tindakan"
- Email alerts for low balance
- Statement PDF export (existing print functionality is sufficient)
- Vehicle approval workflow changes
