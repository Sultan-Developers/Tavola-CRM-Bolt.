'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Campaign, Business } from '@/types'
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
  name: z.string().min(2, 'Campaign name required'),
  type: z.enum(['review', 'custom']),
  message_template: z.string().min(10, 'Message must be at least 10 characters'),
})

type FormData = z.infer<typeof schema>

const REVIEW_TEMPLATE = `Hi {{customer_name}}, thank you for visiting {{business_name}}! 🙏

We'd love to hear your feedback. Could you spare a minute to leave us a Google review?

{{google_review_url}}

Your review helps us improve and grow. Thank you!`

const VARIABLES = ['{{customer_name}}', '{{business_name}}', '{{google_review_url}}']

interface Props {
  businessId: string
  business: Business
  campaign: Campaign | null
  onSaved: (campaign: Campaign) => void
  onCancel: () => void
}

export function CampaignForm({ businessId, business, campaign, onSaved, onCancel }: Props) {
  const [loading, setLoading] = useState(false)
  const [selectedType, setSelectedType] = useState<'review' | 'custom'>(
    campaign?.type ?? 'custom'
  )

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: campaign?.name ?? '',
      type: campaign?.type ?? 'custom',
      message_template: campaign?.message_template ?? '',
    },
  })

  const template = watch('message_template')

  function handleTypeChange(v: 'review' | 'custom') {
    setSelectedType(v)
    setValue('type', v)
    if (v === 'review' && !campaign) {
      setValue('message_template', REVIEW_TEMPLATE)
    }
  }

  function insertVariable(v: string) {
    const area = document.getElementById('message_template') as HTMLTextAreaElement | null
    if (!area) {
      setValue('message_template', (template ?? '') + v)
      return
    }
    const start = area.selectionStart ?? template.length
    const end = area.selectionEnd ?? template.length
    const next = template.slice(0, start) + v + template.slice(end)
    setValue('message_template', next)
    setTimeout(() => {
      area.selectionStart = area.selectionEnd = start + v.length
      area.focus()
    }, 0)
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any

    const payload = {
      name: data.name,
      type: data.type,
      message_template: data.message_template,
    }

    if (campaign) {
      const { data: updated, error } = await supabase
        .from('campaigns')
        .update(payload)
        .eq('id', campaign.id)
        .select()
        .single()

      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('Campaign updated')
      onSaved(updated as Campaign)
    } else {
      const { data: created, error } = await supabase
        .from('campaigns')
        .insert({ ...payload, business_id: businessId })
        .select()
        .single()

      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('Campaign created')
      onSaved(created as Campaign)
    }
  }

  const preview = template
    ?.replace(/{{customer_name}}/g, 'John Doe')
    ?.replace(/{{business_name}}/g, business.name)
    ?.replace(/{{google_review_url}}/g, business.google_review_url ?? '[no URL set]')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="name">Campaign Name *</Label>
        <Input id="name" placeholder="e.g. July Review Request" {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-1">
        <Label>Type *</Label>
        <Select
          defaultValue={campaign?.type ?? 'custom'}
          onValueChange={(v) => handleTypeChange(v as 'review' | 'custom')}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="review">Review Request</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Label htmlFor="message_template">Message Template *</Label>
          <div className="flex gap-1 flex-wrap">
            {VARIABLES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => insertVariable(v)}
                className="text-xs bg-primary/10 text-primary hover:bg-primary/20 rounded px-1.5 py-0.5 transition-colors"
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <Textarea
          id="message_template"
          placeholder={
            selectedType === 'review'
              ? 'Review request template...'
              : 'Type your message here...'
          }
          rows={6}
          {...register('message_template')}
        />
        {errors.message_template && (
          <p className="text-xs text-destructive">{errors.message_template.message}</p>
        )}
      </div>

      {preview && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Preview</Label>
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm whitespace-pre-wrap text-foreground">
            {preview}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {campaign ? 'Save Changes' : 'Create Campaign'}
        </Button>
      </div>
    </form>
  )
}
