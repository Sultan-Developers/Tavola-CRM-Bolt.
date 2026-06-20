import { createClient } from '@/lib/supabase/server'
import { Profile, Business, Subscription } from '@/types'
export { isSubscriptionActive, isReadOnly } from '@/lib/subscription'

export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  return data as Profile | null
}

export async function getBusiness(): Promise<Business | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle()

  return data as Business | null
}

export async function getSubscription(businessId: string): Promise<Subscription | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('business_id', businessId)
    .maybeSingle()

  return data as Subscription | null
}
