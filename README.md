# SplitHold

> Split bills. Track who's paid.

A bill-collection web app — create a bill, generate a shareable payment link per person, and track confirmations in real time.

**Live demo:** [splithold.vercel.app](https://splithold.vercel.app)  
**Demo login:** `demo@splithold.local` / `SplitHoldDemo123!`

---

## How It Works

1. **Organizer** creates a bill (title, total, due date, participants + amounts)
2. App generates a **unique shareable link** per participant (`/pay/[token]`)
3. Share links via WhatsApp, Telegram, or email — **no account needed** to confirm
4. Organizer's dashboard shows **live paid/unpaid progress** per bill

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Custom JWT + bcrypt (httpOnly cookie, 8h) |
| Styling | Tailwind CSS (custom purple brand) |
| Hosting | Vercel |

---

## Schema

```sql
bills (id, organizer_id, title, description, total_amount_cents, due_date, status)
bill_participants (id, bill_id, name, email, amount_cents, payment_token uuid UNIQUE, status, confirmed_at)
```

All money values stored as **integer cents** (RM48.00 = 4800).

---

## Routes

| Route | Access | Description |
|---|---|---|
| `/` | Public | Landing page |
| `/login` `/register` | Public | Organizer auth |
| `/dashboard` | Auth | Bill overview + stats |
| `/bills` | Auth | All bills list |
| `/bills/new` | Auth | Create bill + participants |
| `/bills/[id]` | Auth | Bill detail + copy links |
| `/pay/[token]` | Public | Member confirmation page |

---

## Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env template
cp .env.example .env.local
# Fill in SUPABASE_SERVICE_ROLE_KEY and JWT_SECRET (see below)

# 3. Start dev server
npm run dev

# 4. (Optional) Seed demo data
npm run seed:demo
```

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://ivizemwavexgzwlvjucy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # Supabase dashboard → Settings → API
JWT_SECRET=...                  # openssl rand -base64 32
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Demo Data

`npm run seed:demo` creates:

- **Account:** `demo@splithold.local` / `SplitHoldDemo123!`
- **Bill:** "Langkawi Trip" — RM1,500 total, 5 participants (RM300 each)
- **Status:** 3 confirmed (Kagerou, Amir, Sarah) · 2 pending (Mei, Daniel)

---

## Built For

Kracked Devs Bounty — RM500 · Deadline 2026-06-01
