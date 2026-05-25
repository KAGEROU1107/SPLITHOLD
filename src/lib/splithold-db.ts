import { supabaseAdmin } from '@/lib/supabase'

export interface Bill {
  id: string
  organizer_id: string
  title: string
  description: string | null
  total_amount_cents: number
  due_date: string
  status: 'ACTIVE' | 'CLOSED'
  created_at: string
  bank_name: string | null
  bank_account_number: string | null
  bank_account_name: string | null
  join_token: string | null
  max_participants: number | null
  amount_per_pax: number | null
  registration_open: boolean
}

export interface BillParticipant {
  id: string
  bill_id: string
  name: string
  email: string | null
  phone_number: string | null
  amount_cents: number
  payment_token: string
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED'
  confirmed_at: string | null
  proof_url: string | null
  created_at: string
  joined_at: string | null
  rejection_reason: string | null
  reviewed_at: string | null
}

export interface BillWithParticipants extends Bill {
  participants: BillParticipant[]
}

export interface CreateBillInput {
  title: string
  description?: string
  total_amount_cents: number
  due_date: string
  bank_name?: string
  bank_account_number?: string
  bank_account_name?: string
  // Manual mode participants (empty for open registration mode)
  participants: Array<{
    name: string
    email?: string
    amount_cents: number
  }>
  // Open-registration mode fields
  open_mode?: boolean
  max_participants?: number
  amount_per_pax_cents?: number
}

export interface BillSummary extends Bill {
  participant_count: number
  confirmed_count: number
  confirmed_amount_cents: number
}

export interface PublicBillInfo {
  id: string
  title: string
  description: string | null
  due_date: string
  status: 'ACTIVE' | 'CLOSED'
  amount_per_pax: number
  max_participants: number | null
  registration_open: boolean
  bank_name: string | null
  bank_account_number: string | null
  bank_account_name: string | null
  slot_count: number
}

export async function createBill(
  organizerId: string,
  data: CreateBillInput
): Promise<BillWithParticipants> {
  const isOpenMode = data.open_mode === true
  const amountPerPax = data.amount_per_pax_cents ?? 0
  const totalCents = isOpenMode
    ? (data.max_participants ? data.max_participants * amountPerPax : amountPerPax)
    : data.total_amount_cents

  const { data: bill, error: billError } = await supabaseAdmin
    .from('bills')
    .insert({
      organizer_id: organizerId,
      title: data.title,
      description: data.description ?? null,
      total_amount_cents: totalCents,
      due_date: data.due_date,
      status: 'ACTIVE',
      bank_name: data.bank_name ?? null,
      bank_account_number: data.bank_account_number ?? null,
      bank_account_name: data.bank_account_name ?? null,
      max_participants: isOpenMode ? (data.max_participants ?? null) : null,
      amount_per_pax: isOpenMode ? amountPerPax : null,
      registration_open: isOpenMode,
    })
    .select()
    .single()

  if (billError || !bill) {
    throw new Error(billError?.message ?? 'Failed to create bill')
  }

  if (isOpenMode) {
    return { ...bill, participants: [] }
  }

  const participantRows = data.participants.map(p => ({
    bill_id: bill.id,
    name: p.name,
    email: p.email ?? null,
    amount_cents: p.amount_cents,
    status: 'PENDING' as const,
  }))

  const { data: participants, error: partError } = await supabaseAdmin
    .from('bill_participants')
    .insert(participantRows)
    .select()

  if (partError || !participants) {
    // Attempt cleanup — bill without participants is orphaned
    await supabaseAdmin.from('bills').delete().eq('id', bill.id)
    throw new Error(partError?.message ?? 'Failed to create participants')
  }

  return { ...bill, participants }
}

export async function getBillsByOrganizer(organizerId: string): Promise<BillSummary[]> {
  const { data: bills, error } = await supabaseAdmin
    .from('bills')
    .select('*, bill_participants(id, status, amount_cents)')
    .eq('organizer_id', organizerId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  if (!bills) return []

  return bills.map(bill => {
    const parts = (bill.bill_participants ?? []) as Array<{ id: string; status: string; amount_cents: number }>
    const confirmed = parts.filter(p => p.status === 'CONFIRMED')
    return {
      id: bill.id,
      organizer_id: bill.organizer_id,
      title: bill.title,
      description: bill.description,
      total_amount_cents: bill.total_amount_cents,
      due_date: bill.due_date,
      status: bill.status,
      created_at: bill.created_at,
      bank_name: bill.bank_name ?? null,
      bank_account_number: bill.bank_account_number ?? null,
      bank_account_name: bill.bank_account_name ?? null,
      join_token: bill.join_token ?? null,
      max_participants: bill.max_participants ?? null,
      amount_per_pax: bill.amount_per_pax ?? null,
      registration_open: bill.registration_open ?? false,
      participant_count: parts.length,
      confirmed_count: confirmed.length,
      confirmed_amount_cents: confirmed.reduce((s, p) => s + p.amount_cents, 0),
    }
  })
}

export async function getBillById(
  id: string,
  organizerId: string
): Promise<BillWithParticipants | null> {
  const { data: bill, error } = await supabaseAdmin
    .from('bills')
    .select('*, bill_participants(*)')
    .eq('id', id)
    .eq('organizer_id', organizerId)
    .single()

  if (error) return null
  if (!bill) return null

  return {
    ...bill,
    participants: bill.bill_participants ?? [],
  }
}

export async function updateBillStatus(
  id: string,
  organizerId: string,
  status: 'ACTIVE' | 'CLOSED'
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('bills')
    .update({ status })
    .eq('id', id)
    .eq('organizer_id', organizerId)

  if (error) throw new Error(error.message)
}

export async function toggleRegistration(
  billId: string,
  organizerId: string,
  open: boolean
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('bills')
    .update({ registration_open: open })
    .eq('id', billId)
    .eq('organizer_id', organizerId)

  if (error) throw new Error(error.message)
}

export async function getBillByJoinToken(joinToken: string): Promise<PublicBillInfo | null> {
  const { data: bill, error } = await supabaseAdmin
    .from('bills')
    .select('id, title, description, due_date, status, amount_per_pax, max_participants, registration_open, bank_name, bank_account_number, bank_account_name')
    .eq('join_token', joinToken)
    .single()

  if (error || !bill) return null
  if (!bill.amount_per_pax) return null // Not an open-registration bill

  const { count } = await supabaseAdmin
    .from('bill_participants')
    .select('id', { count: 'exact', head: true })
    .eq('bill_id', bill.id)

  return {
    id: bill.id,
    title: bill.title,
    description: bill.description,
    due_date: bill.due_date,
    status: bill.status,
    amount_per_pax: bill.amount_per_pax,
    max_participants: bill.max_participants,
    registration_open: bill.registration_open,
    bank_name: bill.bank_name,
    bank_account_number: bill.bank_account_number,
    bank_account_name: bill.bank_account_name,
    slot_count: count ?? 0,
  }
}

export async function joinBillSafe(
  joinToken: string,
  name: string,
  email: string | null,
  phone: string
): Promise<{ ok: boolean; paymentToken?: string; error?: string }> {
  const { data, error } = await supabaseAdmin.rpc('join_bill_safe', {
    p_join_token: joinToken,
    p_name: name,
    p_email: email,
    p_phone: phone,
  })

  if (error) return { ok: false, error: 'db_error' }

  const row = Array.isArray(data) ? data[0] : data
  if (!row) return { ok: false, error: 'db_error' }
  if (row.error_code) return { ok: false, error: row.error_code }

  return { ok: true, paymentToken: row.payment_token }
}

export interface PublicParticipant {
  id: string
  bill_id: string
  name: string
  amount_cents: number
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED'
  confirmed_at: string | null
  rejection_reason: string | null
  bill: {
    title: string
    description: string | null
    total_amount_cents: number
    due_date: string
    status: 'ACTIVE' | 'CLOSED'
    organizer_id: string
    bank_name: string | null
    bank_account_number: string | null
    bank_account_name: string | null
  }
}

export async function getParticipantByToken(token: string): Promise<PublicParticipant | null> {
  const { data, error } = await supabaseAdmin
    .from('bill_participants')
    .select('id, bill_id, name, amount_cents, status, confirmed_at, rejection_reason, bills(title, description, total_amount_cents, due_date, status, organizer_id, bank_name, bank_account_number, bank_account_name)')
    .eq('payment_token', token)
    .single()

  if (error || !data) return null

  const bill = Array.isArray(data.bills) ? data.bills[0] : data.bills
  if (!bill) return null

  return {
    id: data.id,
    bill_id: data.bill_id,
    name: data.name,
    amount_cents: data.amount_cents,
    status: data.status,
    confirmed_at: data.confirmed_at,
    rejection_reason: data.rejection_reason ?? null,
    bill,
  }
}

export async function reviewParticipant(
  billId: string,
  organizerId: string,
  participantId: string,
  action: 'approve' | 'reject',
  reason?: string
): Promise<{ ok: boolean; reason?: string }> {
  // Verify the participant belongs to the organizer's bill
  const { data: participant, error: fetchError } = await supabaseAdmin
    .from('bill_participants')
    .select('id, status, bill_id, bills!inner(organizer_id)')
    .eq('id', participantId)
    .eq('bill_id', billId)
    .single()

  if (fetchError || !participant) return { ok: false, reason: 'not_found' }

  const bill = Array.isArray(participant.bills) ? participant.bills[0] : participant.bills
  if (!bill || (bill as { organizer_id: string }).organizer_id !== organizerId) {
    return { ok: false, reason: 'forbidden' }
  }

  if (participant.status !== 'PENDING') return { ok: false, reason: 'already_reviewed' }

  const newStatus = action === 'approve' ? 'CONFIRMED' : 'REJECTED'
  const { error } = await supabaseAdmin
    .from('bill_participants')
    .update({
      status: newStatus,
      reviewed_at: new Date().toISOString(),
      confirmed_at: action === 'approve' ? new Date().toISOString() : null,
      rejection_reason: action === 'reject' ? (reason ?? null) : null,
    })
    .eq('id', participantId)

  if (error) return { ok: false, reason: 'db_error' }
  return { ok: true }
}

export async function confirmPayment(token: string, proofUrl?: string): Promise<{ ok: boolean; reason?: string }> {
  const participant = await getParticipantByToken(token)

  if (!participant) return { ok: false, reason: 'not_found' }
  if (participant.status === 'CONFIRMED') return { ok: false, reason: 'already_confirmed' }
  if (participant.bill.status === 'CLOSED') return { ok: false, reason: 'bill_closed' }

  const { error } = await supabaseAdmin
    .from('bill_participants')
    .update({
      status: 'CONFIRMED',
      confirmed_at: new Date().toISOString(),
      proof_url: proofUrl ?? null,
    })
    .eq('payment_token', token)

  if (error) return { ok: false, reason: 'db_error' }
  return { ok: true }
}
