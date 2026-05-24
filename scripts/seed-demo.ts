/**
 * Demo seed for SplitHold.
 * Run: npx tsx scripts/seed-demo.ts
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 * Creates demo@splithold.local / SplitHoldDemo123!
 * with one "Langkawi Trip" bill (3/5 confirmed).
 */

import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const db = createClient(supabaseUrl, serviceKey)

const DEMO_EMAIL = 'demo@splithold.local'
const DEMO_PASSWORD = 'SplitHoldDemo123!'
const DEMO_NAME = 'Demo Organizer'

async function seed() {
  console.log('Seeding demo data...')

  // Upsert demo user
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12)
  const { data: existingUser } = await db.from('users').select('id').eq('email', DEMO_EMAIL).single()

  let userId: string
  if (existingUser) {
    userId = existingUser.id
    await db.from('users').update({ password_hash: passwordHash, name: DEMO_NAME }).eq('id', userId)
    console.log(`Demo user already exists (id: ${userId}), password reset.`)
  } else {
    const { data: newUser, error } = await db
      .from('users')
      .insert({ email: DEMO_EMAIL, password_hash: passwordHash, name: DEMO_NAME, role: 'ADMIN' })
      .select('id')
      .single()
    if (error || !newUser) {
      console.error('Failed to create demo user:', error?.message)
      process.exit(1)
    }
    userId = newUser.id
    console.log(`Created demo user (id: ${userId})`)
  }

  // Delete existing demo bills to re-seed cleanly
  await db.from('bills').delete().eq('organizer_id', userId)

  // Create Langkawi Trip bill
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 14)
  const dueDateStr = dueDate.toISOString().split('T')[0]

  const { data: bill, error: billError } = await db
    .from('bills')
    .insert({
      organizer_id: userId,
      title: 'Langkawi Trip',
      description: 'Flight, hotel, and activities for our Langkawi getaway.',
      total_amount_cents: 150000,
      due_date: dueDateStr,
      status: 'ACTIVE',
    })
    .select()
    .single()

  if (billError || !bill) {
    console.error('Failed to create bill:', billError?.message)
    process.exit(1)
  }
  console.log(`Created bill: ${bill.title} (id: ${bill.id})`)

  const participants = [
    { name: 'Kagerou', email: 'kagerou@example.com', amount_cents: 30000, confirm: true },
    { name: 'Amir', email: 'amir@example.com', amount_cents: 30000, confirm: true },
    { name: 'Sarah', email: 'sarah@example.com', amount_cents: 30000, confirm: true },
    { name: 'Mei', email: 'mei@example.com', amount_cents: 30000, confirm: false },
    { name: 'Daniel', email: 'daniel@example.com', amount_cents: 30000, confirm: false },
  ]

  for (const p of participants) {
    const { data: part, error } = await db
      .from('bill_participants')
      .insert({
        bill_id: bill.id,
        name: p.name,
        email: p.email,
        amount_cents: p.amount_cents,
        status: p.confirm ? 'CONFIRMED' : 'PENDING',
        confirmed_at: p.confirm ? new Date().toISOString() : null,
      })
      .select('payment_token')
      .single()

    if (error || !part) {
      console.error(`Failed to insert participant ${p.name}:`, error?.message)
    } else {
      console.log(`  ${p.confirm ? '✓' : '○'} ${p.name} — /pay/${part.payment_token}`)
    }
  }

  console.log('\nDemo seed complete.')
  console.log(`Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`)
}

seed().catch(err => {
  console.error(err)
  process.exit(1)
})
