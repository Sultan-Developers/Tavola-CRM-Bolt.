'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Store } from 'lucide-react'

const schema = z.object({
  name: z.string().min(2, 'Business name must be at least 2 characters'),
  type: z.enum(['hotel', 'restaurant', 'cafe', 'other']),
  phone: z.string().min(7, 'Enter a valid phone number'),
  google_review_url: z.string().url('Enter a valid URL').optional().or(z.literal('')),
})

type FormData = z.infer<typeof schema>

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'restaurant' },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .insert({
        owner_id: user.id,
        name: data.name,
        type: data.type,
        phone: data.phone || null,
        google_review_url: data.google_review_url || null,
      })
      .select()
      .single()

    if (bizError) {
      toast.error(bizError.message)
      setLoading(false)
      return
    }

    const trialEnd = new Date()
    trialEnd.setDate(trialEnd.getDate() + 14)

    await supabase.from('subscriptions').insert({
      business_id: business.id,
      plan: 'monthly',
      status: 'trial',
      ends_at: trialEnd.toISOString(),
    })

    toast.success('Business set up! Welcome to Tavola CRM.')
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Store className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Set up your business</CardTitle>
          <CardDescription>
            Tell us about your HORECA business to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Business Name *</Label>
              <Input
                id="name"
                placeholder="e.g. The Grand Hotel"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label>Business Type *</Label>
              <Select
                defaultValue="restaurant"
                onValueChange={(v) => setValue('type', v as FormData['type'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hotel">Hotel</SelectItem>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="cafe">Cafe</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-xs text-destructive">{errors.type.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="phone">Business Phone *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+91 98765 43210"
                {...register('phone')}
              />
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="google_review_url">Google Review URL</Label>
              <Input
                id="google_review_url"
                type="url"
                placeholder="https://g.page/r/..."
                {...register('google_review_url')}
              />
              {errors.google_review_url && (
                <p className="text-xs text-destructive">{errors.google_review_url.message}</p>
              )}
              <p className="text-xs text-muted-foreground">Used in review request campaigns</p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete Setup
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
