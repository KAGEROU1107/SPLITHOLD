# NullHold - IMPLEMENTATION PLAN
> Based on `BLUEPRINT.md`
> Goal: Supabase-first, minimal custom backend, phased migration

## 1. Target State

The target system is:

- Supabase Auth for user sessions
- Supabase Postgres as the system of record
- Supabase Storage for documents and receipts
- RLS for row-level access control
- Next.js UI kept as the presentation layer
- only small privileged server functions where unavoidable

## 2. What Stays For Now

Keep these during migration:

- current UI structure
- current role model
- current business rules
- audit logging
- bilingual support
- station ownership logic

Keep these until replacements are ready:

- Prisma runtime access
- current Next.js API routes
- JWT cookie auth

## 3. Migration Order

### Phase 1 - Connectivity and Supabase Baseline

Deliverables:

- confirmed Supabase project connectivity
- correct `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`
- valid client and service keys
- stable local dev access to the database

Files to verify:

- `.env`
- `src/lib/supabase.ts`
- `prisma/schema.prisma`

Done when:

- Prisma can connect to the Supabase database
- the app builds cleanly
- Supabase credentials are consistent across local and deployment settings

### Phase 2 - Auth Modernization

Deliverables:

- replace custom login/session flow with Supabase Auth where practical
- keep profile metadata in app tables
- remove dependency on JWT cookies for normal user sessions

Files likely affected:

- `src/app/(auth)/*`
- `src/lib/session.ts`
- `src/lib/auth.ts`
- `src/app/api/auth/*`

Done when:

- login/logout/password reset work through Supabase Auth
- user identity is available to the UI without a custom session chain

### Phase 3 - Data Access Shift

Deliverables:

- move ordinary reads and writes to Supabase client access
- add and test RLS policies
- stop using Prisma for everyday screens where feasible

Files likely affected:

- `src/app/(dashboard)/**/*`
- `src/app/api/**/*`
- `src/components/**/*`
- `src/lib/prisma.ts`

Done when:

- core screens fetch data through Supabase-aware paths
- unauthorized access is blocked by RLS
- the app no longer depends on server-only CRUD for normal usage

### Phase 4 - Storage and Privileged Workflows

Deliverables:

- keep receipts, deposits, avatars, and documents in Supabase Storage
- retain only minimal privileged routes for file signing, email, or batch tasks
- review whether any remaining Next.js route is truly necessary

Files likely affected:

- `src/app/api/deposits/[id]/evidence/route.ts`
- `src/app/api/transactions/[id]/receipt/route.ts`
- `src/app/api/vehicles/[id]/letter/route.ts`
- `src/lib/supabase.ts`

Done when:

- normal file uploads/downloads work through Supabase Storage
- privileged file access is tightly scoped and auditable

### Phase 5 - Backend Reduction

Deliverables:

- remove redundant API routes
- remove server-only CRUD paths
- reduce Prisma usage to migration-only or eliminate it

Files likely affected:

- `src/app/api/**/*`
- `prisma/**/*`
- `src/lib/prisma.ts`

Done when:

- the app runs primarily as a Supabase-backed Next.js frontend
- only a small number of privileged server functions remain

## 4. Feature Priority

Build in this order:

1. auth and session
2. company profile
3. station and ownership scoping
4. deposit submission and approval
5. vehicle registration and approval
6. transaction entry
7. statements
8. search and filters
9. documents and storage
10. archive and reporting jobs

## 5. Security Checklist

Before any cutover:

- enable RLS on exposed tables
- verify station/company scoping on every query
- keep service-role credentials off the client
- avoid authorization decisions from mutable client metadata
- test update paths as well as read paths

## 6. Validation Gates

Each phase should end with:

- `npm run build`
- database connectivity test
- authenticated user flow test
- role-based access test
- one real data-path smoke test

## 7. Exit Criteria

The migration is complete when:

- the app works against Supabase as the primary backend
- ordinary CRUD no longer needs a custom server
- RLS protects all tenant and station boundaries
- only essential privileged workflows still use server-side code
- the docs match the implementation

