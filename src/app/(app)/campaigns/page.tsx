import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isReadOnly } from '@/lib/auth'
import { CampaignsClient } from './CampaignsClient'
import { Business, Subscription, Profile } from '@/types'

export default async function CampaignsPage() {
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

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('business_id', biz.id)
    .maybeSingle()

  const readOnly = isReadOnly(subscription as Subscription | null, biz.status)

  const [{ data: campaigns }, { data: customers }] = await Promise.all([
    supabase
      .from('campaigns')
      .select('*')
      .eq('business_id', biz.id)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false }),
    supabase
      .from('customers')
      .select('id, name, phone, consent_status')
      .eq('business_id', biz.id)
      .is('deleted_at', null),
  ])

  return (
    <CampaignsClient
      initialCampaigns={campaigns ?? []}
      customers={(customers ?? []) as { id: string; name: string; phone: string; consent_status: 'yes' | 'no' | 'pending' }[]}
      business={biz}
      readOnly={readOnly}
    />
  )
}
