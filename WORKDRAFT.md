# NullHold - WORK DRAFT
> Status: CORE BUILD COMPLETE | Version: 1.0 | Date: 2026-05-11

---

## PROJECT OVERVIEW

Sistem pengurusan akaun bahan api untuk stesen minyak.
Menggantikan proses manual (slip kertas + kiraan tangan) kepada sistem web digital.

**Core Business Logic:**
- Syarikat afiliasi buat deposit ke stesen
- Setiap pengisian kenderaan → deduct dari deposit
- Sistem track balance, hantar alert, generate statement

---

## TECH STACK

```
Frontend   : Next.js 16 (App Router) + Tailwind CSS
Backend    : Next.js API Routes
Database   : PostgreSQL (Supabase)
Auth       : JWT (httpOnly cookie, 8h expiry) + bcrypt / Supabase Auth (email users)
File Store : Supabase Storage (deposit-proofs, vehicle-letters, avatars, company-agreements, statement-pdfs)
PDF        : @react-pdf/renderer
Email      : Resend
Hosting    : Vercel
Language   : Bilingual (BM / EN)
```

---

## DATABASE SCHEMA (ACTUAL — from prisma/schema.prisma)

### Enums
```
UserRole        : ADMIN | OWNER | MANAGER | STAFF | COMPANY
FuelType        : RON95 | RON97 | DIESEL | ALL
DepositStatus   : PENDING | APPROVED | REJECTED
VehicleStatus   : PENDING | APPROVED | REJECTED
StatementFreq   : BIWEEKLY | MONTHLY
Language        : BM | EN
```

### Table: stations
```sql
id          UUID PRIMARY KEY
name        VARCHAR
address     TEXT
phone       VARCHAR
token       VARCHAR UNIQUE   -- signup/invite token
owner_id    UUID FK → users  -- null jika tiada owner
created_at  TIMESTAMP
```

### Table: users
```sql
id                UUID PRIMARY KEY
station_id        UUID FK → stations  -- null untuk OWNER
name              VARCHAR
email             VARCHAR UNIQUE
phone             VARCHAR
password_hash     VARCHAR
role              UserRole
staff_id          VARCHAR             -- ADMIN / MANAGER / STAFF
position          VARCHAR
avatar_url        VARCHAR
language          Language DEFAULT BM
statement_access  BOOLEAN DEFAULT false  -- STAFF only gate
is_active         BOOLEAN DEFAULT true
reset_token       VARCHAR             -- bcrypt hash of temp password
reset_token_expiry TIMESTAMP
created_by_id     UUID FK → users
created_at        TIMESTAMP
updated_at        TIMESTAMP
```

**Note:** OWNER has `station_id = null`. Ownership tracked via `station.owner_id`.
**Note:** `statement_access` gated: if false, Staff sees lock card on Penyata page (not redirect).
**Note:** On temp-password login success, `password_hash ← reset_token`, then both cleared.

### Table: invite_codes
```sql
id          UUID PRIMARY KEY
code        VARCHAR UNIQUE
for_role    UserRole
station_id  UUID FK → stations
used_by_id  UUID FK → users (unique)
used_at     TIMESTAMP
expires_at  TIMESTAMP
created_by  UUID FK → users
created_at  TIMESTAMP
```

### Table: company_allowlist
```sql
id          UUID PRIMARY KEY
station_id  UUID FK → stations
ssm_no      VARCHAR
email       VARCHAR
created_by  UUID FK → users
used_at     TIMESTAMP
created_at  TIMESTAMP
UNIQUE(ssm_no, email)
```

### Table: companies
```sql
id                  UUID PRIMARY KEY
user_id             UUID FK → users (role=COMPANY, unique)
station_id          UUID FK → stations
company_name        VARCHAR
ssm_no              VARCHAR UNIQUE
pic_name            VARCHAR
company_phone       VARCHAR
company_email       VARCHAR
address             TEXT
deposit_balance     DECIMAL(10,2) DEFAULT 0
low_bal_threshold   DECIMAL(10,2) DEFAULT 500
statement_freq      StatementFreq DEFAULT MONTHLY
ssm_doc_url         VARCHAR
ssm_doc_name        VARCHAR
ssm_uploaded_at     TIMESTAMP
ssm_uploaded_by     UUID FK → users
agreement_url       VARCHAR
agreement_doc_name  VARCHAR
agreement_uploaded_at TIMESTAMP
agreement_uploaded_by UUID FK → users
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### Table: vehicles
```sql
id              UUID PRIMARY KEY
company_id      UUID FK → companies
plate_no        VARCHAR
vehicle_type    VARCHAR
driver_name     VARCHAR
fuel_type       FuelType
is_active       BOOLEAN DEFAULT false  -- hanya true selepas APPROVED
approval_status VehicleStatus DEFAULT PENDING
letter_url      VARCHAR               -- surat kebenaran
approved_by     UUID FK → users
reject_reason   VARCHAR
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

**Note:** Vehicle pendaftaran baru masuk sebagai PENDING. Admin/Owner/Manager luluskan → `is_active=true`.

### Table: transactions
```sql
id             UUID PRIMARY KEY
invoice_no     VARCHAR UNIQUE   -- INV-YYYY-NNNN
vehicle_id     UUID FK → vehicles
company_id     UUID FK → companies
station_id     UUID FK → stations
staff_id       UUID FK → users
date           DATE
fuel_type      FuelType         -- RON95 | RON97 | DIESEL (bukan ALL)
quantity_ltr   DECIMAL(10,3)
unit_price     DECIMAL(10,4)
amount         DECIMAL(10,2)
balance_before DECIMAL(10,2)
balance_after  DECIMAL(10,2)
receipt_url    VARCHAR          -- Supabase Storage path (optional resit)
deleted_at     TIMESTAMP        -- soft delete
archived_at    TIMESTAMP
created_at     TIMESTAMP
updated_at     TIMESTAMP
```

### Table: transaction_edits
```sql
id              UUID PRIMARY KEY
transaction_id  UUID FK → transactions
edited_by       UUID FK → users
action          VARCHAR          -- "edit" | "delete"
reason          VARCHAR
before_data     JSONB
after_data      JSONB
created_at      TIMESTAMP
```

### Table: deposits
```sql
id            UUID PRIMARY KEY
company_id    UUID FK → companies
station_id    UUID FK → stations
amount        DECIMAL(10,2)
proof_url     VARCHAR          -- Supabase Storage path
status        DepositStatus DEFAULT PENDING
approved_by   UUID FK → users
reject_reason TEXT
created_at    TIMESTAMP
updated_at    TIMESTAMP
```

### Table: statements
```sql
id            UUID PRIMARY KEY
company_id    UUID FK → companies
station_id    UUID FK → stations
period_start  DATE
period_end    DATE
opening_bal   DECIMAL(10,2)
total_deposit DECIMAL(10,2)
total_usage   DECIMAL(10,2)
closing_bal   DECIMAL(10,2)
pdf_url       VARCHAR
generated_by  UUID FK → users
created_at    TIMESTAMP
```

### Table: transactions_archive / deposits_archive
```sql
id            UUID PRIMARY KEY
archive_year  INT
archive_month INT
data          JSONB            -- full snapshot row
archived_at   TIMESTAMP
```

### Contact History (derived — no extra columns)
```
Displayed on Company Profile → Contact History tab
Computed via query:

last_deposit_at    → MAX(created_at) FROM deposits WHERE status=APPROVED
last_statement_at  → MAX(created_at) FROM statements
total_deposits     → COUNT(*) FROM deposits WHERE status=APPROVED
total_transactions → COUNT(*) FROM transactions WHERE deleted_at IS NULL
```

---

## PERMISSION MATRIX

```
FEATURE                  | ADMIN | OWNER | MANAGER | STAFF  | COMPANY
─────────────────────────┼───────┼───────┼─────────┼────────┼─────────
AUTH
  Login/Logout           |  ✅   |  ✅   |   ✅    |  ✅    |  ✅
  Forgot password        |  ✅   |  ✅   |   ✅    |  ✅    |  ✅
  Edit own profile       |  ✅   |  ✅   |   ✅    |  ✅    |  ✅
─────────────────────────┼───────┼───────┼─────────┼────────┼─────────
USER MANAGEMENT
  Create Owner account   |  ✅   |  ❌   |   ❌    |  ❌    |  ❌
  Create Manager account |  ✅   |  ✅ * |   ❌    |  ❌    |  ❌
  Create Staff account   |  ✅   |  ✅ * |  ✅ *   |  ❌    |  ❌
  Create Company account |  ✅   |  ❌   |  ✅ *   |  ❌    |  ❌
  Edit staff details     |  ✅   |  ✅ * |  ✅ *   |  ❌    |  ❌
  Suspend staff          |  ✅   |  ✅ * |  ✅ *†  |  ❌    |  ❌
  statementAccess toggle |  ✅   |  ✅ * |  ✅ *   |  ❌    |  ❌
─────────────────────────┼───────┼───────┼─────────┼────────┼─────────
DEPOSIT
  Submit deposit + bukti |  ✅   |  ❌   |   ✅    |  ❌    |  ✅
  Approve/Reject deposit |  ✅   |  ✅ * |  ✅ *   |  ❌    |  ❌
  Download deposit proof |  ✅   |  ✅ * |  ✅ *   |  ❌    |  ❌
  View deposit history   |  ✅   |  ✅ * |  ✅ *   |  ❌    | ✅ own
─────────────────────────┼───────┼───────┼─────────┼────────┼─────────
TRANSACTION
  Key in pengisian       |  ✅   |  ❌   |   ✅    |  ✅    |  ❌
  Edit / delete txn      |  ✅   |  ❌   |  ✅ *   | ✅ own  |  ❌
  View all (station)     |  ✅   |  ✅ * |  ✅ *   |  ❌    |  ❌
  View own (company)     |  ✅   |  ❌   |   ✅    |  ❌    | ✅ own
  View / download resit  |  ✅   |  ✅ * |  ✅ *   |  ✅ own | ✅ own
─────────────────────────┼───────┼───────┼─────────┼────────┼─────────
VEHICLES
  View list (read-only)  |  ✅   |  ✅ * |  ✅ *   |  ✅ *  | ✅ own
  Daftar kenderaan baru  |  ✅   |  ❌   |  ✅ *   |  ❌    | ✅ own
  Approve/Reject vehicle |  ✅   |  ✅ * |  ✅ *   |  ❌    |  ❌
  Toggle aktif/tidak     |  ✅   |  ✅ * |  ✅ *   |  ❌    | ✅ own
─────────────────────────┼───────┼───────┼─────────┼────────┼─────────
PENYATA
  Jana penyata           |  ✅   |  ✅ * |  ✅ *   |  ❌    |  ❌
  View / download        |  ✅   |  ✅ * |  ✅ *   |  ‡    | ✅ own
─────────────────────────┼───────┼───────┼─────────┼────────┼─────────
SYSTEM
  Semua stesen           |  ✅   |  ❌   |   ❌    |  ❌    |  ❌
  Stesen milik sendiri   |  —    |  ✅   |   —     |  —     |  —

*  = Scope terhad kepada stesen sendiri
†  = Manager tidak boleh suspend Manager lain atau diri sendiri
‡  = Hanya jika statementAccess = true (dibenarkan oleh Manager/Admin)
```

---

## PROFILE FIELDS PER ROLE

### Common (semua role)
- Nama penuh
- Email (login, unique)
- No telefon
- Password (boleh tukar)
- Gambar profil (optional)
- Bahasa UI (BM / EN)

### Admin + Manager + Staff (tambahan)
- No pekerja / Staff ID
- Jawatan
- Stesen ditugaskan (read-only — set by admin/manager)

### Affiliate Company (tambahan)
- Nama syarikat
- No pendaftaran SSM (locked selepas verify)
- Nama pegawai / PIC
- No telefon syarikat
- Alamat syarikat
- Email syarikat
- Low balance threshold (RM) — company set sendiri
- Keutamaan statement (2 minggu / 1 bulan)
- SSM cert upload (optional)
- Surat perjanjian (optional)

---

## MONTHLY HISTORY FORMAT

```
📋 APRIL 2026
─────────────────────────────────────────
Opening Balance    : RM 5,200.00
Total Deposit In   : RM 3,000.00
Total Pengisian    : RM 2,847.50
Closing Balance    : RM 5,352.50
─────────────────────────────────────────
TRANSACTIONS (24 rekod)
INV#  | Tarikh   | Plat   | Jenis | Jumlah
0041  | 01/04/26 | ABC123 | RON95 | RM 80.00
0042  | 02/04/26 | DEF456 | Disel | RM 120.00
...
─────────────────────────────────────────
[Download PDF]  [Download Excel]
```

---

## SEARCH FEATURES (LOCKED)

### Pattern A — Autocomplete Search (Staff: Plate Lookup)
```
Location  : Staff key-in screen (before key in pengisian)
Type      : Autocomplete input with debounce (300ms)
Search by : Plate number (partial match → show suggestions)
Shows     : Plate no, vehicle type, fuel type, company name
Behaviour : Staff type → system query vehicles table → show dropdown
            → Staff select → form auto-fill vehicle + company
API       : GET /api/vehicles/search?q={plate}&station_id={id}
Access    : Staff, Manager, Admin
```

### Pattern B — Filter Toolbar (Table Search)
Used on all history/management screens. Each screen has its own filter set.

#### Transaction History (Admin / Manager)
```
Filters   : Plate no, Company name, Invoice no, Date range,
            Fuel type (RON95 / RON97 / Diesel), Amount range
Sort by   : Date, Amount, Invoice no
Export    : Filter-aware (export filtered results only)
Access    : Admin (all), Manager (own station only)
```

#### Transaction History (Company view)
```
Filters   : Plate no, Date range, Fuel type, Amount range
Sort by   : Date, Amount
Access    : Company (own transactions only)
```

#### Vehicle Management
```
Filters   : Plate no, Driver name, Fuel type, Active/Inactive
Access    : Admin, Manager (own station), Company (own vehicles)
```

#### Company / User Management (Admin)
```
Filters   : Company name, SSM no, Balance status (low/normal),
            Active/Inactive, Registration date range
Access    : Admin only
```

#### Deposit History (Admin / Manager)
```
Filters   : Company name, Date range, Status (pending/approved/rejected),
            Amount range
Access    : Admin, Manager (own station)
```

---

## COMPANY PROFILE — TAB STRUCTURE

```
Company Profile Page
├── Tab 1: INFO
│   ├── Nama syarikat, SSM No, PIC, telefon, email, alamat
│   ├── Low balance threshold (editable by company)
│   ├── Statement frequency preference (2mg / 1bln)
│   └── Current deposit balance (large display, color-coded)
│
├── Tab 2: VEHICLES
│   ├── Vehicle list (plate, type, fuel type, driver, status)
│   ├── Search/filter bar (plate, driver, fuel type)
│   ├── Add vehicle button (company + manager + admin)
│   └── Edit / deactivate per vehicle
│
├── Tab 3: DOCUMENTS
│   ├── SSM Certificate
│   │   ├── Upload button (drag-and-drop or file picker)
│   │   ├── Preview link (PDF/image viewer)
│   │   ├── Upload date + uploaded by
│   │   └── Replace / Remove (admin/manager only)
│   ├── Surat Perjanjian
│   │   ├── Same upload pattern as SSM
│   │   └── Optional — show "Belum dimuat naik" if empty
│   └── File constraints: PDF/JPG/PNG only, max 5MB per file
│
└── Tab 4: CONTACT HISTORY
    ├── Last Deposit Top-Up    : [date] — RM [amount]
    ├── Last Statement Generated: [date] — [period]
    ├── Total Deposits (all time): [count] deposits / RM [total]
    ├── Total Transactions       : [count] transactions
    └── Member since             : [created_at]
```

---

## CSV EXPORT

All export points support **PDF + Excel + CSV** (3 format buttons).

| Export Location | Columns in CSV |
|-----------------|----------------|
| Transaction history | Invoice No, Date, Plate, Vehicle Type, Driver, Fuel Type, Litres, Unit Price (RM), Amount (RM), Balance Before, Balance After, Staff Name |
| Deposit history | Date, Amount (RM), Status, Approved By, Proof Ref |
| Vehicle list | Plate No, Vehicle Type, Driver Name, Fuel Type, Status, Date Added |
| Statement | Summary row + all transactions in period |
| Archive download (bulanan) | Same as transaction history + Archive Month/Year |

**Implementation note:** CSV generation happens server-side via API route — stream directly to download, no temp file needed.

---

## UI FEATURES — COMPLETE CHECKLIST

### Global Shell
```
✅ Sidebar navigation (role-based — different items per role)
✅ Top bar: user avatar, language toggle (BM/EN), notification bell
✅ Active page breadcrumb
✅ Logout button
✅ Responsive layout (sidebar collapses to hamburger on mobile)
```

### Notifications & Feedback
```
✅ Toast notifications (success / error / warning / info)
✅ Confirmation modal before destructive actions
   (delete vehicle, reject deposit, delete account)
✅ Loading skeleton on all data-fetch screens
✅ Empty state component ("Tiada rekod" with icon + CTA)
✅ In-app notification bell with unread count badge
✅ Notification list (low balance alert, deposit approved/rejected)
```

### Forms
```
✅ Client-side validation (required fields, format checks)
✅ Server-side validation (duplicate plate, SSM uniqueness)
✅ File upload component
   — Drag-and-drop zone
   — File type filter (PDF/JPG/PNG)
   — Size limit display (max 5MB)
   — Upload progress indicator
   — Preview after upload
✅ Date picker (single date + date range)
✅ Plate autocomplete (debounce 300ms, dropdown suggestions)
```

### Data Tables
```
✅ Pagination (10 / 25 / 50 rows per page selector)
✅ Sort by column (click header)
✅ Filter toolbar (per-screen filters)
✅ Export row (PDF | Excel | CSV buttons)
✅ Row actions menu (view / edit / delete)
✅ Receipt column (view blob URL + download via API proxy when available)
✅ Responsive: horizontal scroll on small screens
✅ Loading state (skeleton rows while fetching)
✅ Row count display ("Menunjukkan 1-25 daripada 147 rekod")
```

### Balance Display
```
✅ Balance card (large RM display on dashboard + company profile)
✅ Color coding:
   — Green  : balance > threshold
   — Yellow : balance ≤ threshold (low balance warning)
   — Red    : balance = 0 (transaction blocked)
✅ Threshold indicator line (shown on balance card)
✅ "Baki Rendah" badge on company row in table
```

### Dashboard (per role)
```
ADMIN
  ✅ Total companies, total transactions today, pending deposits
  ✅ Recent activity feed (last 10 actions)
  ✅ Companies with low balance (alert list)

MANAGER (same station only)
  ✅ Same as Admin but scoped to own station
  ✅ Pending deposit approval list (action required)

STAFF
  ✅ Quick-access key-in form (primary action, front and center)
  ✅ Today's transaction count + total RM
  ✅ Recent transactions (own entries)

COMPANY
  ✅ Current balance (large, color-coded)
  ✅ Last top-up info
  ✅ Recent transactions (own vehicles)
  ✅ Low balance alert banner (if triggered)
```

### Security / UX Guards
```
✅ Session timeout warning (5 min before expire — modal countdown)
✅ "Unsaved changes" warning (if user navigates away mid-form)
✅ Double-submit prevention (disable button after first click)
✅ File upload virus scan note (display only — actual scan optional)
✅ Print-friendly statement view (CSS @media print)
```

---

## BUILD STATUS

```
Phase 1 — Foundation                                    ✅ COMPLETE
  1.1  Project setup (Next.js 16 + Prisma + Supabase)
  1.2  Database schema + migrations
  1.3  Auth: login / logout / forgot password / temp password
  1.4  Role middleware + route protection (JWT httpOnly cookie)

Phase 2 — Core Features                                 ✅ COMPLETE
  2.1  Admin dashboard
  2.2  Owner dashboard (multi-station)
  2.3  Manager dashboard (own station)
  2.4  Staff dashboard (key in + plate autocomplete)
  2.5  Company dashboard (balance, vehicles)

Phase 3 — Business Logic                                ✅ COMPLETE
  3.1  Deposit flow (submit + proof + approve/reject + download)
  3.2  Transaction flow (key in + deduct + edit + soft delete)
  3.3  Vehicle management + approval flow (PENDING→APPROVED/REJECTED)
  3.4  Account management (create / edit inline / suspend)
  3.5  statementAccess gate for STAFF

Phase 4 — Navigation & Role Pages                       ✅ COMPLETE
  4.1  Sidebar nav per role (5 roles)
  4.2  admin/statements, owner/statements, manager/statements
  4.3  owner/vehicles (approval scope via station.ownerId)
  4.4  staff/accounts (read-only vehicle lookup)
  4.5  staff/statements (statementAccess gated)

Phase 5 — Statements & Export                           🔜 PARTIAL
  5.1  Statement viewer (StatementViewer component) ✅
  5.2  PDF generation (pdfmake)                     🔜
  5.3  Email notification (Resend)                  🔜
  5.4  Download bulanan + tahunan (filter-aware)    🔜

Phase 5.0 — Transaction Receipts                      ✅ COMPLETE
  5.0.1 Receipt upload proxy (`/api/transactions/[id]/receipt`)
  5.0.2 Receipt download proxy (`GET /api/transactions/[id]/receipt`)
  5.0.3 Transaction tables show view + download receipt actions

Owner transaction view now scopes by selected owned station and selected UTC date instead of flattening all owned stations into one 200-row feed.

Phase 6 — History & Archive                             🔜 PENDING
  6.1  Auto-archive job (12 bulan rolling)
  6.2  Annual summary (auto-generate January)

Phase 7 — Polish                                        🔜 PENDING
  7.1  Analytics/charts dashboard
  7.2  Mobile responsive audit
  7.3  Security hardening
```

---

## PENDING ITEMS

- [ ] PDF generation untuk penyata (pdfmake)
- [ ] Email notification (Resend) — low balance alert, deposit approved/rejected
- [ ] Auto-archive job (cron / Vercel cron)
- [ ] Annual summary auto-generate
- [ ] Analytics charts (balance trend, usage per vehicle)
- [ ] Statement template format — confirm dengan boss
- [ ] Mobile responsive audit
