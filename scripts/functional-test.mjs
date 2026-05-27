/**
 * SplitHold Functional Test Suite
 * Tests all pages and key functions as organizer + admin.
 *
 * Usage:
 *   node scripts/functional-test.mjs \
 *     --url https://splithold.vercel.app \
 *     --organizer-email user@example.com \
 *     --organizer-pass YourPassword \
 *     --admin-email admin@example.com \
 *     --admin-pass AdminPassword
 *
 * Or use env vars: ORGANIZER_EMAIL, ORGANIZER_PASS, ADMIN_EMAIL, ADMIN_PASS
 */

import { chromium } from 'playwright'

function arg(flag, envVar) {
  const idx = process.argv.indexOf(flag)
  return idx !== -1 ? process.argv[idx + 1] : process.env[envVar] ?? ''
}

const BASE_URL     = arg('--url', 'SPLITHOLD_URL') || 'https://splithold.vercel.app'
const ORG_EMAIL    = arg('--organizer-email', 'ORGANIZER_EMAIL')
const ORG_PASS     = arg('--organizer-pass', 'ORGANIZER_PASS')
const ADMIN_EMAIL  = arg('--admin-email', 'ADMIN_EMAIL')
const ADMIN_PASS   = arg('--admin-pass', 'ADMIN_PASS')

const SCREENSHOTS_DIR = './scripts/smoke-screenshots'

let passed = 0
let failed = 0

function ok(name, detail = '') {
  console.log(`  ✅  ${name}${detail ? ` — ${detail}` : ''}`)
  passed++
}
function fail(name, detail = '') {
  console.log(`  ❌  ${name}${detail ? ` — ${detail}` : ''}`)
  failed++
}
function skip(name) {
  console.log(`  ⚠️   ${name} — SKIP (no credentials)`)
}

async function screenshot(page, name) {
  const { mkdir } = await import('fs/promises')
  await mkdir(SCREENSHOTS_DIR, { recursive: true })
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/${name}.png`, fullPage: true })
}

async function login(page, email, password) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(url => !url.includes('/login'), { timeout: 8000 })
}

// ── PUBLIC ROUTES ──────────────────────────────────────────────────────────────

async function testPublicRoutes(page) {
  console.log('\n📋  PUBLIC ROUTES')
  console.log('─'.repeat(50))

  // Login page
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })
  const hasLoginForm = await page.locator('input[type="email"]').count() > 0
  hasLoginForm ? ok('Login page renders with email field') : fail('Login page missing email field')
  await screenshot(page, 'P1-login')

  // Register page
  await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle' })
  const hasRegForm = await page.locator('input[type="email"]').count() > 0
  hasRegForm ? ok('Register page renders') : fail('Register page missing form')
  await screenshot(page, 'P2-register')

  // Dashboard redirect when unauthenticated
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' })
  const redirectedToLogin = page.url().includes('/login')
  redirectedToLogin ? ok('/dashboard redirects to /login when unauthenticated') : fail('/dashboard did NOT redirect unauthenticated user')
  await screenshot(page, 'P3-dashboard-noauth')

  // Admin redirect when unauthenticated
  await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' })
  const adminRedirected = page.url().includes('/login')
  adminRedirected ? ok('/admin redirects unauthenticated users') : fail('/admin accessible without auth')
  await screenshot(page, 'P4-admin-noauth')

  // Join page (public — must not redirect)
  await page.goto(`${BASE_URL}/join/test-token-smoke`, { waitUntil: 'networkidle' })
  const notRedirectedToLogin = !page.url().includes('/login')
  notRedirectedToLogin ? ok('/join/[token] is publicly accessible') : fail('/join/[token] redirected to login')
  await screenshot(page, 'P5-join-public')

  // Pay page (public — must not redirect)
  await page.goto(`${BASE_URL}/pay/test-token-smoke`, { waitUntil: 'networkidle' })
  const payNotRedirected = !page.url().includes('/login')
  payNotRedirected ? ok('/pay/[token] is publicly accessible') : fail('/pay/[token] redirected to login')
  await screenshot(page, 'P6-pay-public')

  // Login with wrong credentials
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', 'nonexistent@test.com')
  await page.fill('input[type="password"]', 'wrongpassword')
  await page.click('button[type="submit"]')
  await page.waitForTimeout(2000)
  const stillOnLogin = page.url().includes('/login')
  stillOnLogin ? ok('Wrong credentials: stays on login page') : fail('Wrong credentials: navigated away from login')
  await screenshot(page, 'P7-login-wrong-creds')
}

// ── ORGANIZER FLOW ─────────────────────────────────────────────────────────────

async function testOrganizerFlow(page) {
  console.log('\n👤  ORGANIZER FLOW')
  console.log('─'.repeat(50))

  if (!ORG_EMAIL || !ORG_PASS) {
    ;['Dashboard', 'Bills list', 'New bill form', 'Bill detail', 'View proof', 'Profile', 'Logout'].forEach(skip)
    return
  }

  try {
    await login(page, ORG_EMAIL, ORG_PASS)
    ok('Organizer login succeeds')
    await screenshot(page, 'O1-dashboard')
  } catch {
    fail('Organizer login failed')
    return
  }

  // Dashboard
  const onDashboard = page.url().includes('/dashboard') || page.url() === BASE_URL + '/'
  onDashboard ? ok('Redirected to dashboard after login') : fail(`Unexpected URL after login: ${page.url()}`)

  // Bills list
  await page.goto(`${BASE_URL}/bills`, { waitUntil: 'networkidle' })
  const billsPageLoaded = await page.locator('h1, [data-testid="bills-list"]').count() > 0
  billsPageLoaded ? ok('Bills list page loads') : fail('Bills list page empty/broken')
  await screenshot(page, 'O2-bills-list')

  // New bill form
  await page.goto(`${BASE_URL}/bills/new`, { waitUntil: 'networkidle' })
  const hasNewBillForm = await page.locator('form, input[name="title"], input[placeholder*="title" i]').count() > 0
  hasNewBillForm ? ok('New bill form loads') : fail('New bill form missing')
  await screenshot(page, 'O3-new-bill')

  // Bill detail — find first bill link
  await page.goto(`${BASE_URL}/bills`, { waitUntil: 'networkidle' })
  const billLinks = await page.locator('a[href*="/bills/"]').all()
  if (billLinks.length > 0) {
    ok(`Bills list has ${billLinks.length} bill(s)`)
    await billLinks[0].click()
    await page.waitForLoadState('networkidle')
    await screenshot(page, 'O4-bill-detail')

    const billDetailLoaded = !page.url().includes('/login') && !page.url().endsWith('/bills')
    billDetailLoaded ? ok('Bill detail page loads') : fail('Bill detail page failed to load')

    // Check for participant list
    const hasParticipants = await page.locator('text=/participant|Participant|CONFIRMED|PENDING/').count() > 0
    hasParticipants ? ok('Participant list visible in bill detail') : fail('No participant data in bill detail')

    // Check View proof button exists (if any CONFIRMED participants with proof)
    const proofButtons = await page.locator('text=View proof').all()
    if (proofButtons.length > 0) {
      ok(`"View proof" button visible (${proofButtons.length} proofs available)`)

      // Click first proof button — should open in new tab
      const [newTab] = await Promise.all([
        page.context().waitForEvent('page', { timeout: 8000 }),
        proofButtons[0].click(),
      ]).catch(() => [null])

      if (newTab) {
        await newTab.waitForLoadState('domcontentloaded').catch(() => {})
        const proofUrl = newTab.url()
        const isSignedUrl = proofUrl.includes('supabase') && proofUrl.includes('token=')
        isSignedUrl
          ? ok('Proof opens as Supabase signed URL')
          : fail(`Proof URL unexpected: ${proofUrl.slice(0, 80)}`)
        await newTab.close()
      } else {
        fail('Proof popup did not open')
      }
    } else {
      console.log('  ⚠️   No "View proof" buttons (no participants with uploaded proof)')
    }
  } else {
    console.log('  ⚠️   No bills found for this organizer — skipping bill detail tests')
  }

  // Profile page
  await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle' })
  const profileLoaded = await page.locator('input[name="name"], input[placeholder*="name" i], h1, h2').count() > 0
  profileLoaded ? ok('Profile page loads') : fail('Profile page missing content')
  await screenshot(page, 'O5-profile')

  // Logout
  const logoutBtn = page.locator('button:has-text("Logout"), button:has-text("Log out"), button:has-text("Sign out")')
  const logoutCount = await logoutBtn.count()
  if (logoutCount > 0) {
    await logoutBtn.first().click()
    await page.waitForURL(url => url.includes('/login'), { timeout: 5000 }).catch(() => {})
    const loggedOut = page.url().includes('/login')
    loggedOut ? ok('Logout redirects to /login') : fail(`Logout did not redirect — URL: ${page.url()}`)
    await screenshot(page, 'O6-after-logout')
  } else {
    fail('Logout button not found on page')
  }
}

// ── ADMIN FLOW ─────────────────────────────────────────────────────────────────

async function testAdminFlow(page) {
  console.log('\n🛡️  ADMIN FLOW')
  console.log('─'.repeat(50))

  if (!ADMIN_EMAIL || !ADMIN_PASS) {
    ;['Admin login', 'Admin dashboard', 'Admin users', 'Admin bills', 'Admin password resets', 'View bill detail as admin', 'View proof as admin'].forEach(skip)
    return
  }

  try {
    await login(page, ADMIN_EMAIL, ADMIN_PASS)
    ok('Admin login succeeds')
    await screenshot(page, 'A1-admin-after-login')
  } catch {
    fail('Admin login failed')
    return
  }

  // Admin section
  await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' })
  const adminLoaded = !page.url().includes('/login') && !page.url().includes('/dashboard')
  adminLoaded ? ok('Admin section accessible') : fail(`Admin section denied — URL: ${page.url()}`)
  await screenshot(page, 'A2-admin-home')

  // Admin users
  await page.goto(`${BASE_URL}/admin/users`, { waitUntil: 'networkidle' })
  const usersLoaded = await page.locator('text=/user|User|email|Email/i').count() > 0
  usersLoaded ? ok('Admin users page loads') : fail('Admin users page empty/broken')
  await screenshot(page, 'A3-admin-users')

  // Admin bills
  await page.goto(`${BASE_URL}/admin/bills`, { waitUntil: 'networkidle' })
  const adminBillsLoaded = await page.locator('text=/bill|Bill|organizer|Organizer/i').count() > 0
  adminBillsLoaded ? ok('Admin bills page loads') : fail('Admin bills page empty/broken')
  await screenshot(page, 'A4-admin-bills')

  // Admin password resets
  await page.goto(`${BASE_URL}/admin/password-resets`, { waitUntil: 'networkidle' })
  const pwResetsLoaded = !page.url().includes('/login')
  pwResetsLoaded ? ok('Admin password resets page loads') : fail('Admin password resets page failed')
  await screenshot(page, 'A5-admin-pw-resets')

  // Admin: view a bill detail (admin should access any bill)
  const billsApiRes = await page.evaluate(async (url) => {
    const r = await fetch(`${url}/api/bills`)
    return r.status
  }, BASE_URL)

  // Navigate to first bill via direct URL — get bill IDs from admin/bills page data
  await page.goto(`${BASE_URL}/admin/bills`, { waitUntil: 'networkidle' })
  // Try to find any bill ID from page links or data-attributes
  const billHrefs = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="/bills/"]'))
    return links.map(a => a.getAttribute('href'))
  })

  if (billHrefs.length > 0) {
    const billPath = billHrefs[0]
    await page.goto(`${BASE_URL}${billPath}`, { waitUntil: 'networkidle' })
    const adminCanViewBill = !page.url().includes('404') && !page.url().includes('/login')
    adminCanViewBill ? ok(`Admin can view bill detail: ${billPath}`) : fail(`Admin got 404/redirect on bill detail`)
    await screenshot(page, 'A6-admin-bill-detail')

    // Check View proof as admin
    const adminProofBtns = await page.locator('text=View proof').all()
    if (adminProofBtns.length > 0) {
      ok(`Admin sees "View proof" button (${adminProofBtns.length} proofs)`)
      const [proofTab] = await Promise.all([
        page.context().waitForEvent('page', { timeout: 8000 }),
        adminProofBtns[0].click(),
      ]).catch(() => [null])
      if (proofTab) {
        await proofTab.waitForLoadState('domcontentloaded').catch(() => {})
        const isSignedUrl = proofTab.url().includes('supabase') && proofTab.url().includes('token=')
        isSignedUrl ? ok('Admin proof opens as signed URL') : fail(`Admin proof URL: ${proofTab.url().slice(0, 80)}`)
        await proofTab.close()
      } else {
        fail('Admin proof popup did not open')
      }
    } else {
      console.log('  ⚠️   No proof buttons on this bill (participants may not have uploaded)')
    }
  } else {
    console.log('  ⚠️   No bill links found on admin/bills page — admin bill detail test skipped')
  }

  // Non-admin route blocked for admin (admin should not access /dashboard as organizer)
  // Admin can still view /dashboard — just verify it doesn't 404
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' })
  const dashOk = !page.url().includes('/login')
  dashOk ? ok('Admin can access /dashboard') : fail('Admin denied from /dashboard')
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🔍  SplitHold Functional Test Suite')
  console.log(`🌐  Target: ${BASE_URL}`)
  console.log('='.repeat(50))

  const browser = await chromium.launch({ headless: true })

  // Public routes — fresh unauthenticated context
  const pubCtx = await browser.newContext()
  const pubPage = await pubCtx.newPage()
  await testPublicRoutes(pubPage)
  await pubCtx.close()

  // Organizer flow
  const orgCtx = await browser.newContext()
  const orgPage = await orgCtx.newPage()
  await testOrganizerFlow(orgPage)
  await orgCtx.close()

  // Admin flow
  const adminCtx = await browser.newContext()
  const adminPage = await adminCtx.newPage()
  await testAdminFlow(adminPage)
  await adminCtx.close()

  await browser.close()

  console.log('\n' + '='.repeat(50))
  console.log(`📊  Results: ${passed} passed, ${failed} failed`)
  console.log(`📸  Screenshots saved to: ${SCREENSHOTS_DIR}/`)
  if (failed > 0) {
    console.log('\n⚠️  Some tests failed — review screenshots above.')
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
