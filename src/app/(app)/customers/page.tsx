import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isReadOnly } from '@/lib/subscription'
import { CustomersClient } from './CustomersClient'
import { Business, Subscription, Profile } from '@/types'

export default async function CustomersPage() {
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

  const readOnly = isReadOnly(subscription as Subscription | null)

  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .eq('business_id', biz.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  return (
    <CustomersClient
      initialCustomers={customers ?? []}
      businessId={biz.id}
      readOnly={readOnly}
    />
  )
}
