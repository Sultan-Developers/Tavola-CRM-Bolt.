'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Campaign, Business, Customer } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ExternalLink, Send, Loader2 } from 'lucide-react'

interface Props {
  campaign: Campaign
  customers: Pick<Customer, 'id' | 'name' | 'phone' | 'consent_status'>[]
  business: Business
  onSent: (campaignId: string, recipientCount: number) => void
  onClose: () => void
}

function buildWaLink(phone: string, message: string): string {
  const cleaned = phone.replace(/\D/g, '')
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`
}

function buildMessage(template: string, customerName: string, businessName: string, reviewUrl: string): string {
  return template
    .replace(/{{customer_name}}/g, customerName)
    .replace(/{{business_name}}/g, businessName)
    .replace(/{{google_review_url}}/g, reviewUrl)
}

export function SendCampaignDialog({ campaign, customers, business, onSent, onClose }: Props) {
  const [sending, setSending] = useState(false)
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())

  const eligibleCustomers = customers.filter((c) => c.consent_status !== 'no')

  async function markSent() {
    if (sentIds.size === 0) {
      toast.error('Open at least one wa.me link before marking as sent')
      return
    }
    setSending(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any
    const { error } = await supabase
      .from('campaigns')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        recipient_count: sentIds.size,
      })
      .eq('id', campaign.id)

    if (error) {
      toast.error(error.message)
      setSending(false)
      return
    }

    toast.success(`Campaign marked as sent to ${sentIds.size} customers`)
    onSent(campaign.id, sentIds.size)
  }

  function handleOpenLink(customerId: string) {
    setSentIds((prev) => new Set(prev).add(customerId))
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Send Campaign: {campaign.name}</DialogTitle>
          <DialogDescription>
            Click each WhatsApp link to open and send the message. Then mark as sent.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {eligibleCustomers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No customers with consent to message.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Consent</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eligibleCustomers.map((c) => {
                    const message = buildMessage(
                      campaign.message_template,
                      c.name,
                      business.name,
                      business.google_review_url ?? ''
                    )
                    const waLink = buildWaLink(c.phone, message)
                    const opened = sentIds.has(c.id)

                    return (
                      <TableRow key={c.id} className={opened ? 'opacity-60' : ''}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>{c.phone}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              c.consent_status === 'yes'
                                ? 'bg-green-500/15 text-green-700 border border-green-200'
                                : ''
                            }
                            variant={c.consent_status === 'yes' ? undefined : 'secondary'}
                          >
                            {c.consent_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => handleOpenLink(c.id)}
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline font-medium"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            {opened ? 'Opened' : 'Open WhatsApp'}
                          </a>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t gap-3">
          <p className="text-sm text-muted-foreground">
            {sentIds.size} / {eligibleCustomers.length} links opened
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={markSent} disabled={sending || sentIds.size === 0}>
              {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Send className="mr-1 h-4 w-4" />
              Mark as Sent
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
