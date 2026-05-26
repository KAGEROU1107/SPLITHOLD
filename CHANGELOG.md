# SplitHold — CHANGELOG

---

## [v0.3.0] 2026-05-26

### Added
- Phone number (`No. Tel`) column on Penyata Bayaran participant table
- REJECTED payment status badge on statement page (was incorrectly showing as Pending)

### Fixed
- Mobile layout on Penyata Bayaran — summary cards, bank details, participant table all now scroll horizontally on narrow screens
- Admin password reset table mobile stretch — horizontal scroll with correct column sizing
- Organizer "View Proof" now opens payment proof in a new tab reliably (fixed popup-blocker race condition)

---

## [v0.2.0] 2026-05-24

### Added
- Admin panel — user management, bill oversight, activity log, password reset workflow
- Organizer payment proof viewer (signed URL via Supabase Storage)
- Open-registration bills — participants can self-register via `/join/[join_token]`
- Statement / Penyata Bayaran print view (`/bills/[id]/statement`)
- Bank transfer details on bills (name, account number, bank)
- Forgot password flow with admin fulfillment + temp password email (Resend)
- Payment proof upload on member confirmation page

### Fixed
- Bill creation with open registration mode no longer crashes
- Statement print CSS (`print-color-adjust: exact`)

---

## [v0.1.0] 2026-05-20 — Initial Ship

### Added
- Organizer auth (register, login, logout — custom JWT + bcrypt, httpOnly cookie)
- Bill CRUD — create, view, edit status, delete
- Per-participant unique payment token (`/pay/[token]`)
- Member confirmation page — no account required
- Live dashboard — paid/unpaid progress per bill
- Shareable links per participant
- Profile page with avatar upload
