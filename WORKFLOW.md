# NullHold - SYSTEM WORKFLOW
> Version: 2.0 | Date: 2026-05-11

---

## SYSTEM OVERVIEW

```
┌─────────────────────────────────────────────────────────────────┐
│                     NullHold SYSTEM                          │
└─────────────────────────────────────────────────────────────────┘

  [COMPANY]                [STATION]               [SYSTEM]
      │                       │                       │
      │  1. Register +         │                       │
      │     Station Token ────►│                       │
      │                       │  2. Verify Token ─────►│
      │                       │◄── Account Created ────│
      │                       │                       │
      │  3. Upload Documents   │                       │
      │     (SSM / Perjanjian) │                       │
      │─────────────────────────────────────────────►  │
      │                       │                       │
      │  4. Top Up Deposit ───►│                       │
      │     + Upload Bukti     │  5. Manager Approve ──►│
      │                       │◄── Balance Updated ────│
      │                       │                       │
      │         ┌─────────────────────────────────┐   │
      │         │        PENGISIAN BERLAKU         │   │
      │         │  Staff key in:                  │   │
      │         │  • No Plat (autocomplete)       │   │
      │         │  • Jenis Bahan Api               │   │
      │         │  • Liter (kuantiti)             │   │
      │         │  • Harga/Liter (unit price)     │   │
      │         │  • Jumlah RM (auto-calc)        │   │
      │         │  • No Invoice (auto-gen)        │   │
      │         └─────────────────────────────────┘   │
      │                       │                       │
      │                       │  6. Deduct Deposit ───►│
      │◄── Balance Notify ─────│◄── Updated Balance ───│
      │                       │                       │
      │         ┌─────────────────────────────────┐   │
      │         │     LOW BALANCE TRIGGER          │   │
      │         │  Deposit < Threshold (custom)    │   │
      │         │  → Alert in-app                 │   │
      │         │  → Email Notification           │   │
      │         └─────────────────────────────────┘   │
      │                       │                       │
      │         ┌─────────────────────────────────┐   │
      │         │     STATEMENT CYCLE              │   │
      │         │  Every 2 weeks / 1 month        │   │
      │         │  Admin/Manager → Generate       │   │
      │         │  Output: PDF | Excel | CSV      │   │
      │         │  Company → Download Statement   │   │
      │         └─────────────────────────────────┘   │
```

---

## FLOW 1 — ONBOARDING (NEW COMPANY)

```
  [ADMIN/MANAGER]              [SYSTEM]                  [COMPANY]
       │                          │                          │
       │  1. Jana token unik      │                          │
       │─────────────────────────►│                          │
       │                          │  Token stored in DB      │
       │                          │                          │
       │  2. Bagi token           │                          │
       │  kepada company          │                          │
       │─────────────────────────────────────────────────────►│
       │                          │                          │
       │                          │  3. Company Sign Up      │
       │                          │◄─────────────────────────│
       │                          │  (email + token)         │
       │                          │                          │
       │                          │  4. Verify token ✅      │
       │                          │  Create account          │
       │                          │─────────────────────────►│
       │                          │  Account Ready           │
       │                          │                          │
       │                          │  5. Company upload docs  │
       │                          │◄─────────────────────────│
       │                          │  SSM cert (optional)     │
       │                          │  Surat Perjanjian (opt.) │
       │                          │  → Stored in Vercel Blob │
```

---

## FLOW 2 — DEPOSIT TOP UP

```
  [COMPANY]              [SYSTEM]              [MANAGER/ADMIN]
      │                     │                        │
      │  1. Submit deposit   │                        │
      │  + upload resit      │                        │
      │─────────────────────►│                        │
      │                      │  Status: PENDING       │
      │                      │  Notify manager ──────►│
      │                      │                        │
      │                      │  2. Manager semak resit│
      │                      │◄───────────────────────│
      │                      │  [APPROVE] atau [REJECT]
      │                      │                        │
      │  ┌───────────────────┴──────────────────────┐ │
      │  │ IF APPROVE:                              │ │
      │  │  • Balance += amount (terus naik)        │ │
      │  │  • Status = APPROVED                    │ │
      │  │  • Notify company ✅                    │ │
      │  ├──────────────────────────────────────────┤ │
      │  │ IF REJECT:                               │ │
      │  │  • Status = REJECTED                    │ │
      │  │  • Reason wajib diisi                   │ │
      │  │  • Notify company ❌                    │ │
      │  └──────────────────────────────────────────┘ │
      │◄─────────────────────│                        │
```

---

## FLOW 3 — PENGISIAN BAHAN API (UPDATED)

```
  [KENDERAAN TIBA]    [STAFF]              [SYSTEM]           [COMPANY]
         │               │                    │                   │
         │  1. Tunjuk     │                   │                   │
         │  slip/plat ───►│                   │                   │
         │               │  2. Plate autocomplete search         │
         │               │  (debounce 300ms) ►│                   │
         │               │◄── Suggestions ────│                   │
         │               │  [ABC 1234 — Syarikat X — RON95]      │
         │               │  Select → auto-fill form              │
         │               │                    │                   │
         │               │  3. Key in data    │                   │
         │               │───────────────────►│                   │
         │               │  • No Plat         │                   │
         │               │  • Jenis Bahan Api │                   │
         │               │  • Kuantiti (Liter)│                   │
         │               │  • Harga/Liter     │                   │
         │               │  • Jumlah RM       │                   │
         │               │    (auto = L × RM) │                   │
         │               │                    │                   │
         │               │  ┌─────────────────┴───────────────┐  │
         │               │  │ IF balance CUKUP:               │  │
         │               │  │  • Deduct balance               │  │
         │               │  │  • Auto-gen invoice no          │  │
         │               │  │  • Save transaction ✅          │  │
         │               │  │  • Optional receipt URL stored  │  │
         │               │  │  • Record: liter + harga + RM   │  │
         │               │  ├─────────────────────────────────┤  │
         │               │  │ IF balance RENDAH (< threshold):│  │
         │               │  │  • Transaction proceed          │  │
         │               │  │  • Alert low balance ⚠️        │──►│
         │               │  │  • Email notification           │  │
         │               │  ├─────────────────────────────────┤  │
         │               │  │ IF balance TAK CUKUP / ZERO:    │  │
         │               │  │  • Block transaction ❌         │  │
         │               │  │  • Notify staff                 │  │
         │               │  └─────────────────────────────────┘  │
         │               │◄───────────────────│                   │
``` 

### Receipt Access

```
  [USER]                 [SYSTEM]                  [BLOB / API]
     │                       │                           │
     │  1. Open transaction   │                           │
     │     table              │                           │
     │──────────────────────►│                           │
     │                       │  2. If receipt_url exists │
     │                       │  show 2 actions:          │
     │                       │  • ExternalLink           │
     │                       │  • Download proxy         │
     │                       │                           │
     │  3a. Click view ─────────────────────────────────►│
     │      open blob URL     │                           │
     │                        │                           │
     │  3b. Click download    │                           │
     │      /api/transactions/│                           │
     │      [id]/receipt ───►│  4. Authorize by role     │
     │                       │  + station/company scope  │
     │                       │──────────────────────────►│
     │◄──────────────────────│  Stream file back         │
```

---

## FLOW 4 — STATEMENT GENERATION (UPDATED)

```
  [MANAGER/ADMIN]           [SYSTEM]                  [COMPANY]
        │                      │                           │
        │  1. Pilih company     │                           │
        │  + tarikh range      │                           │
        │─────────────────────►│                           │
        │                      │  2. Compile data:         │
        │                      │  • Semua transaction      │
        │                      │    dalam tempoh           │
        │                      │  • Per-vehicle breakdown  │
        │                      │  • Opening balance        │
        │                      │  • Total liter + RM       │
        │                      │  • Closing balance        │
        │                      │                           │
        │                      │  3. Generate output       │
        │                      │  ┌──────────────────────┐ │
        │                      │  │ PDF   (pdfmake)      │ │
        │                      │  │ Excel (.xlsx)        │ │
        │                      │  │ CSV   (stream)       │ │
        │                      │  └──────────────────────┘ │
        │◄─────────────────────│                           │
        │  Preview statement   │                           │
        │  [PDF][Excel][CSV]   │                           │
        │                      │  4. Notify company ──────►│
        │                      │  Statement ready          │
        │                      │                           │
        │                      │◄──────────────────────────│
        │                      │  5. Company download      │
        │                      │  pilih format             │
        │                      │  PDF / Excel / CSV        │
```

---

## FLOW 5 — LOW BALANCE ALERT

```
  [SYSTEM — AFTER EVERY TXN]         [COMPANY]           [MANAGER]
           │                              │                   │
           │  Check: balance < threshold? │                   │
           │                              │                   │
     ┌─────┴──────────────────┐           │                   │
     │ Threshold:             │           │                   │
     │  Custom per company    │           │                   │
     │  (company set sendiri) │           │                   │
     └─────┬──────────────────┘           │                   │
           │                              │                   │
           │  IF YES → Trigger alert      │                   │
           │─────────────────────────────►│  In-app notif ⚠️ │
           │──────────────────────────────────────────────────►│
           │                              │  Email sent       │
           │                              │                   │
           │  Company top up ────────────►│  → back to Flow 2 │
```

---

## FLOW 6 — DATA ARCHIVE (MONTHLY AUTO)

```
  [SYSTEM — AUTO, 1hb SETIAP BULAN]
           │
           │  1. Scan active tables
           │  → Cari rekod > 12 bulan
           │
           │  2. Copy → archive tables
           │  (transactions_archive, deposits_archive, etc.)
           │  → Indexed by year-month
           │
           │  3. Delete dari active tables
           │  → Active DB stays lean & fast
           │
           │  4. Log archival event
           │  "Archived: 847 records → 2025-03"
           │
           │  5. IF January → Generate Annual Summary PDF
           │  → Auto-simpan dalam archive storage
```

---

## FLOW 7 — SEARCH & FILTER

```
  PATTERN A — AUTOCOMPLETE (Staff plate lookup)
  ─────────────────────────────────────────────
  Staff type "ABC"
       │
       │  Debounce 300ms
       │
       ▼
  GET /api/vehicles/search?q=ABC&station_id=...
       │
       ▼
  DB: SELECT * FROM vehicles
      WHERE plate_no ILIKE '%ABC%'
      AND company.station_id = ?
      AND is_active = true
       │
       ▼
  Return: [{plate, vehicle_type, fuel_type, company_name}]
       │
       ▼
  Dropdown shows → Staff select → Form auto-fills


  PATTERN B — FILTER TOOLBAR (Tables)
  ─────────────────────────────────────────────
  User sets filters → Apply button
       │
       ▼
  Build query: WHERE plate ILIKE ?
               AND company_id = ?
               AND date BETWEEN ? AND ?
               AND fuel_type = ?
               AND amount BETWEEN ? AND ?
       │
       ▼
  Paginated results (10/25/50 per page)
       │
       ▼
  Export: PDF | Excel | CSV  ← uses same filters
```

---

## FLOW 8 — DOCUMENT UPLOAD (COMPANY PROFILE)

```
  [COMPANY / ADMIN / MANAGER]       [SYSTEM]          [VERCEL BLOB]
            │                           │                    │
            │  1. Go to Profile →       │                    │
            │     Documents tab         │                    │
            │                           │                    │
            │  2. Upload SSM cert       │                    │
            │  (drag-drop / picker)     │                    │
            │──────────────────────────►│                    │
            │                           │  Validate:         │
            │                           │  • PDF/JPG/PNG only│
            │                           │  • Max 5MB         │
            │                           │──────────────────►│
            │                           │◄── Blob URL ───────│
            │                           │                    │
            │                           │  Save to DB:       │
            │                           │  ssm_doc_url       │
            │                           │  ssm_doc_name      │
            │                           │  ssm_uploaded_at   │
            │◄── Preview link ──────────│                    │
            │                           │                    │
            │  3. View / Replace / Remove                    │
            │  (Admin/Manager can manage, Company can upload)│
```

---

## COMPANY PROFILE — TAB LAYOUT

```
┌──────────────────────────────────────────────────────────────┐
│  COMPANY PROFILE                                             │
│  ┌──────┐ ┌──────────┐ ┌───────────┐ ┌─────────────────┐   │
│  │ INFO │ │ VEHICLES │ │ DOCUMENTS │ │ CONTACT HISTORY │   │
│  └──────┘ └──────────┘ └───────────┘ └─────────────────┘   │
├──────────────────────────────────────────────────────────────┤
│  INFO TAB                                                    │
│  ┌────────────────────────────────────────────────────┐     │
│  │ Nama Syarikat   : [__________________________]     │     │
│  │ No SSM          : [__________] (locked post-verify)│     │
│  │ Nama PIC        : [__________________________]     │     │
│  │ No Tel Syarikat : [__________________________]     │     │
│  │ Email Syarikat  : [__________________________]     │     │
│  │ Alamat          : [__________________________]     │     │
│  │                                                    │     │
│  │ Low Balance Alert: RM [_____]  (custom)            │     │
│  │ Statement Freq   : [2 Minggu ▼] / [1 Bulan ▼]     │     │
│  │                                                    │     │
│  │ ┌──────────────────────────────────────────────┐   │     │
│  │ │  BAKI SEMASA                                 │   │     │
│  │ │  RM 4,250.00  ████████████░░░  (CUKUP)      │   │     │
│  │ └──────────────────────────────────────────────┘   │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  DOCUMENTS TAB                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │  📄 SSM Certificate                                │     │
│  │  ┌──────────────────────────────────────────┐      │     │
│  │  │  [ Drag & Drop atau Pilih Fail ]         │      │     │
│  │  │  PDF / JPG / PNG — Max 5MB              │      │     │
│  │  └──────────────────────────────────────────┘      │     │
│  │  Dimuat naik: 2026-04-10 oleh Ahmad (Manager)      │     │
│  │  [Preview] [Ganti] [Buang]                         │     │
│  │                                                    │     │
│  │  📄 Surat Perjanjian                               │     │
│  │  Status: Belum dimuat naik                         │     │
│  │  ┌──────────────────────────────────────────┐      │     │
│  │  │  [ Drag & Drop atau Pilih Fail ]         │      │     │
│  │  └──────────────────────────────────────────┘      │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  CONTACT HISTORY TAB                                         │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Ahli Sejak         : 12 Jan 2026                  │     │
│  │  Top Up Terakhir    : 28 Apr 2026 — RM 2,000.00    │     │
│  │  Statement Terakhir : 01 Apr 2026 — Mac 2026       │     │
│  │  Jumlah Deposit     : 8 kali / RM 18,500.00        │     │
│  │  Jumlah Transaksi   : 147 rekod                    │     │
│  └────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────┘
```

---

## ROLE HIERARCHY

```
┌────────────────────────────────────────────────────┐
│                    ROLE TREE                       │
├────────────────────────────────────────────────────┤
│                                                    │
│  👑 ADMIN                                          │
│   ├── Manage ALL users (create/edit/suspend)       │
│   │   (semua role termasuk Owner)                  │
│   ├── View ALL stations data                       │
│   ├── Approve/Reject deposits (all stations)       │
│   ├── Approve/Reject vehicles (all stations)       │
│   ├── Generate + view penyata (all companies)      │
│   ├── Download deposit proof (all)                 │
│   ├── statementAccess toggle untuk STAFF           │
│   └── Edit own profile                            │
│                                                    │
│  🏠 OWNER                                          │
│   ├── View + manage stesen milik sendiri           │
│   │   (ownership: station.owner_id === session.id) │
│   ├── Create Manager + Staff di stesen sendiri     │
│   ├── Approve/Reject deposits (owned stations)     │
│   ├── Approve/Reject vehicles (owned stations)     │
│   ├── View penyata (owned stations)                │
│   ├── statementAccess toggle untuk STAFF           │
│   ├── station_id = null (bukan assigned ke stesen) │
│   └── Edit own profile                            │
│                                                    │
│  🏢 MANAGER                                        │
│   ├── Create Staff + Company (own station only)    │
│   ├── Edit / suspend Staff (own station)           │
│   │   TIDAK boleh: suspend Manager lain / diri     │
│   ├── Approve/Reject deposits (own station)        │
│   ├── Approve/Reject vehicles (own station)        │
│   ├── View + generate penyata (own station)        │
│   ├── statementAccess toggle untuk STAFF           │
│   ├── Key in pengisian                            │
│   └── Edit own profile                            │
│                                                    │
│  👷 STAFF                                          │
│   ├── Key in pengisian                            │
│   │   (plate autocomplete → liter → harga → RM)  │
│   ├── Edit own entries (dengan sebab)             │
│   ├── View vehicle list (read-only, semak plat)   │
│   ├── View penyata — HANYA jika statementAccess   │
│   │   = true. Jika false: lock card (tidak redirect│
│   │   dan tidak sembunyi dari nav)                │
│   └── Edit own profile                            │
│                                                    │
│  🏭 AFFILIATE COMPANY                              │
│   ├── Daftar kenderaan baru (masuk sebagai PENDING)│
│   ├── Top up deposit + upload proof               │
│   ├── Upload dokumen (SSM / Surat Perjanjian)     │
│   ├── View own balance (live, color-coded)        │
│   ├── View penyata + download                     │
│   ├── View per-vehicle usage (liter + RM)         │
│   ├── Set low balance threshold                   │
│   ├── Set statement frequency (2mg/1bln)          │
│   └── Edit own profile                            │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## DASHBOARD VIEWS (UPDATED)

```
  ┌─────────────────────────────────────────────────────────────────────┐
  │  👑 ADMIN                                                           │
  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
  │  │ Total    │ │ Pending  │ │ Txn Today│ │ Low Bal  │ │Statement │ │
  │  │ Users    │ │ Deposits │ │ (count+RM│ │ Companies│ │ Generate │ │
  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
  │  Recent Activity Feed (last 10 actions)                             │
  │  [Search bar — company / invoice / plate]                           │
  └─────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────┐
  │  🏢 STATION MANAGER                                                 │
  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
  │  │ Staff /  │ │ ⚠️ Approve│ │ Txn Today│ │ Low Bal  │ │Statement │ │
  │  │ Companies│ │ Deposits │ │ own stn  │ │ Alert    │ │ Generate │ │
  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
  │  Deposit approval queue (action required — most prominent)          │
  └─────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────┐
  │  👷 STAFF                                                           │
  │  ┌──────────────────────────────────────────────────────────────┐   │
  │  │  + KEY IN PENGISIAN (primary CTA — full width)              │   │
  │  │    Plate autocomplete → Liter → Harga → RM → Submit         │   │
  │  └──────────────────────────────────────────────────────────────┘   │
  │  ┌──────────────────────┐  ┌───────────────────────────────────┐    │
  │  │ Today: 12 txn RM 840 │  │ My Recent Entries (edit own)      │    │
  │  └──────────────────────┘  └───────────────────────────────────┘    │
  └─────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────┐
  │  🏭 COMPANY                                                         │
  │  ┌────────────────────────────────────────────────────────────┐     │
  │  │  BAKI SEMASA: RM 4,250.00  ████████░░░  (CUKUP)           │     │
  │  │  Threshold: RM 500  |  Top Up Terakhir: 28 Apr 2026        │     │
  │  └────────────────────────────────────────────────────────────┘     │
  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
  │  │ Vehicles │ │ Top Up   │ │Statement │ │ History  │ │ Profile  │ │
  │  │ Manage   │ │ Deposit  │ │PDF/Excel │ │ Archive  │ │ Docs Tab │ │
  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
  │  Recent Transactions (own vehicles — plate, liter, RM, date)        │
  └─────────────────────────────────────────────────────────────────────┘
```

---

## BALANCE STATE MACHINE

```
  Company balance state at any point:

  ┌───────────────────────────────────────────────┐
  │                                               │
  │  balance > threshold                          │
  │  ┌──────────────────┐                         │
  │  │  ✅ NORMAL        │  Green indicator        │
  │  │  Transactions OK │                         │
  │  └──────────────────┘                         │
  │           │                                   │
  │    deposit deducted                           │
  │           │                                   │
  │  balance ≤ threshold                          │
  │  ┌──────────────────┐                         │
  │  │  ⚠️ LOW BALANCE   │  Yellow indicator       │
  │  │  Txn proceed     │  In-app alert           │
  │  │  Alert sent      │  Email to company       │
  │  └──────────────────┘                         │
  │           │                                   │
  │    more transactions                          │
  │           │                                   │
  │  balance = 0                                  │
  │  ┌──────────────────┐                         │
  │  │  ❌ INSUFFICIENT  │  Red indicator          │
  │  │  Block txn       │  Staff notified         │
  │  │  Top up required │                         │
  │  └──────────────────┘                         │
  │           │                                   │
  │    deposit approved                           │
  │           │                                   │
  │    back to NORMAL ──────────────────────────► │
  │                                               │
  └───────────────────────────────────────────────┘
```

---

## DATA RETENTION

```
  [ACTIVE DB — 12 bulan terkini]    [ARCHIVE — > 12 bulan]
  ┌──────────────────────────┐      ┌──────────────────────────┐
  │  transactions            │─────►│  transactions_archive    │
  │  deposits                │      │  deposits_archive        │
  │  statements              │      │  statements_archive      │
  │  (fast, indexed)         │      │  (indexed by year-month) │
  └──────────────────────────┘      └──────────────────────────┘
         Real-time access                  On-demand query

  Archive access:
  Company  → own records only
  Manager  → own station records
  Admin    → all records (audit)
```

---

## FLOW 9 — PASSWORD RESET (FORGOT PASSWORD)

```
  [USER]                   [SYSTEM]                   [EMAIL]
     │                         │                          │
     │  1. Klik "Lupa Kata     │                          │
     │     Laluan" di login    │                          │
     │────────────────────────►│                          │
     │                         │  2. Jana temp password   │
     │                         │  (random string)         │
     │                         │                          │
     │                         │  3. bcrypt(temp) →       │
     │                         │     simpan ke            │
     │                         │     user.reset_token     │
     │                         │     + reset_token_expiry │
     │                         │─────────────────────────►│
     │                         │  4. Hantar email:        │
     │                         │  "Kata laluan sementara: │
     │                         │   [temp_password_plain]" │
     │◄────────────────────────│                          │
     │                         │                          │
     │  5. Log in guna         │                          │
     │     temp password       │                          │
     │────────────────────────►│                          │
     │                         │  6. comparePassword(     │
     │                         │     input, reset_token)  │
     │                         │  ✅ MATCH               │
     │                         │                          │
     │                         │  7. PROMOTE:             │
     │                         │  password_hash ←         │
     │                         │     reset_token          │
     │                         │  reset_token = null      │
     │                         │  reset_token_expiry=null │
     │◄────────────────────────│  Login berjaya           │
     │                         │                          │
     │  8. Tukar kata laluan   │                          │
     │     di Profil           │                          │
     │  (guna temp password    │                          │
     │   sebagai "semasa") ───►│  comparePassword(        │
     │                         │    input, password_hash) │
     │                         │  ✅ MATCH (promoted)    │
     │                         │  password_hash = new_pw  │
     │◄────────────────────────│  Kata laluan dikemaskini │
```

**Kenapa promote?** Jika `reset_token` tidak dicopy ke `password_hash`, pengguna tidak boleh
guna temp password sebagai "kata laluan semasa" di halaman profil — kerana profil hanya
semak `password_hash`, bukan `reset_token`.

---

## FLOW 10 — VEHICLE APPROVAL

```
  [COMPANY]              [SYSTEM]          [ADMIN/OWNER/MANAGER]
      │                     │                       │
      │  1. Daftar          │                       │
      │  kenderaan baru     │                       │
      │  (plate, jenis,     │                       │
      │   bahan api, dll)   │                       │
      │────────────────────►│                       │
      │                     │  Status: PENDING      │
      │                     │  is_active = false    │
      │                     │                       │
      │                     │  2. Notifikasi ───────►│
      │                     │  "Kenderaan menunggu  │
      │                     │   kelulusan"          │
      │                     │                       │
      │                     │  3. Semak & tindakan  │
      │                     │◄──────────────────────│
      │                     │  [LULUS] atau [TOLAK] │
      │                     │                       │
      │  ┌──────────────────┴────────────────────┐  │
      │  │ IF LULUS:                             │  │
      │  │  approval_status = APPROVED           │  │
      │  │  is_active = true                     │  │
      │  │  approved_by = session.id             │  │
      │  ├───────────────────────────────────────┤  │
      │  │ IF TOLAK:                             │  │
      │  │  approval_status = REJECTED           │  │
      │  │  is_active = false                    │  │
      │  │  reject_reason = sebab                │  │
      │  └───────────────────────────────────────┘  │
      │◄────────────────────│                       │

  Scope approval:
  Admin   → semua stesen
  Owner   → stesen milik sendiri (semak station.owner_id)
  Manager → stesen sendiri (semak session.station_id)
```

---

## FLOW 11 — statementAccess GATE (STAFF)

```
  [STAFF]            [SYSTEM]         [MANAGER/ADMIN]
     │                   │                   │
     │  Klik "Penyata"   │                   │
     │  di sidebar ─────►│                   │
     │                   │  Semak            │
     │                   │  user.statement_  │
     │                   │  access           │
     │                   │                   │
     │        ┌──────────┴────────────┐      │
     │        │ IF false (default):  │      │
     │        │  Render lock card    │      │
     │        │  "Akses Belum        │      │
     │        │   Dibenarkan"        │      │
     │        │  Nav item KEKAL      │      │
     │        │  (tidak disembunyikan│      │
     │        │   atau redirect)     │      │
     │        ├──────────────────────┤      │
     │        │ IF true:             │      │
     │        │  Render penyata page │      │
     │        │  (company picker +   │      │
     │        │   month picker +     │      │
     │        │   StatementViewer)   │      │
     │        └──────────────────────┘      │
     │                   │                   │
     │                   │  Manager/Admin    │
     │                   │  toggle access ──►│
     │                   │  PATCH /api/      │
     │                   │  accounts/[id]    │
     │                   │  { statementAccess│
     │                   │    : true/false } │
```

---

## SIDEBAR NAVIGATION (PER ROLE)

```
  ADMIN
  ─────
  • Dashboard      /admin
  • Urus Akaun     /admin/accounts
  • Deposit        /admin/deposits
  • Transaksi      /admin/transactions
  • Kenderaan      /admin/vehicles
  • Penyata        /admin/statements
  • Profil         /admin/profile

  OWNER
  ─────
  • Dashboard      /owner
  • Stesen Saya    /owner/stations
  • Deposit        /owner/deposits
  • Transaksi      /owner/transactions  (station picker + date filter)
  • Kenderaan      /owner/vehicles
  • Penyata        /owner/statements
  • Profil         /owner/profile

  MANAGER
  ───────
  • Dashboard      /manager
  • Urus Akaun     /manager/accounts
  • Deposit        /manager/deposits
  • Transaksi      /manager/transactions
  • Kenderaan      /manager/vehicles
  • Penyata        /manager/statements
  • Profil         /manager/profile

  STAFF
  ─────
  • Dashboard      /staff
  • Urus Akaun     /staff/accounts   (read-only: company+vehicle lookup)
  • Transaksi      /staff/transactions
  • Penyata        /staff/statements  (gated by statementAccess)
  • Kenderaan      /staff/vehicles
  • Profil         /staff/profile

  COMPANY
  ───────
  • Dashboard      /company
  • Deposit        /company/deposits
  • Transaksi      /company/transactions
  • Penyata        /company/statements
  • Kenderaan      /company/vehicles
  • Profil         /company/profile
```

---

## EXPORT FORMATS

```
  All history/statement screens support 3 export formats:

  ┌─────────────────────────────────────────────────────┐
  │  EXPORT BAR  [📄 PDF]  [📊 Excel]  [📋 CSV]         │
  └─────────────────────────────────────────────────────┘

  Export always uses the CURRENT active filters.
  No filter = export all records in view.

  CSV columns (transaction export):
  Invoice No | Date | Plate | Vehicle Type | Driver |
  Fuel Type | Litres | Unit Price (RM) | Amount (RM) |
  Balance Before | Balance After | Staff Name
```
