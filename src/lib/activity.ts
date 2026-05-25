import { supabaseAdmin } from '@/lib/supabase'

export async function logActivity(
  actorId: string | null,
  actorName: string,
  action: string,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await supabaseAdmin.from('activity_logs').insert({
      actor_id: actorId,
      actor_name: actorName,
      action,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
      metadata: metadata ?? null,
    })
  } catch {
    // Never block the caller
  }
}
