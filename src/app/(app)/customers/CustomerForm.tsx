'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Customer } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(7, 'Phone is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  birthday: z.string().optional(),
  notes: z.string().optional(),
  consent_status: z.enum(['yes', 'no', 'pending']),
})

type FormData = z.infer<typeof schema>

interface Props {
  businessId: string
  customer: Customer | null
  onSaved: (customer: Customer) => void
  onCancel: () => void
}

export function CustomerForm({ businessId, customer, onSaved, onCancel }: Props) {
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: customer?.name ?? '',
      phone: customer?.phone ?? '',
      email: customer?.email ?? '',
      birthday: customer?.birthday ?? '',
      notes: customer?.notes ?? '',
      consent_status: customer?.consent_status ?? 'pending',
    },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any

    const payload = {
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      birthday: data.birthday || null,
      notes: data.notes || null,
      consent_status: data.consent_status,
    }

    if (customer) {
      const { data: updated, error } = await supabase
        .from('customers')
        .update(payload)
        .eq('id', customer.id)
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          toast.error('A customer with this phone already exists')
        } else {
          toast.error(error.message)
        }
        setLoading(false)
        return
      }
      toast.success('Customer updated')
      onSaved(updated as Customer)
    } else {
      const { data: created, error } = await supabase
        .from('customers')
        .insert({ ...payload, business_id: businessId })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          toast.error('A customer with this phone already exists')
        } else {
          toast.error(error.message)
        }
        setLoading(false)
        return
      }
      toast.success('Customer added')
      onSaved(created as Customer)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label htmlFor="name">Name *</Label>
          <Input id="name" placeholder="Full name" {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="col-span-2 space-y-1">
          <Label htmlFor="phone">Phone *</Label>
          <Input id="phone" type="tel" placeholder="+91 98765 43210" {...register('phone')} />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
        </div>

        <div className="col-span-2 space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="optional" {...register('email')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="birthday">Birthday</Label>
          <Input id="birthday" type="date" {...register('birthday')} />
        </div>

        <div className="space-y-1">
          <Label>Consent</Label>
          <Select
            defaultValue={customer?.consent_status ?? 'pending'}
            onValueChange={(v) => setValue('consent_status', v as 'yes' | 'no' | 'pending')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2 space-y-1">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Optional notes..."
            rows={2}
            {...register('notes')}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {customer ? 'Save Changes' : 'Add Customer'}
        </Button>
      </div>
    </form>
  )
}
