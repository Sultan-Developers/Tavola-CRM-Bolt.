import { createClient } from '@/lib/supabase/server'

type AuditAction = 
  | 'customer.created' | 'customer.updated' | 'customer.deleted'
  | 'campaign.created' | 'campaign.updated' | 'campaign.sent' | 'campaign.deleted'
  | 'payment.submitted' | 'payment.approved' | 'payment.rejected'
  | 'business.updated' | 'business.suspended' | 'subscription.updated'
  | 'profile.updated'

export async function insertAuditLog({
  action,
  entityType,
  entityId,
  businessId,
  metadata,
}: {
  action: AuditAction
  entityType: string
  entityId?: string
  businessId?: string
  metadata?: Record<string, unknown>
}) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('audit_logs') as any).insert({
      actor_id: user?.id ?? null,
      business_id: businessId ?? null,
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      metadata: metadata ?? null,
    })
  } catch {
    // Audit failures must never break business logic
  }
}
