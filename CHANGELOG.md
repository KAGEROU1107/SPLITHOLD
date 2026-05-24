# NullHold - CHANGELOG

---

## [Unreleased] 2026-05-21 - NullHold Rebrand

### Changed
- Product identity moved to `NullHold` across source branding, package metadata, cookie naming, demo seed data, email copy, PDF/export headers, and Vercel project metadata.
- Cookie renamed: `nullhold_token`.
- Demo seed emails updated to `@nullhold.test`.
- Demo station token updated to `NULLHOLD-TEST-001`.
- GitHub target repository: `KAGEROU1107/NullHold`.
- GitHub repository renamed to `KAGEROU1107/NullHold`.
- Vercel project/domain renamed to `nullhold` / `nullhold.vercel.app`.
- Supabase display name renamed to `NullHold`; project ref remains unchanged: `ivizemwavexgzwlvjucy`.

---

## [v0.1.0] 2026-05-20 - SlipVault Rebrand (Full Ship)

### Changed
- Full rebrand from "Petron Akaun" → "SlipVault" across all source, config, docs, emails, and PDF exports
- Cookie renamed: `slipvault_token` (was `petron_token`)
- Demo seed emails updated to `@slipvault.test` (was `@petron.com`)
- Demo station token: `SLIPVAULT-TEST-001` (was `PETRON-TEST-001`)
- BrandMark component added: `src/components/brand/BrandMark.tsx`
- Auth layout updated with SlipVault side banner (desktop) + compact brand mark (mobile)
- GitHub repo renamed: `KAGEROU1107/SlipVault`
- Vercel project renamed: `slipvault`
- Vercel domain alias: `petron-akaun.vercel.app` → `slipvault.vercel.app`

### Security
- `scripts/supabase-init.mjs`: hardcoded credentials replaced with `process.env` references

---

## [BUILD] 2026-05-11 — Transaction receipt table parity + owner station filter

### Fixed
- `TransactionTable` now shows a `Resit` column with:
  - view action via blob URL (`ExternalLink`)
  - download action via `/api/transactions/[id]/receipt`
- `owner/transactions` no longer mixes all owned stations into one flat feed
  - added owned-station picker
  - added daily date filter
  - totals now reflect the selected station/day slice

### Audit Notes
- Receipt proxy route already existed and did not need further API changes.
- `TxnActionsTable` already had receipt actions; the remaining gap was plain `TransactionTable`.
- Company/dashboard callers already pass Prisma rows compatible with the new `receiptUrl` field.

---

## [PLANNING] 2026-05-02 — Session 2

### Added
- Search features locked across all screens
  - Pattern A: Plate autocomplete (debounce 300ms) for staff key-in
  - Pattern B: Filter toolbar for all history/management tables
- CSV export added alongside PDF + Excel on all history/statement screens
- Company Profile redesigned as 4-tab layout (Info / Vehicles / Documents / Contact History)
- Document Tab spec locked:
  - SSM cert upload (optional, PDF/JPG/PNG, max 5MB, drag-drop)
  - Surat Perjanjian upload (optional, same spec)
  - Preview, Replace, Remove actions
- Contact History tab (derived queries — no new DB columns)
  - Last deposit, last statement, total counts, member since
- Full UI components checklist (35+ items):
  - Toast notifications, confirmation modals, loading skeletons
  - Balance color-coding (Green/Yellow/Red)
  - Session timeout warning, double-submit prevention
  - Print-friendly statement view
- Workflow diagrams updated: v1.3 (Flows 7 + 8 added)
- Balance State Machine diagram added

### Schema Changes
- `transactions` table: added `quantity_ltr DECIMAL(10,3)` and `unit_price DECIMAL(10,4)`
- `companies` table: added `ssm_doc_name`, `ssm_uploaded_at`, `ssm_uploaded_by`,
  `agreement_doc_name`, `agreement_uploaded_at`, `agreement_uploaded_by`

### Research
- Competitive analysis vs Fuelbook, FuelCloud, Fleetio, AtoB, Verizon Connect
- Finding: all competitors track litres — added to our schema
- Finding: our deposit-approval model is unique, not found in competitors

### Pending (unchanged)
- Statement template exact (tunggu boss format)
- Invoice format string (suggestion: INV-2026-0001)
- Build sequence — user belum pilih start point

---

## [PLANNING] 2026-05-01 — Session 1

### Added
- Konsep awal sistem defined
- 4 roles ditetapkan: Admin, Station Manager, Staff, Affiliate Company
- Permission matrix v1.1 locked
- 5 core workflows didesign:
  - Flow 1: Onboarding (new company)
  - Flow 2: Deposit top up
  - Flow 3: Pengisian bahan api
  - Flow 4: Statement generation
  - Flow 5: Low balance alert cycle
- Database schema high-level didesign (7 tables)
- Profile fields per role defined
- Data retention policy locked (12 bulan active, auto-archive lepas)
- Archive strategy: same DB, table berasingan, auto-run 1hb bulan
- Monthly history view + Annual summary planned
- Tech stack locked: Next.js + PostgreSQL + JWT + pdfmake + Resend + Vercel

### Decisions
- Station Manager boleh approve/reject deposit (balance terus naik)
- Staff boleh VIEW vehicle list (untuk semak plat)
- Semua user boleh edit own profile + delete own account
- Low balance: custom threshold per company
- Balance zero/insufficient: block transaction
- Archive access: company own only, Admin/Manager boleh semua

### Pending
- Statement template exact (tunggu boss format)
- Invoice format string
- Build sequence belum dipilih

---

## ROADMAP

### v1.0 — CORE (Target: TBD)
- Auth system (login/logout/signup + token gate)
- Role-based dashboard (4 roles)
- Transaction entry: plate autocomplete + liter + harga + RM
- Deposit management + proof upload + approval flow
- Balance deduction logic (+ state machine: Normal/Low/Blocked)
- Search: plate autocomplete (staff), filter toolbar (all tables)
- Company Profile (4 tabs: Info / Vehicles / Documents / Contact History)
- Document upload (SSM cert + Surat Perjanjian, Vercel Blob)
- UI: Toast, modals, skeletons, balance color-coding

### v1.1 — STATEMENTS & ALERTS (Target: TBD)
- PDF + Excel + CSV statement generator
- Statement download (company side)
- Low balance in-app alert
- Email notification (Resend)
- Print-friendly statement view

### v1.2 — ANALYTICS (Target: TBD)
- Dashboard charts (balance trend, liter usage per vehicle)
- Per-vehicle consumption breakdown (liter + RM)
- Date range filter across all screens

### v1.3 — HISTORY & ARCHIVE (Target: TBD)
- Monthly history view (PDF/Excel/CSV download)
- Auto-archive job (12 bulan rolling window)
- Annual summary auto-generate (January trigger)
- Download bulanan + tahunan (filter-aware)

### v2.0 — MULTI-STATION (Target: Future)
- Multi-station support
- Cross-station reporting
- Station-level settings
