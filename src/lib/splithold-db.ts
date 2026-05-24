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
}

export interface BillParticipant {
  id: string
  bill_id: string
  name: string
  email: string | null
  amount_cents: number
  payment_token: string
  status: 'PENDING' | 'CONFIRMED'
  confirmed_at: string | null
  created_at: string
}

export interface BillWithParticipants extends Bill {
  participants: BillParticipant[]
}

export interface CreateBillInput {
  title: string
  description?: string
  total_amount_cents: number
  due_date: string
  participants: Array<{
    name: string
    email?: string
    amount_cents: number
  }>
}

export interface BillSummary extends Bill {
  participant_count: number
  confirmed_count: number
}

export async function createBill(
  organizerId: string,
  data: CreateBillInput
): Promise<BillWithParticipants> {
  const { data: bill, error: billError } = await supabaseAdmin
    .from('bills')
    .insert({
      organizer_id: organizerId,
      title: data.title,
      description: data.description ?? null,
      total_amount_cents: data.total_amount_cents,
      due_date: data.due_date,
      status: 'ACTIVE',
    })
    .select()
    .single()

  if (billError || !bill) {
    throw new Error(billError?.message ?? 'Failed to create bill')
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
    .select('*, bill_participants(id, status)')
    .eq('organizer_id', organizerId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  if (!bills) return []

  return bills.map(bill => {
    const parts = (bill.bill_participants ?? []) as Array<{ id: string; status: string }>
    return {
      id: bill.id,
      organizer_id: bill.organizer_id,
      title: bill.title,
      description: bill.description,
      total_amount_cents: bill.total_amount_cents,
      due_date: bill.due_date,
      status: bill.status,
      created_at: bill.created_at,
      participant_count: parts.length,
      confirmed_count: parts.filter(p => p.status === 'CONFIRMED').length,
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

export interface PublicParticipant {
  id: string
  bill_id: string
  name: string
  amount_cents: number
  status: 'PENDING' | 'CONFIRMED'
  confirmed_at: string | null
  bill: {
    title: string
    description: string | null
    total_amount_cents: number
    due_date: string
    status: 'ACTIVE' | 'CLOSED'
    organizer_id: string
  }
}

export async function getParticipantByToken(token: string): Promise<PublicParticipant | null> {
  const { data, error } = await supabaseAdmin
    .from('bill_participants')
    .select('id, bill_id, name, amount_cents, status, confirmed_at, bills(title, description, total_amount_cents, due_date, status, organizer_id)')
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
    bill,
  }
}

export async function confirmPayment(token: string): Promise<{ ok: boolean; reason?: string }> {
  const participant = await getParticipantByToken(token)

  if (!participant) return { ok: false, reason: 'not_found' }
  if (participant.status === 'CONFIRMED') return { ok: false, reason: 'already_confirmed' }
  if (participant.bill.status === 'CLOSED') return { ok: false, reason: 'bill_closed' }

  const { error } = await supabaseAdmin
    .from('bill_participants')
    .update({ status: 'CONFIRMED', confirmed_at: new Date().toISOString() })
    .eq('payment_token', token)

  if (error) return { ok: false, reason: 'db_error' }
  return { ok: true }
}
