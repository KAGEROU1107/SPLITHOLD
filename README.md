# NullHold

> Sistem pengurusan akaun bahan api untuk stesen minyak.

---

## Tentang Sistem

NullHold mendigitalkan proses pengurusan akaun bahan api yang sebelum ini dilakukan secara manual menggunakan slip kertas. Sistem ini membolehkan syarikat afiliasi membuat deposit, memantau penggunaan bahan api kenderaan mereka secara real-time, dan memuat turun penyata bulanan.

---

## Roles

| Role | Fungsi |
|------|--------|
| Admin | Kawalan penuh stesen — urus akaun, deposit, kenderaan, penyata |
| Owner | Pemilik stesen — pantau semua stesen milik sendiri |
| Manager | Kawalan data stesen sendiri — urus staff & syarikat |
| Staff | Key in rekod pengisian bahan api |
| Company | Syarikat afiliasi — pantau akaun & muat turun penyata |

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router) |
| Database | PostgreSQL (Supabase) |
| Data Layer | Supabase-backed compatibility layer |
| Auth | JWT + bcrypt (httpOnly cookie) |
| File Storage | Supabase Storage |
| Rate Limiting | Supabase RPC-backed buckets |
| PDF | pdfmake |
| Email | Resend |
| Hosting | Vercel |
| Language | Bilingual (BM / EN) |

---

## Setup

```bash
npm install
npm run dev
```

Salin `.env.example` ke `.env.local` dan isi:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `RESEND_API_KEY`

---

## Features (Built)

### Auth & Profile
- Login dengan email atau Staff ID
- Forgot password → temp password dihantar via email (Resend)
- Temp password login auto-promote ke permanent password
- Tukar kata laluan di profil (guna kata laluan semasa)
- Bilingual toggle BM / EN (tersimpan ke akaun)
- Avatar upload

### Sidebar Navigation (per role)
| Role | Pages |
|------|-------|
| Admin | Dashboard · Urus Akaun · Deposit · Transaksi · Kenderaan · Penyata · Profil |
| Owner | Dashboard · Stesen Saya · Deposit · Transaksi · Kenderaan · Penyata · Profil |
| Manager | Dashboard · Urus Akaun · Deposit · Transaksi · Kenderaan · Penyata · Profil |
| Staff | Dashboard · Urus Akaun · Transaksi · Penyata · Kenderaan · Profil |
| Company | Dashboard · Deposit · Transaksi · Penyata · Kenderaan · Profil |

### Account Management
- Create akaun: Admin (semua role) · Owner (Manager/Staff) · Manager (Staff)
- Suspend / aktifkan akaun (self-suspend dilindungi)
- Edit maklumat akaun (nama, email, jawatan, Staff ID) inline
- Manager tidak boleh suspend / edit Manager lain
- `statementAccess` toggle untuk STAFF (gated access ke halaman Penyata)

### Deposit
- Syarikat hantar deposit + upload bukti
- Admin / Owner / Manager luluskan atau tolak deposit
- Bukti boleh dilihat (ExternalLink) atau dimuat turun
- Evidence download melalui server-side proxy (`/api/deposits/[id]/evidence`)

### Transaksi (Pengisian)
- Staff key in: plate autocomplete → liter → harga/liter → jumlah RM (auto-calc)
- Invoice auto-generated (INV-YYYY-NNNN)
- Balance deducted secara automatik
- Balance state: Normal (hijau) / Rendah (kuning) / Disekat (merah)
- Edit + delete transaksi dengan sebab (audit log tersimpan)
- View + download resit transaksi melalui server-side proxy (`/api/transactions/[id]/receipt`)

### Kenderaan
- Syarikat daftar kenderaan → status PENDING
- Admin / Owner / Manager luluskan atau tolak dengan sebab
- Toggle aktif/tidak aktif
- Owner: scope kepada stesen milik sendiri (bukan via `session.stationId` — semak via `station.ownerId`)

### Penyata
- Admin / Manager / Owner jana penyata bulanan
- Staff: halaman Penyata ada, tapi access dikawal oleh `statementAccess` flag
  - Jika `false`: lock card ditunjukkan (tidak redirect, tidak sembunyi dari nav)
  - Jika `true`: boleh pilih syarikat + bulan + lihat penyata

### Owner-Specific
- Stesen Saya: lihat dan urus semua stesen milik sendiri
- Stesen picker terhad kepada `station.ownerId === session.id`
- Transaksi Owner: picker stesen + penapis tarikh harian untuk semakan per stesen
- Boleh create Manager, Staff accounts di stesen sendiri

---

## Project Files

| File | Keterangan |
|------|-----------|
| `README.md` | Project overview (ini) |
| `WORKDRAFT.md` | Full spec: schema, permissions, features |
| `WORKFLOW.md` | ASCII workflow diagrams |
| `CHANGELOG.md` | Version history |
| `MEMORY_STATE.md` | Session state, locked decisions |
| `scripts/seed-demo.ts` | Demo seed script using Supabase writes |

---

## Status

**Build: CORE COMPLETE**

> Auth · Deposit · Transaksi · Kenderaan · Penyata · Urus Akaun — semua fungsi utama siap.
> Pending: Supabase Auth cutover, broader RLS-first data migration, analytics charts, auto-archive job, annual summary.
