'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Profile, Business } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Loader2 } from 'lucide-react'

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
})

const businessSchema = z.object({
  name: z.string().min(2, 'Business name required'),
  type: z.enum(['hotel', 'restaurant', 'cafe', 'other']),
  phone: z.string().min(7, 'Enter a valid phone'),
  google_review_url: z.string().url('Enter a valid URL').optional().or(z.literal('')),
})

type ProfileData = z.infer<typeof profileSchema>
type BusinessData = z.infer<typeof businessSchema>

interface Props {
  profile: Profile
  business: Business | null
  userEmail: string
}

export function ProfileClient({ profile, business, userEmail }: Props) {
  const router = useRouter()
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingBusiness, setSavingBusiness] = useState(false)

  const profileForm = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: profile.full_name },
  })

  const businessForm = useForm<BusinessData>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      name: business?.name ?? '',
      type: business?.type ?? 'restaurant',
      phone: business?.phone ?? '',
      google_review_url: business?.google_review_url ?? '',
    },
  })

  async function saveProfile(data: ProfileData) {
    setSavingProfile(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: data.full_name })
      .eq('id', profile.id)

    if (error) { toast.error(error.message); setSavingProfile(false); return }
    toast.success('Profile updated')
    setSavingProfile(false)
    router.refresh()
  }

  async function saveBusiness(data: BusinessData) {
    if (!business) return
    setSavingBusiness(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any
    const { error } = await supabase
      .from('businesses')
      .update({
        name: data.name,
        type: data.type,
        phone: data.phone,
        google_review_url: data.google_review_url || null,
      })
      .eq('id', business.id)

    if (error) { toast.error(error.message); setSavingBusiness(false); return }
    toast.success('Business updated')
    setSavingBusiness(false)
    router.refresh()
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      {/* Personal info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={profileForm.handleSubmit(saveProfile)} className="space-y-4">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={userEmail} disabled className="bg-muted/50" />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="full_name">Full Name</Label>
              <Input id="full_name" {...profileForm.register('full_name')} />
              {profileForm.formState.errors.full_name && (
                <p className="text-xs text-destructive">{profileForm.formState.errors.full_name.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Input value={profile.role.replace('_', ' ')} disabled className="bg-muted/50 capitalize" />
            </div>
            <Button type="submit" disabled={savingProfile}>
              {savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Profile
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Business info */}
      {business && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Business Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={businessForm.handleSubmit(saveBusiness)} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="biz_name">Business Name</Label>
                <Input id="biz_name" {...businessForm.register('name')} />
                {businessForm.formState.errors.name && (
                  <p className="text-xs text-destructive">{businessForm.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label>Business Type</Label>
                <Select
                  defaultValue={business.type}
                  onValueChange={(v) => businessForm.setValue('type', v as BusinessData['type'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hotel">Hotel</SelectItem>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="cafe">Cafe</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="biz_phone">Phone</Label>
                <Input id="biz_phone" type="tel" {...businessForm.register('phone')} />
                {businessForm.formState.errors.phone && (
                  <p className="text-xs text-destructive">{businessForm.formState.errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="biz_review_url">Google Review URL</Label>
                <Input
                  id="biz_review_url"
                  type="url"
                  placeholder="https://g.page/r/..."
                  {...businessForm.register('google_review_url')}
                />
                {businessForm.formState.errors.google_review_url && (
                  <p className="text-xs text-destructive">{businessForm.formState.errors.google_review_url.message}</p>
                )}
              </div>

              <Separator />
              <Button type="submit" disabled={savingBusiness}>
                {savingBusiness && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Business
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
