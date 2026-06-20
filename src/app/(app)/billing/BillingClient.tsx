'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Business, Subscription, Payment } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, CreditCard, CheckCircle, Clock, XCircle, Upload } from 'lucide-react'
import { isSubscriptionActive } from '@/lib/subscription'

const PLANS = {
  monthly: { label: 'Monthly Plan', amount: 999, description: 'Billed monthly — ₹999/mo' },
  yearly: { label: 'Yearly Plan', amount: 9999, description: 'Billed annually — ₹9,999/yr (save 17%)' },
}

const UPI_ID = 'tavola@upi'

interface Props {
  business: Business
  subscription: Subscription | null
  initialPayments: Payment[]
}

export function BillingClient({ business, subscription, initialPayments }: Props) {
  const [payments, setPayments] = useState<Payment[]>(initialPayments)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly')
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [upiRef, setUpiRef] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const active = isSubscriptionActive(subscription)

  const subStatusLabel = business.status === 'suspended'
    ? 'Suspended'
    : subscription?.status === 'trial'
    ? 'Trial'
    : active
    ? 'Active'
    : 'Expired'

  const subStatusVariant: 'default' | 'secondary' | 'destructive' =
    business.status === 'suspended' || !active
      ? 'destructive'
      : subscription?.status === 'trial'
      ? 'secondary'
      : 'default'

  async function handleSubmitPayment() {
    if (!screenshotFile) { toast.error('Please upload a payment screenshot'); return }
    setSubmitting(true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any

    // Upload screenshot
    const ext = screenshotFile.name.split('.').pop()
    const filename = `${business.id}/${Date.now()}.${ext}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('payment-screenshots')
      .upload(filename, screenshotFile, { upsert: false })

    if (uploadError) {
      toast.error('Screenshot upload failed: ' + uploadError.message)
      setSubmitting(false)
      return
    }

    const { data: urlData } = supabase.storage
      .from('payment-screenshots')
      .getPublicUrl(uploadData.path)

    const { data: payment, error: payError } = await supabase
      .from('payments')
      .insert({
        business_id: business.id,
        subscription_id: subscription?.id ?? null,
        plan: selectedPlan,
        amount: PLANS[selectedPlan].amount,
        currency: 'INR',
        screenshot_url: urlData.publicUrl,
        upi_ref: upiRef || null,
        status: 'pending',
      })
      .select()
      .single()

    if (payError) {
      toast.error(payError.message)
      setSubmitting(false)
      return
    }

    setPayments((prev) => [payment as Payment, ...prev])
    toast.success('Payment submitted! Our team will verify within 24 hours.')
    setPaymentOpen(false)
    setScreenshotFile(null)
    setUpiRef('')
    setSubmitting(false)
  }

  const payStatusIcon = (status: Payment['status']) => {
    if (status === 'approved') return <CheckCircle className="h-4 w-4 text-green-600" />
    if (status === 'rejected') return <XCircle className="h-4 w-4 text-destructive" />
    return <Clock className="h-4 w-4 text-yellow-500" />
  }

  const payStatusBadge = (status: Payment['status']) => {
    if (status === 'approved')
      return <Badge className="bg-green-500/15 text-green-700 border border-green-200">Approved</Badge>
    if (status === 'rejected')
      return <Badge variant="destructive">Rejected</Badge>
    return <Badge variant="secondary">Pending</Badge>
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Billing</h1>

      {/* Current subscription */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Subscription Status</CardTitle>
            <Badge variant={subStatusVariant}>{subStatusLabel}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Plan</p>
              <p className="font-medium capitalize">{subscription?.plan ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Started</p>
              <p className="font-medium">
                {subscription?.starts_at
                  ? new Date(subscription.starts_at).toLocaleDateString()
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Expires</p>
              <p className="font-medium">
                {subscription?.ends_at
                  ? new Date(subscription.ends_at).toLocaleDateString()
                  : '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plans */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Plans</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(Object.entries(PLANS) as [keyof typeof PLANS, (typeof PLANS)[keyof typeof PLANS]][]).map(
            ([key, plan]) => (
              <Card
                key={key}
                className={`cursor-pointer transition-all ${
                  selectedPlan === key ? 'border-primary ring-1 ring-primary' : 'hover:shadow-md'
                }`}
                onClick={() => { setSelectedPlan(key); setPaymentOpen(true) }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{plan.label}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    ₹{plan.amount.toLocaleString()}
                  </div>
                  <Button className="mt-3 w-full" size="sm">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pay Now (UPI)
                  </Button>
                </CardContent>
              </Card>
            )
          )}
        </div>
      </div>

      {/* Payment history */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Payment History</h2>
        {payments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-md">
            No payment records yet
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">UPI Ref</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="capitalize">{p.plan}</TableCell>
                    <TableCell>₹{p.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {payStatusIcon(p.status)}
                        {payStatusBadge(p.status)}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {p.upi_ref ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Payment dialog */}
      <Dialog open={paymentOpen} onOpenChange={(o) => !o && setPaymentOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pay via UPI</DialogTitle>
            <DialogDescription>
              Make a UPI transfer and upload your payment screenshot.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4 text-sm space-y-2">
              <p className="font-medium">Payment Details</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">UPI ID</span>
                <span className="font-mono font-medium">{UPI_ID}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-bold text-base">₹{PLANS[selectedPlan].amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan</span>
                <span className="capitalize">{selectedPlan}</span>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Plan</Label>
              <Select value={selectedPlan} onValueChange={(v) => setSelectedPlan(v as 'monthly' | 'yearly')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly — ₹999</SelectItem>
                  <SelectItem value="yearly">Yearly — ₹9,999</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="upi_ref">UPI Reference Number (optional)</Label>
              <Input
                id="upi_ref"
                placeholder="e.g. 123456789012"
                value={upiRef}
                onChange={(e) => setUpiRef(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Payment Screenshot *</Label>
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors">
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <Upload className="h-6 w-6" />
                  {screenshotFile ? (
                    <span className="text-sm text-primary font-medium">{screenshotFile.name}</span>
                  ) : (
                    <span className="text-sm">Click to upload screenshot</span>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setScreenshotFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPaymentOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleSubmitPayment} disabled={submitting || !screenshotFile}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
