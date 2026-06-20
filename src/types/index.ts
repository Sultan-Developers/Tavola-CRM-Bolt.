import { Database } from '@/types/database.types'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Business = Database['public']['Tables']['businesses']['Row']
export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type Customer = Database['public']['Tables']['customers']['Row']
export type CustomerTag = Database['public']['Tables']['customer_tags']['Row']
export type Campaign = Database['public']['Tables']['campaigns']['Row']
export type Payment = Database['public']['Tables']['payments']['Row']
export type AuditLog = Database['public']['Tables']['audit_logs']['Row']

export type BusinessWithSubscription = Business & {
  subscriptions: Subscription | null
}

export type PaymentWithBusiness = Payment & {
  businesses: Pick<Business, 'id' | 'name' | 'owner_id'>
}

export type AuditLogWithActor = AuditLog & {
  actor: Pick<Profile, 'id' | 'full_name'> | null
}
