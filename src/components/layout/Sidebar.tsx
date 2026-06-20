'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Users,
  Megaphone,
  CreditCard,
  Settings,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react'
import { Profile, Business } from '@/types'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/customers', icon: Users, label: 'Customers' },
  { href: '/campaigns', icon: Megaphone, label: 'Campaigns' },
  { href: '/billing', icon: CreditCard, label: 'Billing' },
  { href: '/profile', icon: Settings, label: 'Profile' },
]

const adminNavItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin', icon: ShieldCheck, label: 'Admin Panel' },
  { href: '/profile', icon: Settings, label: 'Profile' },
]

interface SidebarProps {
  profile: Profile
  business: Business | null
}

export function Sidebar({ profile, business }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/login')
    router.refresh()
  }

  const items = profile.role === 'super_admin' ? adminNavItems : navItems

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-border">
        <div className="text-xl font-bold text-primary">Tavola CRM</div>
        {business && (
          <div className="text-xs text-muted-foreground mt-0.5 truncate">{business.name}</div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground/70 hover:text-foreground hover:bg-muted'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
              {active && <ChevronRight className="ml-auto h-3 w-3" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
            {profile.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{profile.full_name || 'User'}</div>
            <div className="text-xs text-muted-foreground capitalize">{profile.role.replace('_', ' ')}</div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-background border-b border-border flex items-center px-4 gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(!open)}
          className="shrink-0"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <div className="text-lg font-bold text-primary">Tavola CRM</div>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={cn(
          'lg:hidden fixed top-14 left-0 bottom-0 z-40 w-64 bg-background border-r border-border transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <NavContent />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-56 lg:flex-col bg-background border-r border-border">
        <NavContent />
      </div>
    </>
  )
}
