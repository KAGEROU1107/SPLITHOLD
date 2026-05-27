/**
 * SplitHold Security Smoke Test
 * Run: node scripts/security-smoke-test.mjs [--url https://splithold.vercel.app]
 *
 * Tests key security behaviors post-hardening.
 * Uses Playwright for browser tests + fetch for API tests.
 */

import { chromium } from 'playwright'

const BASE_URL = process.argv.includes('--url')
  ? process.argv[process.argv.indexOf('--url') + 1]
  : 'https://splithold.vercel.app'

const SCREENSHOTS_DIR = './scripts/smoke-screenshots'

let passed = 0
let failed = 0
let skipped = 0

function result(name, status, detail = '') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️ '
  console.log(`  ${icon}  ${name}${detail ? ` — ${detail}` : ''}`)
  if (status === 'PASS') passed++
  else if (status === 'FAIL') failed++
  else skipped++
}

async function ensureDir(dir) {
  const { mkdir } = await import('fs/promises')
  await mkdir(dir, { recursive: true })
}

// ── Browser Tests ──────────────────────────────────────────────────────────────

async function runBrowserTests() {
  console.log('\n📸  BROWSER TESTS (Playwright)')
  console.log('─'.repeat(50))

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'SplitHold-SecuritySmokeTest/1.0',
  })
  const page = await context.newPage()

  try {
    // T1 — /dashboard without auth → must redirect to /login
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' })
    const url1 = page.url()
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/T1-dashboard-noauth.png` })
    result(
      'T1: /dashboard without auth redirects to /login',
      url1.includes('/login') ? 'PASS' : 'FAIL',
      url1
    )

    // T2 — /admin without auth → must redirect to /login
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' })
    const url2 = page.url()
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/T2-admin-noauth.png` })
    result(
      'T2: /admin without auth redirects to /login',
      url2.includes('/login') ? 'PASS' : 'FAIL',
      url2
    )

    // T3 — /bills without auth → must redirect to /login
    await page.goto(`${BASE_URL}/bills`, { waitUntil: 'networkidle' })
    const url3 = page.url()
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/T3-bills-noauth.png` })
    result(
      'T3: /bills without auth redirects to /login',
      url3.includes('/login') ? 'PASS' : 'FAIL',
      url3
    )

    // T4 — /profile without auth → must redirect to /login
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle' })
    const url4 = page.url()
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/T4-profile-noauth.png` })
    result(
      'T4: /profile without auth redirects to /login',
      url4.includes('/login') ? 'PASS' : 'FAIL',
      url4
    )

    // T5 — /join/[token] must be publicly accessible (not gated)
    await page.goto(`${BASE_URL}/join/test-token-smoke`, { waitUntil: 'networkidle' })
    const url5 = page.url()
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/T5-join-public.png` })
    result(
      'T5: /join/[token] is publicly accessible (not redirected to login)',
      !url5.includes('/login') ? 'PASS' : 'FAIL',
      url5
    )

    // T6 — login page loads without auth
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })
    const url6 = page.url()
    const hasForm = await page.locator('input[type="email"], input[type="password"]').count()
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/T6-login-page.png` })
    result(
      'T6: /login page loads with auth form',
      hasForm > 0 ? 'PASS' : 'FAIL',
      `form inputs: ${hasForm}`
    )

    // T7 — Login with wrong credentials → error shown, not crash
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })
    await page.fill('input[type="email"]', 'nonexistent@smoke.test')
    await page.fill('input[type="password"]', 'wrong-password-smoke')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(2000)
    const url7 = page.url()
    const errorVisible = await page.locator('text=/invalid|error|incorrect/i').count()
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/T7-login-wrong-creds.png` })
    result(
      'T7: Login with wrong credentials shows error (not redirect or crash)',
      !url7.includes('/dashboard') && errorVisible > 0 ? 'PASS' : 'FAIL',
      `at: ${url7}, error texts: ${errorVisible}`
    )

  } finally {
    await browser.close()
  }
}

// ── API Tests ──────────────────────────────────────────────────────────────────

async function runApiTests() {
  console.log('\n🔌  API TESTS (fetch)')
  console.log('─'.repeat(50))

  // T8 — Rate limit on /api/auth/login (5 per 15min window)
  const loginUrl = `${BASE_URL}/api/auth/login`
  const loginBody = JSON.stringify({ email: 'ratelimit@smoke.test', password: 'x' })
  const loginHeaders = { 'Content-Type': 'application/json' }

  let rateLimitHit = false
  let responses = []
  for (let i = 0; i < 7; i++) {
    const r = await fetch(loginUrl, { method: 'POST', headers: loginHeaders, body: loginBody })
    responses.push(r.status)
    if (r.status === 429) { rateLimitHit = true; break }
  }
  result(
    'T8: Rate limit on /api/auth/login fires within 7 rapid requests',
    rateLimitHit ? 'PASS' : 'FAIL',
    `statuses: ${responses.join(', ')}`
  )

  // T9 — Logout without session returns success (no 500)
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, { method: 'POST' })
  result(
    'T9: POST /api/auth/logout without session returns 200 (no crash)',
    logoutRes.status === 200 ? 'PASS' : 'FAIL',
    `status: ${logoutRes.status}`
  )

  // T10 — Pay endpoint rejects invalid payment token (not 500)
  const payRes = await fetch(`${BASE_URL}/api/pay/invalid-smoke-token-xyz`, { method: 'GET' })
  result(
    'T10: GET /api/pay/[invalid-token] returns 404 (not 500)',
    payRes.status === 404 ? 'PASS' : 'FAIL',
    `status: ${payRes.status}`
  )

  // T11 — Admin routes return 401/403 without auth (not 500 or 200)
  const adminRes = await fetch(`${BASE_URL}/api/admin/users`)
  result(
    'T11: GET /api/admin/users without auth returns 401/403 (not 200/500)',
    [401, 403].includes(adminRes.status) ? 'PASS' : 'FAIL',
    `status: ${adminRes.status}`
  )

  // T12 — Bills API returns 401 without auth
  const billsRes = await fetch(`${BASE_URL}/api/bills`, { method: 'GET' })
  result(
    'T12: GET /api/bills without auth returns 401',
    billsRes.status === 401 ? 'PASS' : 'FAIL',
    `status: ${billsRes.status}`
  )

  // T13 — POST /api/bills without auth returns 401
  const billsPostRes = await fetch(`${BASE_URL}/api/bills`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'smoke-test' }),
  })
  result(
    'T13: POST /api/bills without auth returns 401',
    billsPostRes.status === 401 ? 'PASS' : 'FAIL',
    `status: ${billsPostRes.status}`
  )

  // T14 — File upload with wrong MIME type (magic bytes check)
  // POST to a dummy pay token — should fail on participant lookup, NOT on file validation
  // (we can't test file validation without a valid token — mark as SKIPPED)
  result(
    'T14: File magic byte validation (requires valid payment token)',
    'SKIP',
    'needs active bill + participant token — manual test required'
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════╗')
  console.log('║   SplitHold — Security Smoke Test            ║')
  console.log(`║   Target: ${BASE_URL.padEnd(34)}║`)
  console.log('╚══════════════════════════════════════════════╝')

  await ensureDir(SCREENSHOTS_DIR)

  await runBrowserTests()
  await runApiTests()

  console.log('\n' + '═'.repeat(50))
  console.log(`  RESULTS:  ✅ ${passed} passed  |  ❌ ${failed} failed  |  ⚠️  ${skipped} skipped`)
  console.log(`  VERDICT:  ${failed === 0 ? '✅ ALL PASS' : `❌ ${failed} FAILURE(S) — review above`}`)
  console.log(`  SCREENSHOTS: ${SCREENSHOTS_DIR}/`)
  console.log('═'.repeat(50))

  process.exit(failed > 0 ? 1 : 0)
}

main().catch(e => { console.error(e); process.exit(1) })
