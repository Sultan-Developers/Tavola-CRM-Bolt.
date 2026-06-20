import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { Profile, Business } from '@/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [profileRes, businessRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('businesses').select('*').eq('owner_id', user.id).maybeSingle(),
  ])

  const profile = profileRes.data as Profile | null
  if (!profile) redirect('/login')

  // Only business owners without a business need onboarding
  if (profile.role === 'business_owner' && !businessRes.data) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Sidebar profile={profile} business={businessRes.data as Business | null} />
      <main className="lg:pl-56">
        <div className="pt-14 lg:pt-0">
          {children}
        </div>
      </main>
    </div>
  )
}
