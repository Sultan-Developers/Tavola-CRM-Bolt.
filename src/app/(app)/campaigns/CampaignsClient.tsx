'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Campaign, Business, Customer } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { CampaignForm } from './CampaignForm'
import { SendCampaignDialog } from './SendCampaignDialog'
import { Plus, Pencil, Trash2, Send, Lock, Eye } from 'lucide-react'

interface Props {
  initialCampaigns: Campaign[]
  customers: Pick<Customer, 'id' | 'name' | 'phone' | 'consent_status'>[]
  business: Business
  readOnly: boolean
}

export function CampaignsClient({ initialCampaigns, customers, business, readOnly }: Props) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns)
  const [formOpen, setFormOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [sendCampaign, setSendCampaign] = useState<Campaign | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null)

  function openCreate() {
    setEditingCampaign(null)
    setFormOpen(true)
  }

  function openEdit(c: Campaign) {
    setEditingCampaign(c)
    setFormOpen(true)
  }

  function handleSaved(campaign: Campaign) {
    setCampaigns((prev) => {
      const idx = prev.findIndex((c) => c.id === campaign.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = campaign
        return next
      }
      return [campaign, ...prev]
    })
    setFormOpen(false)
  }

  function handleSent(campaignId: string, recipientCount: number) {
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === campaignId
          ? { ...c, status: 'sent' as const, sent_at: new Date().toISOString(), recipient_count: recipientCount }
          : c
      )
    )
    setSendCampaign(null)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any
    const { error } = await supabase
      .from('campaigns')
      .update({ status: 'deleted' })
      .eq('id', deleteTarget.id)

    if (error) {
      toast.error(error.message)
    } else {
      setCampaigns((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      toast.success('Campaign deleted')
    }
    setDeleting(false)
    setDeleteTarget(null)
  }

  const statusBadge = (status: Campaign['status']) => {
    if (status === 'sent')
      return <Badge className="bg-green-500/15 text-green-700 border border-green-200">Sent</Badge>
    if (status === 'deleted')
      return <Badge variant="destructive">Deleted</Badge>
    return <Badge variant="secondary">Draft</Badge>
  }

  const typeBadge = (type: Campaign['type']) => (
    <Badge variant="outline" className="capitalize">{type}</Badge>
  )

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground text-sm">{campaigns.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          {readOnly && (
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" /> Read Only
            </Badge>
          )}
          {!readOnly && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1 h-4 w-4" /> New Campaign
            </Button>
          )}
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="space-y-2">
            <p className="font-medium">No campaigns yet</p>
            {!readOnly && <p className="text-sm">Create your first campaign to reach customers.</p>}
          </div>
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Recipients</TableHead>
                <TableHead className="hidden md:table-cell">Created</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>{typeBadge(campaign.type)}</TableCell>
                  <TableCell>{statusBadge(campaign.status)}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {campaign.recipient_count}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {new Date(campaign.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPreviewCampaign(campaign)}
                        title="Preview"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {!readOnly && campaign.status === 'draft' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(campaign)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary"
                            onClick={() => setSendCampaign(campaign)}
                            title="Send"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {!readOnly && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(campaign)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCampaign ? 'Edit Campaign' : 'New Campaign'}</DialogTitle>
          </DialogHeader>
          <CampaignForm
            businessId={business.id}
            business={business}
            campaign={editingCampaign}
            onSaved={handleSaved}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Send Dialog */}
      {sendCampaign && (
        <SendCampaignDialog
          campaign={sendCampaign}
          customers={customers}
          business={business}
          onSent={handleSent}
          onClose={() => setSendCampaign(null)}
        />
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewCampaign} onOpenChange={(o) => !o && setPreviewCampaign(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Campaign Preview</DialogTitle>
          </DialogHeader>
          {previewCampaign && (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Template</p>
                <div className="rounded-lg bg-muted p-3 text-sm whitespace-pre-wrap">
                  {previewCampaign.message_template}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Sample (first customer)</p>
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm whitespace-pre-wrap">
                  {previewCampaign.message_template
                    .replace(/{{customer_name}}/g, 'John Doe')
                    .replace(/{{business_name}}/g, business.name)
                    .replace(/{{google_review_url}}/g, business.google_review_url ?? '[no URL set]')}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark <strong>{deleteTarget?.name}</strong> as deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
