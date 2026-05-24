# NullHold - MEMORY STATE
> Session: 2026-05-17 | Status: TABLE WORKSPACE + VEHICLE DETAIL CHECKPOINT SAVED

---

## CROSS-REFERENCE CHECKPOINT — 2026-05-17

- NullHold continuity checkpoint is aligned to EFF V2 Codex runtime session `#172`.
- EFF V2 side should be resumed under project `NullHold`, with recent governed work covering:
  - Phase 6 table workspace + mobile scroll upgrade
  - Phase 7 vehicle full detail pages
- NullHold-side cross-reference files for this checkpoint:
  - `PHASE_TRACKER.md`
  - `PATCHLOG.md`
  - `CLAUDE_HANDOFF.md`
- If resuming later, verify EFF V2 latest save and NullHold `PHASE_TRACKER.md` agree before continuing implementation or QA.

---

## LOCKED DECISIONS

| # | Decision | Value |
|---|----------|-------|
| 1 | Station Manager approve deposit | Balance terus naik (no double-approve) |
| 2 | Admin override deposit | ✅ Admin boleh reverse/override |
| 3 | Archive location | Same database, table berasingan |
| 4 | Active data window | 12 bulan terkini |
| 5 | Archive trigger | Auto-move setiap 1hb bulan |
| 6 | Archive access | Company: own only. Admin/Manager: semua (audit) |
| 7 | Low balance alert | In-app + Email |
| 8 | Statement cycle | Company pilih: 2 minggu atau 1 bulan |
| 9 | Invoice no | Auto-generate (system) |
| 10 | Staff vehicle access | VIEW only (untuk semak plat sebelum key in) |
| 11 | UI language | Bilingual — BM + EN |
| 12 | Multi-station | Future v2.0, fokus 1 stesen dulu |
| 13 | Balance too low (< threshold) | Transaction proceed + alert |
| 14 | Balance zero/insufficient | Block transaction, notify staff |
| 15 | Low balance threshold | Custom per company (company set sendiri) |

---

## TECH STACK (LOCKED)

```
Framework  : Next.js 14 (App Router)
Database   : PostgreSQL
Auth       : JWT + bcrypt
PDF Gen    : pdfmake
Email      : Resend
Hosting    : Vercel
```

---

## ROLES (LOCKED)

| Role | Scope |
|------|-------|
| Admin | Kawalan penuh, semua stesen, semua data |
| Station Manager | Stesen sendiri sahaja |
| Staff | Key in pengisian sahaja |
| Affiliate Company | Self-service akaun sendiri |

---

## LOCKED FEATURES (ADDED AFTER INITIAL PLAN)

| # | Feature | Detail |
|---|---------|--------|
| 16 | Search — Staff plate lookup | Autocomplete, debounce 300ms, GET /api/vehicles/search |
| 17 | Search — Transaction history | Filter toolbar: plate, company, invoice, date range, fuel, amount |
| 18 | Search — Company view | Filter: plate, date range, fuel type, amount |
| 19 | Search — Vehicle management | Filter: plate, driver, fuel type, active status |
| 20 | Search — Company/User mgmt | Filter: name, SSM, balance status, active status |
| 21 | Search — Deposit history | Filter: company, date range, status, amount |
| 22 | CSV export | All history/statement screens: PDF + Excel + CSV (3 buttons) |
| 23 | Company Profile — Document Tab | SSM cert + Surat Perjanjian upload (PDF/JPG/PNG, max 5MB) |
| 24 | Company Profile — Contact History | Last top-up, last statement, total counts — derived via query |
| 25 | Transaction schema — litres | quantity_ltr + unit_price added to transactions table |
| 26 | UI: Balance color-coding | Green/Yellow/Red based on threshold |
| 27 | UI: Toast notifications | Success/error/warning/info across all screens |
| 28 | UI: Confirmation modals | Before delete, reject, destructive actions |
| 29 | UI: Loading skeletons | All data-fetch screens |
| 30 | UI: Session timeout warning | 5-min countdown modal before JWT expires |
| 31 | UI: Double-submit prevention | Disable button after first click on all forms |
| 32 | UI: Print-friendly statement | CSS @media print on statement view |

---

## PENDING / NOT YET DECIDED

- [ ] Statement template exact — tunggu boss user bagi format
- [ ] Invoice format string — contoh `INV-2026-0001` (belum confirm)
- [ ] Email template design
- [ ] Low balance default threshold (RM) — user pilih custom, tapi ada default?
- [ ] Build sequence — belum start (user belum pilih start point)

---

## SESSION CONTEXT

- User: Bekerja di stesen minyak
- Project purpose: Digitize manual slip-based fuel account system
- Current process: Kertas slip, kiraan manual, statement manual
- Goal: Web app dengan database untuk replace semua manual process
- Build state: Table workspace and vehicle detail upgrades implemented; latest local governed checkpoint tied to EFF V2 session `#172`
- Latest fixes saved:
  - transaction receipt flow now awaits upload and shows clear failure toast
  - `Resit` view/download actions wired through transaction tables
  - owner transactions scoped by station + date
  - owner/manager statement filters now use dependent company picker
  - top-right search now supports station/company/vehicle/invoice routing
- Latest NullHold UX phases saved:
  - Phase 6: shared Excel-like table workspace, mobile-safe scroll, toolbar standardization
  - Phase 7: full vehicle detail pages under manager/admin/owner/company/staff routes
- Verified: `npm run build` passed after the latest patch set
- Next step:
  - complete authenticated browser smoke test
  - verify manager vehicle detail page and related receipt/letter actions
  - verify table workspace flows across vehicles, transactions, deposits, and accounts
  - continue admin/owner/manager menu IA restructuring if user still wants the numbered menu model

---

## LATEST SESSION UPDATE — 2026-05-15 (Session #56)

- Committed all session #52 work (141 files, `baeb8b8`) — Phase 2-5 complete
- Supabase RLS applied via SQL editor (prerequisites block + supabase_rls.sql)
- All 3 Supabase Storage buckets confirmed: `avatars` (public), `company-agreements` (private), `statement-pdfs` (private)
- `POST /api/statements` — fixed: `getPublicUrl` → `createSignedUrl` (1-year expiry) for private bucket
- `GET /api/companies/[id]/agreement` — new endpoint: generates 1-hour signed URL, redirects to doc
- `POST/DELETE /api/companies/[id]/agreement` — OWNER access check fixed (was using null stationId)
- `StationManager` — Dokumen column added to Syarikat tab; works for admin, manager, owner
- WORKDRAFT.md updated: Vercel Blob → Supabase Storage, Prisma removed from stack
- Latest commit: `e5fad2e`
- Pending QA: create txn with photo → verify Lihat/Muat turun; owner+manager statement generation end-to-end
