# NullHold - PATCHLOG

## 2026-05-21 - NullHold Rebrand Sweep

**Runtime:** Codex local workspace, `C:\Users\Dell\SHARED MEMORY LLM\PROJECT\petron akaun`.

**TRIAD Gate:** In progress; NOCTIS read-only audit completed before edits.

**VELVET ARCLOG:** `NullHold Rebrand Sweep` logged.

### Summary
- Renamed active product identity to NullHold across package metadata, runtime cookie naming, app UI, auth surfaces, email copy, PDF/export branding, statement branding, seed data, setup logs, and local Vercel project metadata.
- Updated demo seed emails to `@nullhold.test` and demo station token to `NULLHOLD-TEST-001`.
- Updated documentation entry points to the current NullHold identity while preserving older changelog/patch history below.
- Renamed GitHub repository to `KAGEROU1107/NullHold` and updated local `origin`.
- Renamed Vercel project to `nullhold` and added `nullhold.vercel.app`.
- Renamed Supabase display name to `NullHold`; project ref remains `ivizemwavexgzwlvjucy`.

### Verification
- NOCTIS audit found no old-brand hits in `.env`, `.env.local`, or `.env.example`.
- Active code/config scan returned zero old-brand hits for `src`, `scripts`, package files, and `.vercel/project.json`.
- `npx tsc --noEmit` passed.
- `npm run build` passed.
- `gh repo view KAGEROU1107/NullHold` verified the GitHub rename.
- `git fetch origin` passed after local remote update.
- `vercel project inspect nullhold` verified the Vercel rename.
- `supabase projects list` verified display name `NullHold`.
- `curl -I https://nullhold.vercel.app` returned HTTP 307 to `/login`.

---

## 2026-05-20 - SlipVault Rebrand + Service Rename

**Runtime:** Codex local workspace, `C:\Users\Dell\SHARED MEMORY LLM\PROJECT\petron akaun`.

**TRIAD Gate:** Not run; rename was verified with source string audit and production build.

**VELVET ARCLOG:** `SlipVault Rebrand + Service Rename` logged.

### Summary
- Renamed local product identity from the old fuel-brand-linked name to SlipVault across app metadata, docs, seed scripts, emails, PDFs, exports, package identity, and session cookie naming.
- Added a reusable SlipVault brand mark and applied it to the sidebar logo area and auth-screen banner.
- Renamed GitHub repository to `KAGEROU1107/SlipVault` and updated local `origin`.
- Renamed Vercel project to `slipvault` and refreshed local `.vercel/project.json`.
- Supabase project rename remains blocked because the local Supabase CLI is not authenticated, and the current CLI exposes project list/create/delete/api-key commands but no rename command.

### Verification
- `npm run build` passed.
- Source audit for `Petron`, `PETRON`, `petron`, `petron-akaun`, and `petron akaun` returned no matches after excluding generated build/vendor artifacts.
- GitHub verified as `KAGEROU1107/SlipVault`.
- Vercel verified as project `slipvault`.

---

## 2026-05-17 - Table Workspace UX + Mobile Scroll

**Runtime:** EFF V2 Codex session #171, saved at session count #99.

**TRIAD Gate:** PASS before implementation and PASS after implementation.

**VELVET ARCLOG:** `SlipVault Table Workspace Upgrade` logged.

### Summary
- Reworked the dashboard list/table experience into a shared operational table workspace.
- Fixed the fragile dashboard scroll model so long pages use natural vertical page scroll while wide tables own horizontal scroll.
- Expanded the shared toolbar with `Jadual/Kad`, quick filters, `Latest/Oldest`, company pills, calendar date input, search, and export/action slots.
- Applied the pattern to manager/admin/owner/staff transaction, vehicle, deposit, and account table surfaces where relevant.
- Preserved existing row actions: transaction edit/delete/receipt, vehicle approve/toggle/letter, deposit approve/reject/proof, and account edit/suspend/statement access.

### Verification
- `npm run build` passed.
- EFF V2 constraint checks passed for touched files.
- Authenticated browser smoke test remains pending because local demo credentials failed and the login endpoint rate-limited subsequent attempts.

---

## 2026-05-17 - Vehicle Full Detail Pages

**Runtime:** EFF V2 Codex session #172.

**TRIAD Gate:** PASS before implementation and PASS after implementation.

**VELVET ARCLOG:** `SlipVault Vehicle Full Detail Pages` logged.

### Summary
- Implemented Option 2 for vehicle records: bookmarkable full detail pages under manager, admin, owner, company, and staff vehicle routes.
- Added a shared scoped vehicle detail loader that validates company/station/owner access and restricts staff to approved active vehicles.
- Added a shared detail screen with vehicle summary cards, company information, transaction history, receipt links, vehicle letter actions, approval controls, and active toggle where the role already allows it.
- Added row/card click-through affordances to the existing vehicle table/list components without removing existing approve, toggle, edit, letter, or search behaviors.

### Verification
- `npm run build` passed.
- EFF V2 constraint checks passed for touched files.
- Authenticated browser smoke test remains pending until valid local login access is available.

---

## 2026-05-20 — SlipVault Rebrand: FULLY SHIPPED

**Runtime:** EFF V2 Claude session #125, NOCTIS+EXIA [OVERDRIVE], SSJ mode.

**TRIAD Gate:** PASS — deep brand audit (grep src/ *.md scripts/ docs/) returned zero PETRON/petron matches.

**VELVET ARCLOG:** `SlipVault Rebrand Ship` logged.

### Summary
- Deep audit: PASS — zero remaining Petron/PETRON/petron strings in src/, scripts/, docs/, or *.md files.
- Security fix: `scripts/supabase-init.mjs` hardcoded SERVICE_ROLE_KEY and DATABASE_URL replaced with process.env references (matching supabase-setup.mjs pattern).
- All rebrand changes committed: source, docs, metadata, emails, PDFs, seeds, cookie names.
- Pushed to GitHub: `KAGEROU1107/SlipVault` main branch.
- Supabase migrations applied via MCP: `supabase_rls.sql` + `supabase_columns_migration.sql`.
- Vercel: auto-deploy triggered via GitHub push.
- Domain alias: `petron-akaun.vercel.app` → `slipvault.vercel.app` (guided manual step in Vercel dashboard).
- UBW skill extracted: `rebrand-ship-sequence` registered in EFF V2 skill registry.

### Open Items
- Supabase project display name renamed to "SlipVault" — DONE (2026-05-20).

### Verification
- `npm run build` passed.
- `grep -ri "petron" src/ *.md scripts/ docs/` returned 0 matches.
- Git push confirmed on KAGEROU1107/SlipVault.
