import { Subscription } from '@/types'

export function isSubscriptionActive(sub: Subscription | null): boolean {
  if (!sub) return false
  if (sub.status === 'active') {
    if (!sub.ends_at) return true
    return new Date(sub.ends_at) > new Date()
  }
  if (sub.status === 'trial') {
    if (!sub.ends_at) return true
    return new Date(sub.ends_at) > new Date()
  }
  return false
}

export function isReadOnly(sub: Subscription | null, businessStatus: string): boolean {
  if (businessStatus === 'suspended') return true
  return !isSubscriptionActive(sub)
}
