'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CheckCircle, XCircle, Eye, Ban, RotateCcw } from 'lucide-react'

interface BusinessRow {
  id: string
  owner_id: string
  name: string
  type: string
  phone: string | null
  status: 'active' | 'suspended'
  created_at: string
  subscriptions: { status: string; plan: string; ends_at: string | null }[] | null
}

interface PaymentRow {
  id: string
  business_id: string
  plan: 'monthly' | 'yearly'
  amount: number
  currency: string
  screenshot_url: string | null
  status: 'pending' | 'approved' | 'rejected'
  upi_ref: string | null
  notes: string | null
  created_at: string
  businesses: { id: string; name: string } | null
}

interface AuditRow {
  id: string
  action: string
  entity_type: string
  entity_id: string | null
  created_at: string
  actor: { id: string; full_name: string } | null
  business_id: string | null
}

interface Props {
  businesses: BusinessRow[]
  payments: PaymentRow[]
  auditLogs: AuditRow[]
}

export function AdminClient({ businesses: initialBusinesses, payments: initialPayments, auditLogs }: Props) {
  const [businesses, setBusinesses] = useState<BusinessRow[]>(initialBusinesses)
  const [payments, setPayments] = useState<PaymentRow[]>(initialPayments)
  const [suspendTarget, setSuspendTarget] = useState<BusinessRow | null>(null)
  const [actioning, setActioning] = useState(false)
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)

  async function handleSuspendToggle() {
    if (!suspendTarget) return
    setActioning(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any
    const newStatus = suspendTarget.status === 'active' ? 'suspended' : 'active'

    const { error } = await supabase
      .from('businesses')
      .update({ status: newStatus })
      .eq('id', suspendTarget.id)

    if (error) {
      toast.error(error.message)
    } else {
      setBusinesses((prev) =>
        prev.map((b) =>
          b.id === suspendTarget.id ? { ...b, status: newStatus as 'active' | 'suspended' } : b
        )
      )
      toast.success(`Business ${newStatus === 'suspended' ? 'suspended' : 'reactivated'}`)
    }

    setActioning(false)
    setSuspendTarget(null)
  }

  async function approvePayment(paymentId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any
    const { data: { user } } = await supabase.auth.getUser()

    const payment = payments.find((p) => p.id === paymentId)
    if (!payment) return

    const { error } = await supabase
      .from('payments')
      .update({
        status: 'approved',
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', paymentId)

    if (error) { toast.error(error.message); return }

    // Activate subscription
    const endDate = new Date()
    if (payment.plan === 'monthly') endDate.setMonth(endDate.getMonth() + 1)
    else endDate.setFullYear(endDate.getFullYear() + 1)

    await supabase
      .from('subscriptions')
      .upsert({
        business_id: payment.business_id,
        plan: payment.plan,
        status: 'active',
        starts_at: new Date().toISOString(),
        ends_at: endDate.toISOString(),
      }, { onConflict: 'business_id' })

    setPayments((prev) =>
      prev.map((p) => (p.id === paymentId ? { ...p, status: 'approved' as const } : p))
    )
    toast.success('Payment approved and subscription activated')
  }

  async function rejectPayment(paymentId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('payments')
      .update({
        status: 'rejected',
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', paymentId)

    if (error) { toast.error(error.message); return }

    setPayments((prev) =>
      prev.map((p) => (p.id === paymentId ? { ...p, status: 'rejected' as const } : p))
    )
    toast.success('Payment rejected')
  }

  const pendingPayments = payments.filter((p) => p.status === 'pending')

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">Total Businesses</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{businesses.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {businesses.filter((b) => b.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">Suspended</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {businesses.filter((b) => b.status === 'suspended').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{pendingPayments.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="businesses">
        <TabsList>
          <TabsTrigger value="businesses">Businesses</TabsTrigger>
          <TabsTrigger value="payments">
            Payments
            {pendingPayments.length > 0 && (
              <Badge variant="destructive" className="ml-1.5 h-4 text-xs px-1">
                {pendingPayments.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
        </TabsList>

        {/* Businesses tab */}
        <TabsContent value="businesses">
          <div className="rounded-md border overflow-x-auto mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead className="hidden md:table-cell">Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {businesses.map((biz) => (
                  <TableRow key={biz.id}>
                    <TableCell className="font-medium">{biz.name}</TableCell>
                    <TableCell className="capitalize">{biz.type}</TableCell>
                    <TableCell>
                      <Badge variant={biz.status === 'active' ? 'default' : 'destructive'}>
                        {biz.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {biz.subscriptions && biz.subscriptions.length > 0 ? (
                        <Badge variant="secondary" className="capitalize">
                          {biz.subscriptions[0].status}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {new Date(biz.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={
                          biz.status === 'active'
                            ? 'text-destructive hover:text-destructive'
                            : 'text-green-600 hover:text-green-600'
                        }
                        onClick={() => setSuspendTarget(biz)}
                      >
                        {biz.status === 'active' ? (
                          <><Ban className="mr-1 h-3.5 w-3.5" /> Suspend</>
                        ) : (
                          <><RotateCcw className="mr-1 h-3.5 w-3.5" /> Reactivate</>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Payments tab */}
        <TabsContent value="payments">
          <div className="rounded-md border overflow-x-auto mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.businesses?.name ?? '—'}
                    </TableCell>
                    <TableCell className="capitalize">{p.plan}</TableCell>
                    <TableCell>₹{p.amount.toLocaleString()}</TableCell>
                    <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.status === 'approved'
                            ? 'default'
                            : p.status === 'rejected'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className={
                          p.status === 'approved'
                            ? 'bg-green-500/15 text-green-700 border border-green-200'
                            : ''
                        }
                      >
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {p.screenshot_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setScreenshotUrl(p.screenshot_url)}
                            title="View screenshot"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {p.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-green-600 hover:text-green-600"
                              onClick={() => approvePayment(p.id)}
                              title="Approve"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => rejectPayment(p.id)}
                              title="Reject"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Audit log tab */}
        <TabsContent value="audit">
          <div className="rounded-md border overflow-x-auto mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>{log.actor?.full_name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {log.entity_type}
                      {log.entity_id && (
                        <span className="ml-1 font-mono opacity-50">{log.entity_id.slice(0, 8)}…</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {auditLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No audit logs yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Suspend confirm */}
      <AlertDialog open={!!suspendTarget} onOpenChange={(o) => !o && setSuspendTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {suspendTarget?.status === 'active' ? 'Suspend business?' : 'Reactivate business?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {suspendTarget?.status === 'active'
                ? `Suspending "${suspendTarget?.name}" will block all write actions.`
                : `Reactivating "${suspendTarget?.name}" will restore normal access.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actioning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspendToggle}
              disabled={actioning}
              className={
                suspendTarget?.status === 'active'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : ''
              }
            >
              {suspendTarget?.status === 'active' ? 'Suspend' : 'Reactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Screenshot viewer */}
      <Dialog open={!!screenshotUrl} onOpenChange={(o) => !o && setScreenshotUrl(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment Screenshot</DialogTitle>
          </DialogHeader>
          {screenshotUrl && (
            <img
              src={screenshotUrl}
              alt="Payment screenshot"
              className="w-full rounded-md border"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
