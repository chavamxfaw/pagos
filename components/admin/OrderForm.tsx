'use client'

import { KeyboardEvent, useActionState, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { getTodayDateString } from '@/lib/utils'
import type { BankAccount, Client, FiscalDocument, Order, OrderCategory, OrderStatus } from '@/types'

type State = { error?: string } | null

export function OrderForm({
  action,
  clients,
  bankAccounts = [],
  fiscalDocuments = [],
  defaultClientId,
  defaultProjectId,
  projects = [],
  defaultValues,
  submitLabel = 'Crear orden',
}: {
  action: (prevState: State, formData: FormData) => Promise<State>
  clients: Client[]
  bankAccounts?: BankAccount[]
  fiscalDocuments?: FiscalDocument[]
  defaultClientId?: string
  defaultProjectId?: string
  projects?: { id: string; title: string; client_id: string | null }[]
  defaultValues?: Order
  submitLabel?: string
}) {
  const [state, formAction, pending] = useActionState(action, null)
  const initialTaxMode = defaultValues?.tax_mode === 'added' ? 'added' : 'included'
  const initialAmount = getInitialAmount(defaultValues)
  const [amount, setAmount] = useState(initialAmount)
  const [requiresInvoice, setRequiresInvoice] = useState(defaultValues?.requires_invoice ?? false)
  const [taxMode, setTaxMode] = useState<'included' | 'added'>(initialTaxMode)
  const initialClientId = defaultValues?.client_id ?? defaultClientId ?? ''
  const today = getTodayDateString()
  const [selectedClientId, setSelectedClientId] = useState(initialClientId)
  const [selectedProjectId, setSelectedProjectId] = useState(defaultProjectId ?? '')
  const [selectedBankAccountId, setSelectedBankAccountId] = useState(defaultValues?.bank_account_id ?? 'none')
  const [category, setCategory] = useState<OrderCategory>(defaultValues?.category ?? 'service')
  const [editableStatus, setEditableStatus] = useState(defaultValues ? getEditableStatus(defaultValues.status) : 'auto')
  const [tags, setTags] = useState<string[]>(defaultValues?.tags ?? [])
  const [tagInput, setTagInput] = useState('')
  const [dueDate, setDueDate] = useState(defaultValues?.due_date ?? '')
  const [paymentReminderEnabled, setPaymentReminderEnabled] = useState(defaultValues?.payment_reminder_enabled ?? false)
  const [paymentReminderDaysBefore, setPaymentReminderDaysBefore] = useState(String(defaultValues?.payment_reminder_days_before ?? 1))
  const [notifyEmailEnabled, setNotifyEmailEnabled] = useState(defaultValues?.notify_email_enabled ?? true)
  const [notifyWhatsappEnabled, setNotifyWhatsappEnabled] = useState(defaultValues?.notify_whatsapp_enabled ?? true)
  const [selectedFiscalDocumentId, setSelectedFiscalDocumentId] = useState(defaultValues?.fiscal_document_id ?? 'none')
  const [showFiscalDocument, setShowFiscalDocument] = useState(defaultValues?.public_show_fiscal_document ?? false)
  const selectedClient = clients.find((client) => client.id === selectedClientId)
  const selectedBankAccount = bankAccounts.find((account) => account.id === selectedBankAccountId)
  const selectedFiscalDocument = fiscalDocuments.find((document) => document.id === selectedFiscalDocumentId)
  const selectedCategoryLabel = orderCategories.find((item) => item.value === category)?.label ?? 'Servicio'

  const taxPreview = useMemo(() => {
    const parsed = parseFloat(amount)
    if (!Number.isFinite(parsed) || parsed <= 0) return null

    if (!requiresInvoice) {
      return {
        subtotal: parsed,
        tax: 0,
        total: parsed,
      }
    }

    if (taxMode === 'included') {
      const subtotal = parsed / 1.16
      return {
        subtotal,
        tax: parsed - subtotal,
        total: parsed,
      }
    }

    const tax = parsed * 0.16
    return {
      subtotal: parsed,
      tax,
      total: parsed + tax,
    }
  }, [amount, requiresInvoice, taxMode])

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="client_id" className="text-foreground">Cliente *</Label>
        <Select name="client_id" value={selectedClientId} onValueChange={(value) => value && setSelectedClientId(value)} required>
          <SelectTrigger className="w-full bg-card border-border text-foreground">
            <span className="truncate text-left">
              {selectedClient
                ? `${selectedClient.name}${selectedClient.email ? ` — ${selectedClient.email}` : ' — Sin correo'}`
                : 'Selecciona un cliente...'}
            </span>
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {clients.map((client) => (
          <SelectItem key={client.id} value={client.id} className="text-foreground focus:bg-muted">
                {client.name}{client.email ? ` — ${client.email}` : ' — Sin correo'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="crm_project_id">Proyecto asociado</Label>
        <select id="crm_project_id" name="crm_project_id" className="h-11 w-full rounded-xl border border-slate-200 bg-card px-3 text-sm focus-visible:ring-2 focus-visible:ring-blue-500" value={projects.some(project => project.id === selectedProjectId && project.client_id === selectedClientId) ? selectedProjectId : ''} onChange={event => setSelectedProjectId(event.target.value)}>
          <option value="">Sin proyecto</option>
          {projects.filter(project => project.client_id === selectedClientId).map(project => <option key={project.id} value={project.id}>{project.title}</option>)}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="issued_at" className="text-foreground">Fecha de emisión</Label>
          <Input
            id="issued_at"
            name="issued_at"
            type="date"
            defaultValue={defaultValues?.issued_at ?? today}
            className="bg-card border-border text-foreground"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="due_date" className="text-foreground">Fecha límite de pago</Label>
          <Input
            id="due_date"
            name="due_date"
            type="date"
            value={dueDate}
            onChange={(event) => {
              const nextValue = event.target.value
              setDueDate(nextValue)
              if (!nextValue) setPaymentReminderEnabled(false)
            }}
            className="bg-card border-border text-foreground"
          />
        </div>
      </div>

      {dueDate && (
        <div className="rounded-xl border border-border bg-card p-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="payment_reminder_enabled"
              checked={paymentReminderEnabled}
              onChange={(event) => setPaymentReminderEnabled(event.target.checked)}
              className="mt-1 size-4 rounded border-border bg-card accent-primary"
            />
            <span>
              <span className="block text-sm font-medium text-foreground">Activar recordatorio de pago</span>
              <span className="block text-sm text-muted-foreground">Se enviará automáticamente al cliente antes del vencimiento.</span>
            </span>
          </label>

          {paymentReminderEnabled && (
            <div className="mt-4 grid gap-2 sm:max-w-xs">
              <Label htmlFor="payment_reminder_days_before" className="text-foreground">Enviar recordatorio</Label>
              <Select
                name="payment_reminder_days_before"
                value={paymentReminderDaysBefore}
                onValueChange={(value) => value && setPaymentReminderDaysBefore(value)}
              >
                <SelectTrigger className="w-full bg-card border-border text-foreground">
                  <span className="truncate text-left">{getReminderLabel(Number(paymentReminderDaysBefore))}</span>
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {reminderDayOptions.map((days) => (
                    <SelectItem key={days} value={String(days)} className="text-foreground focus:bg-muted">
                      {getReminderLabel(days)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-4">
          <p className="text-sm font-semibold text-foreground">Notificaciones al cliente</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Controla si esta orden puede mandar avisos automáticos o manuales al cliente.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex min-h-11 items-start gap-3 rounded-lg border border-border bg-secondary p-3">
            <input
              type="checkbox"
              name="notify_email_enabled"
              checked={notifyEmailEnabled}
              onChange={(event) => setNotifyEmailEnabled(event.target.checked)}
              className="mt-1 size-4 rounded border-border bg-card accent-primary"
            />
            <span>
              <span className="block text-sm font-medium text-foreground">Correo</span>
              <span className="block text-xs text-muted-foreground">Recibos y recordatorios si el cliente tiene correo.</span>
            </span>
          </label>
          <label className="flex min-h-11 items-start gap-3 rounded-lg border border-border bg-secondary p-3">
            <input
              type="checkbox"
              name="notify_whatsapp_enabled"
              checked={notifyWhatsappEnabled}
              onChange={(event) => setNotifyWhatsappEnabled(event.target.checked)}
              className="mt-1 size-4 rounded border-border bg-card accent-primary"
            />
            <span>
              <span className="block text-sm font-medium text-foreground">WhatsApp</span>
              <span className="block text-xs text-muted-foreground">Recibos, recordatorios y datos bancarios si hay teléfono.</span>
            </span>
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bank_account_id" className="text-foreground">Datos bancarios para esta orden</Label>
        <Select name="bank_account_id" value={selectedBankAccountId} onValueChange={(value) => value && setSelectedBankAccountId(value)}>
          <SelectTrigger className="w-full bg-card border-border text-foreground">
            <span className="truncate text-left">
              {selectedBankAccount ? `${selectedBankAccount.alias} — ${selectedBankAccount.bank_name}` : 'Sin datos bancarios visibles'}
            </span>
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="none" className="text-foreground focus:bg-muted">
              Sin datos bancarios visibles
            </SelectItem>
            {bankAccounts.map((account) => (
              <SelectItem key={account.id} value={account.id} className="text-foreground focus:bg-muted">
                {account.alias} — {account.bank_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <input type="hidden" name="public_sort_order" value={defaultValues?.public_sort_order ?? 100} />

      <div className="grid gap-4 rounded-xl border border-border bg-card p-4">
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="fiscal_document_id" className="text-foreground">Constancia fiscal visible</Label>
            <Select
              name="fiscal_document_id"
              value={selectedFiscalDocumentId}
              onValueChange={(value) => {
                const nextValue = value || 'none'
                setSelectedFiscalDocumentId(nextValue)
                if (nextValue === 'none') setShowFiscalDocument(false)
              }}
            >
              <SelectTrigger className="w-full bg-card border-border text-foreground">
                <span className="truncate text-left">
                  {selectedFiscalDocument ? selectedFiscalDocument.title : 'No mostrar constancia'}
                </span>
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="none" className="text-foreground focus:bg-muted">
                  No mostrar constancia
                </SelectItem>
                {fiscalDocuments.map((document) => (
                  <SelectItem key={document.id} value={document.id} className="text-foreground focus:bg-muted">
                    {document.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="public_show_fiscal_document"
            checked={showFiscalDocument}
            disabled={selectedFiscalDocumentId === 'none'}
            onChange={(event) => setShowFiscalDocument(event.target.checked)}
            className="mt-1 size-4 rounded border-border bg-card accent-primary disabled:opacity-50"
          />
          <span>
            <span className="block text-sm font-medium text-foreground">Mostrar link de constancia en el portal del cliente</span>
            <span className="block text-sm text-muted-foreground">La constancia se verá en el link general y en el link individual de esta orden.</span>
          </span>
        </label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="concept" className="text-foreground">Concepto *</Label>
        <Input
          id="concept"
          name="concept"
          placeholder="Proyecto web, mensualidad enero..."
          required
          defaultValue={defaultValues?.concept ?? ''}
          className="bg-card border-border text-foreground"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
        <div className="space-y-2">
          <Label htmlFor="category" className="text-foreground">Categoría</Label>
          <Select name="category" value={category} onValueChange={(value) => value && setCategory(value as OrderCategory)}>
            <SelectTrigger className="w-full bg-card border-border text-foreground">
              <span className="truncate text-left">{selectedCategoryLabel}</span>
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {orderCategories.map((item) => (
                <SelectItem key={item.value} value={item.value} className="text-foreground focus:bg-muted">
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tags" className="text-foreground">Tags</Label>
          <input type="hidden" name="tags" value={tags.join(',')} />
          <TagInput
            tags={tags}
            value={tagInput}
            onValueChange={setTagInput}
            onAdd={addTag}
            onRemove={removeTag}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount" className="text-foreground">
          {requiresInvoice && taxMode === 'added' ? 'Subtotal antes de IVA (MXN) *' : 'Monto total (MXN) *'}
        </Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          required
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="bg-card border-border text-foreground tabular-nums"
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="requires_invoice"
            checked={requiresInvoice}
            onChange={(event) => setRequiresInvoice(event.target.checked)}
            className="mt-1 size-4 rounded border-border bg-card accent-primary"
          />
          <span>
            <span className="block text-sm font-medium text-foreground">Requiere factura</span>
          </span>
        </label>

        {requiresInvoice && (
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
              <input
                type="radio"
                name="tax_mode"
                value="included"
                checked={taxMode === 'included'}
                onChange={() => setTaxMode('included')}
                className="mt-1 size-4 accent-primary"
              />
              <span>
                <span className="block text-sm font-medium text-foreground">Precio incluye IVA</span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
              <input
                type="radio"
                name="tax_mode"
                value="added"
                checked={taxMode === 'added'}
                onChange={() => setTaxMode('added')}
                className="mt-1 size-4 accent-primary"
              />
              <span>
                <span className="block text-sm font-medium text-foreground">Agregar IVA</span>
              </span>
            </label>
          </div>
        )}

        {taxPreview && (
          <div className="grid grid-cols-3 gap-3 border-t border-border pt-4 text-sm">
            <PreviewAmount label="Subtotal" value={taxPreview.subtotal} />
            <PreviewAmount label="IVA" value={taxPreview.tax} />
            <PreviewAmount label="Total" value={taxPreview.total} highlight />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-foreground">Descripción</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Detalles adicionales sobre la orden..."
          rows={3}
          defaultValue={defaultValues?.description ?? ''}
          className="bg-card border-border text-foreground resize-none"
        />
      </div>

      {defaultValues && (
        <div className="space-y-2">
          <Label htmlFor="status" className="text-foreground">Estatus operativo</Label>
          <Select name="status" value={editableStatus} onValueChange={(value) => value && setEditableStatus(value)}>
            <SelectTrigger className="w-full bg-card border-border text-foreground">
              <span className="truncate text-left">{statusLabels[editableStatus] ?? 'Automático por pagos'}</span>
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="auto" className="text-foreground focus:bg-muted">Automático por pagos</SelectItem>
              <SelectItem value="paused" className="text-foreground focus:bg-muted">Pausado</SelectItem>
              <SelectItem value="disputed" className="text-foreground focus:bg-muted">En disputa</SelectItem>
              <SelectItem value="cancelled" className="text-foreground focus:bg-muted">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {state?.error && (
        <p role="alert" className="text-destructive text-sm">{state.error}</p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="w-full justify-center bg-primary text-primary-foreground font-semibold shadow-none hover:bg-primary/90 sm:w-auto"
      >
        {pending ? 'Guardando...' : submitLabel}
      </Button>
    </form>
  )

  function addTag(rawValue: string) {
    const nextTags = rawValue
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)

    if (!nextTags.length) return

    setTags((current) => {
      const unique = new Set(current)
      for (const tag of nextTags) {
        if (unique.size >= 12) break
        unique.add(tag)
      }
      return Array.from(unique)
    })
    setTagInput('')
  }

  function removeTag(tag: string) {
    setTags((current) => current.filter((item) => item !== tag))
  }
}

function getInitialAmount(order?: Order) {
  if (!order) return ''

  const amount = order.requires_invoice && order.tax_mode === 'added'
    ? order.subtotal_amount
    : order.total_amount

  return Number.isFinite(amount) ? String(amount) : ''
}

function getEditableStatus(status: OrderStatus) {
  return ['cancelled', 'paused', 'disputed'].includes(status) ? status : 'auto'
}

const orderCategories: { value: OrderCategory; label: string }[] = [
  { value: 'service', label: 'Servicio' },
  { value: 'product', label: 'Producto' },
  { value: 'project', label: 'Proyecto' },
  { value: 'subscription', label: 'Mensualidad' },
  { value: 'other', label: 'Otro' },
]

const statusLabels: Record<string, string> = {
  auto: 'Automático por pagos',
  paused: 'Pausado',
  disputed: 'En disputa',
  cancelled: 'Cancelado',
}

const reminderDayOptions = [0, 1, 2, 3, 5, 7, 14, 30]

function getReminderLabel(days: number) {
  if (days === 0) return 'El día del vencimiento'
  if (days === 1) return '1 día antes'
  return `${days} días antes`
}

function TagInput({
  tags,
  value,
  onValueChange,
  onAdd,
  onRemove,
}: {
  tags: string[]
  value: string
  onValueChange: (value: string) => void
  onAdd: (value: string) => void
  onRemove: (tag: string) => void
}) {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === 'Tab' || event.key === ',') {
      if (value.trim()) {
        event.preventDefault()
        onAdd(value)
      }
    }

    if (event.key === 'Backspace' && !value && tags.length) {
      event.preventDefault()
      onRemove(tags[tags.length - 1])
    }
  }

  return (
    <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 focus-within:border-primary focus-within:ring-3 focus-within:ring-ring/15">
      {tags.map((tag) => (
        <span key={tag} className="inline-flex min-h-7 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          {tag}
          <button
            type="button"
            onClick={() => onRemove(tag)}
            className="rounded-full text-primary/70 hover:text-destructive"
            aria-label={`Quitar tag ${tag}`}
          >
            x
          </button>
        </span>
      ))}
      <input
        id="tags"
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value
          if (nextValue.includes(',')) {
            onAdd(nextValue)
          } else {
            onValueChange(nextValue)
          }
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (value.trim()) onAdd(value)
        }}
        placeholder={tags.length ? 'Agregar tag...' : 'urgente, factura, mantenimiento'}
        className="min-h-7 min-w-[160px] flex-1 border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
    </div>
  )
}

function PreviewAmount({
  label,
  value,
  highlight,
}: {
  label: string
  value: number
  highlight?: boolean
}) {
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`tabular-nums font-semibold ${highlight ? 'text-emerald-700' : 'text-foreground'}`}>
        {new Intl.NumberFormat('es-MX', {
          style: 'currency',
          currency: 'MXN',
        }).format(value)}
      </p>
    </div>
  )
}
