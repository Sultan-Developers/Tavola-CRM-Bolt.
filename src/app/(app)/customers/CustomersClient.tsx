'use client'

import { useState, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Customer } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { CustomerForm } from './CustomerForm'
import { Plus, Search, Download, Upload, Pencil, Trash2, Lock } from 'lucide-react'
import Papa from 'papaparse'

interface Props {
  initialCustomers: Customer[]
  businessId: string
  readOnly: boolean
}

export function CustomersClient({ initialCustomers, businessId, readOnly }: Props) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)
  const [deleting, setDeleting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return customers
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.email ?? '').toLowerCase().includes(q)
    )
  }, [customers, search])

  function openAdd() {
    setEditingCustomer(null)
    setFormOpen(true)
  }

  function openEdit(c: Customer) {
    setEditingCustomer(c)
    setFormOpen(true)
  }

  function handleSaved(customer: Customer) {
    setCustomers((prev) => {
      const idx = prev.findIndex((c) => c.id === customer.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = customer
        return next
      }
      return [customer, ...prev]
    })
    setFormOpen(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('customers') as any)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', deleteTarget.id)

    if (error) {
      toast.error(error.message)
    } else {
      setCustomers((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      toast.success('Customer deleted')
    }
    setDeleting(false)
    setDeleteTarget(null)
  }

  function exportCSV() {
    const rows = customers.map((c) => ({
      Name: c.name,
      Phone: c.phone,
      Email: c.email ?? '',
      Birthday: c.birthday ?? '',
      'Consent Status': c.consent_status,
      Notes: c.notes ?? '',
    }))
    const csv = Papa.unparse(rows)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'customers.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data
        if (!rows.length) { toast.error('No data found in CSV'); return }

        const supabase = createClient()
        let successCount = 0
        let errorCount = 0

        for (const row of rows) {
          const name = row['Name'] || row['name']
          const phone = row['Phone'] || row['phone']
          if (!name || !phone) { errorCount++; continue }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await (supabase.from('customers') as any).insert({
            business_id: businessId,
            name: name.trim(),
            phone: phone.trim(),
            email: row['Email'] || row['email'] || null,
            birthday: row['Birthday'] || row['birthday'] || null,
            notes: row['Notes'] || row['notes'] || null,
            consent_status: (['yes', 'no', 'pending'].includes(
              (row['Consent Status'] || '').toLowerCase()
            )
              ? row['Consent Status'].toLowerCase()
              : 'pending'),
          })

          if (error) errorCount++
          else successCount++
        }

        toast.success(`Imported ${successCount} customers${errorCount ? `, ${errorCount} skipped` : ''}`)

        // Refresh list
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase.from('customers') as any)
          .select('*')
          .eq('business_id', businessId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
        if (data) setCustomers(data)
      },
      error: () => toast.error('Failed to parse CSV'),
    })

    if (fileRef.current) fileRef.current.value = ''
  }

  const consentBadge = (status: string) => {
    if (status === 'yes') return <Badge className="bg-green-500/15 text-green-700 border border-green-200">Yes</Badge>
    if (status === 'no') return <Badge variant="destructive">No</Badge>
    return <Badge variant="secondary">Pending</Badge>
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-muted-foreground text-sm">{customers.length} total</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {readOnly && (
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" /> Read Only
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="mr-1 h-4 w-4" /> Export
          </Button>
          {!readOnly && (
            <>
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="mr-1 h-4 w-4" /> Import
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleImport}
              />
              <Button size="sm" onClick={openAdd}>
                <Plus className="mr-1 h-4 w-4" /> Add Customer
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name, phone, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {search ? (
            <p>No customers match your search.</p>
          ) : (
            <div className="space-y-2">
              <p className="font-medium">No customers yet</p>
              {!readOnly && <p className="text-sm">Add your first customer or import from CSV.</p>}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden md:table-cell">Birthday</TableHead>
                <TableHead>Consent</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.phone}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {customer.email ?? '—'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {customer.birthday
                      ? new Date(customer.birthday).toLocaleDateString()
                      : '—'}
                  </TableCell>
                  <TableCell>{consentBadge(customer.consent_status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {!readOnly && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(customer)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(customer)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? 'Edit Customer' : 'Add Customer'}
            </DialogTitle>
          </DialogHeader>
          <CustomerForm
            businessId={businessId}
            customer={editingCustomer}
            onSaved={handleSaved}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete <strong>{deleteTarget?.name}</strong>. They can be
              recovered by contacting support.
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
