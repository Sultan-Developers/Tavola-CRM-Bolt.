import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BillingClient } from './BillingClient'
import { Business, Subscription, Payment, Profile } from '@/types'

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = (profileData as Profile | null)?.role
  if (role === 'super_admin') redirect('/admin')

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!business) redirect('/onboarding')
  const biz = business as Business

  const [{ data: subscription }, { data: payments }] = await Promise.all([
    supabase.from('subscriptions').select('*').eq('business_id', biz.id).maybeSingle(),
    supabase
      .from('payments')
      .select('*')
      .eq('business_id', biz.id)
      .order('created_at', { ascending: false }),
  ])

  return (
    <BillingClient
      business={biz}
      subscription={subscription as Subscription | null}
      initialPayments={(payments ?? []) as Payment[]}
    />
  )
}
