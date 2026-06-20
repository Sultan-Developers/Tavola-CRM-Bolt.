import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminClient } from './AdminClient'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (!profileData) redirect('/login')
  const profile = profileData as { id: string; role: string; full_name: string }
  if (profile.role !== 'super_admin') redirect('/dashboard')

  const [{ data: businesses }, { data: payments }, { data: auditLogs }] = await Promise.all([
    supabase
      .from('businesses')
      .select('*, subscriptions(*)')
      .order('created_at', { ascending: false }),
    supabase
      .from('payments')
      .select('*, businesses(id, name, owner_id)')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('audit_logs')
      .select('*, actor:profiles(id, full_name)')
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (
    <AdminClient
      businesses={(businesses ?? []) as any}
      payments={(payments ?? []) as any}
      auditLogs={(auditLogs ?? []) as any}
    />
  )
}
