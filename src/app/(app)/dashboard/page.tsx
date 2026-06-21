import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Megaphone, CreditCard, AlertTriangle } from 'lucide-react'
import { isSubscriptionActive } from '@/lib/subscription'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Business, Subscription, Profile } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (!profileData) redirect('/login')
  const profile = profileData as Profile

  // Super admin sees aggregate stats
  if (profile.role === 'super_admin') {
    const [{ count: bizCount }, { count: custCount }, { count: campCount }] = await Promise.all([
      supabase.from('businesses').select('*', { count: 'exact', head: true }),
      supabase.from('customers').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('campaigns').select('*', { count: 'exact', head: true }).neq('status', 'deleted'),
    ])

    return (
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={<Users />} title="Total Businesses" value={bizCount ?? 0} />
          <StatCard icon={<Users />} title="Total Customers" value={custCount ?? 0} />
          <StatCard icon={<Megaphone />} title="Total Campaigns" value={campCount ?? 0} />
        </div>
      </div>
    )
  }

  // Business owner dashboard
  const { data: businessData } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!businessData) redirect('/onboarding')
  const business = businessData as Business

  const { data: subscriptionData } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('business_id', business.id)
    .maybeSingle()

  const subscription = subscriptionData as Subscription | null

  const [{ count: customerCount }, { count: campaignCount }] = await Promise.all([
    supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .is('deleted_at', null),
    supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .neq('status', 'deleted'),
  ])

  const active = isSubscriptionActive(subscription)
  const isExpired = !active
  const isSuspended = subscription?.status === 'suspended'

  const subStatusLabel = isSuspended
    ? 'Suspended'
    : subscription?.status === 'trial'
    ? 'Trial'
    : active
    ? 'Active'
    : 'Expired'

  const subStatusVariant: 'default' | 'secondary' | 'destructive' =
    isSuspended || isExpired ? 'destructive' : subscription?.status === 'trial' ? 'secondary' : 'default'

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{business.name}</h1>
          <p className="text-muted-foreground text-sm capitalize">{business.type}</p>
        </div>
        <Badge variant={subStatusVariant} className="w-fit">
          <CreditCard className="mr-1 h-3 w-3" />
          {subStatusLabel}
          {subscription?.ends_at && subscription.status !== 'active' && (
            <span className="ml-1 font-normal">
              · expires {new Date(subscription.ends_at).toLocaleDateString()}
            </span>
          )}
        </Badge>
      </div>

      {/* Read-only alert */}
      {(isExpired || isSuspended) && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">
              {isSuspended ? 'Account suspended' : 'Subscription expired'}
            </p>
            <p className="text-sm text-muted-foreground">
              {isSuspended
                ? 'Your account has been suspended. Contact support for assistance.'
                : 'Renew your subscription to add customers and send campaigns.'}
            </p>
            {!isSuspended && (
              <Link href="/billing">
                <Button size="sm" className="mt-2">Renew Now</Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          title="Total Customers"
          value={customerCount ?? 0}
          href="/customers"
        />
        <StatCard
          icon={<Megaphone className="h-5 w-5" />}
          title="Total Campaigns"
          value={campaignCount ?? 0}
          href="/campaigns"
        />
        <StatCard
          icon={<CreditCard className="h-5 w-5" />}
          title="Subscription"
          value={subStatusLabel}
          href="/billing"
          valueIsText
        />
      </div>
    </div>
  )
}

function StatCard({
  icon,
  title,
  value,
  href,
  valueIsText,
}: {
  icon: React.ReactNode
  title: string
  value: number | string
  href?: string
  valueIsText?: boolean
}) {
  const content = (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className={`font-bold ${valueIsText ? 'text-2xl' : 'text-3xl'}`}>{value}</div>
      </CardContent>
    </Card>
  )

  if (href) return <Link href={href}>{content}</Link>
  return content
}
