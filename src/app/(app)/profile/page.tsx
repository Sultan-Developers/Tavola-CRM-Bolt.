import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileClient } from './ProfileClient'
import { Profile, Business } from '@/types'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profileData }, { data: businessData }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('businesses').select('*').eq('owner_id', user.id).maybeSingle(),
  ])

  if (!profileData) redirect('/login')

  return (
    <ProfileClient
      profile={profileData as Profile}
      business={businessData as Business | null}
      userEmail={user.email ?? ''}
    />
  )
}
