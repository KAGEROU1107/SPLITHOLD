# NullHold - NEW BLUEPRINT
> Draft v2 | Supabase-first | Minimal custom backend

## 1. Purpose

NullHold is a fuel-account operating system for station-based affiliate companies.
It replaces paper slips and manual balance tracking with a browser app that handles:

- company onboarding
- station-scoped account management
- deposit top-ups and approvals
- vehicle registration and approval
- fuel transaction entry
- statement generation
- document storage
- bilingual UI

## 2. Product Direction

The new direction is:

- keep the app operationally simple
- reduce dependence on a custom backend where possible
- use Supabase as the primary backend platform
- preserve role-based workflows and auditability
- keep station ownership boundaries explicit

This blueprint assumes the app should be viable with:

- Supabase Auth
- Supabase Postgres
- Supabase Storage
- RLS policies
- client-side data access for ordinary CRUD

Only privileged or awkward workflows should keep a server-side path.

## 3. Architecture Principle

### Preferred model

```
Browser UI
  -> Supabase Auth
  -> Supabase Postgres + RLS
  -> Supabase Storage
  -> Lightweight server only for special jobs
```

### What should not be primary anymore

- Prisma as the main runtime data layer
- API routes for ordinary CRUD
- server-managed auth sessions for normal app usage
- database access that bypasses RLS for everyday screens

## 4. System Layers

### Presentation Layer

- Next.js App Router UI
- bilingual BM / EN
- role-aware shells and dashboards
- responsive mobile-first layouts

### Data Layer

- Supabase Postgres as system of record
- RLS policies for role and station scoping
- storage buckets for receipts, deposits, avatars, and company documents

### Identity Layer

- Supabase Auth for sign-in, sign-up, password reset, session handling
- app profile table for role-specific metadata
- no JWT authorization decisions based on mutable user metadata

### Workflow Layer

- transaction entry
- deposit approval
- vehicle approval
- statement generation
- archive and reporting jobs

## 5. Domain Modules

### A. Auth and Profile

- login, logout, forgot password, register
- profile editing
- language preference
- avatar upload
- staff identity fields

### B. Station and Ownership

- owner controls one or more stations
- manager and staff are station-scoped
- company records belong to a station
- ownership is checked through explicit relations, not session guesses

### C. Deposit Flow

- company submits deposit and evidence
- approver reviews evidence
- approved deposit increases balance
- rejected deposit requires a reason

### D. Vehicle Flow

- company registers vehicle
- vehicle starts as pending
- approver approves or rejects
- approved vehicles can be used in transactions

### E. Transaction Flow

- staff searches vehicle by plate
- staff enters liters, unit price, and amount
- system calculates totals and updates balance
- receipt is optional but supported
- edits and deletes are audit logged

### F. Statement Flow

- statement filtered by company and date range
- supports monthly or configured cycle
- downloadable formats: PDF, XLSX, CSV
- staff sees statement only if access is enabled

### G. Documents

- SSM certificate
- agreement letter
- receipt files
- avatar files

## 6. Data Model Direction

The current domain objects remain valid:

- stations
- users
- invite codes
- company allowlist
- companies
- vehicles
- transactions
- transaction edits
- deposits
- statements

Recommended changes for the Supabase-first model:

- add or refine RLS policies on all exposed tables
- store privileged operational data in dedicated columns or tables
- avoid reading authorization from mutable client-controlled metadata
- keep audit fields for every destructive action

## 7. Access Model

### Roles

- Admin
- Owner
- Manager
- Staff
- Company

### Access rules

- Admin sees all stations and all records
- Owner sees owned stations only
- Manager sees assigned station only
- Staff can key in transactions and view allowed data
- Company sees own account, vehicles, deposits, and statements

### Staff statement gate

- if `statementAccess = false`, show locked state
- do not remove the nav entry
- do not redirect away from the page

## 8. UI Shell

### Global shell

- top bar with station, search, and account controls
- sidebar with role-specific nav
- compact mobile drawer
- search should route to the right record type

### Dashboard emphasis

- company: balance and actions first
- staff: transaction entry first
- manager: approvals first
- owner: station overview first
- admin: global control first

## 9. Operations

### Routine jobs

- balance threshold notifications
- statement generation
- archive old transactions
- archive old deposits
- annual summary generation

### Preferred execution model

- if a job can be done client-side safely, keep it client-side
- if it needs privileged data access, use a small server action or edge function
- if it is a scheduled batch, use Supabase Cron/Edge Functions or a separate scheduled worker

## 10. Security Rules

- enforce RLS on public tables
- do not depend on `user_metadata` for authorization
- keep service-role credentials off the client
- keep file access scoped to the owning station or company
- log approvals, rejections, edits, and deletes

## 11. Migration Strategy

### Phase 1

- keep the current UI and business behavior
- verify Supabase project connectivity
- stabilize auth and storage configuration

### Phase 2

- move ordinary reads and writes to Supabase client + RLS
- reduce API route dependence
- isolate privileged actions

### Phase 3

- replace Prisma runtime usage where possible
- move recurring jobs to Supabase-native scheduling
- simplify deployment surface

### Phase 4

- remove redundant custom backend code
- keep only the smallest set of privileged functions

## 12. Done Condition

This blueprint is successful when:

- the app runs on Supabase as the primary backend
- normal CRUD does not depend on a custom server
- privileged operations remain secure and minimal
- all role boundaries are enforced consistently
- the business workflow remains intact

