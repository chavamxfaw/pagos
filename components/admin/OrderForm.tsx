'use client'

import { KeyboardEvent, useActionState, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { getTodayDateString } from '@/lib/utils'
import type { BankAccount, Client, Order, OrderCategory, OrderStatus } from '@/types'

type State = { error?: string } | null

export function OrderForm({
  action,
  clients,
  bankAccounts = [],
  defaultClientId,
  defaultValues,
  submitLabel = 'Crear orden',
}: {
  action: (prevState: State, formData: FormData) => Promise<State>
  clients: Client[]
  bankAccounts?: BankAccount[]
  defaultClientId?: string
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
  const [selectedBankAccountId, setSelectedBankAccountId] = useState(defaultValues?.bank_account_id ?? 'none')
  const [category, setCategory] = useState<OrderCategory>(defaultValues?.category ?? 'service')
  const [editableStatus, setEditableStatus] = useState(defaultValues ? getEditableStatus(defaultValues.status) : 'auto')
  const [tags, setTags] = useState<string[]>(defaultValues?.tags ?? [])
  const [tagInput, setTagInput] = useState('')
  const selectedClient = clients.find((client) => client.id === selectedClientId)
  const selectedBankAccount = bankAccounts.find((account) => account.id === selectedBankAccountId)
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
        <Label htmlFor="client_id" className="text-[#1A1F36]">Cliente *</Label>
        <Select name="client_id" value={selectedClientId} onValueChange={(value) => value && setSelectedClientId(value)} required>
          <SelectTrigger className="w-full bg-white border-[#E6EAF0] text-[#1A1F36]">
            <span className="truncate text-left">
              {selectedClient
                ? `${selectedClient.name}${selectedClient.email ? ` — ${selectedClient.email}` : ' — Sin correo'}`
                : 'Selecciona un cliente...'}
            </span>
          </SelectTrigger>
          <SelectContent className="bg-white border-[#E6EAF0]">
            {clients.map((client) => (
          <SelectItem key={client.id} value={client.id} className="text-[#1A1F36] focus:bg-[#E6EAF0]">
                {client.name}{client.email ? ` — ${client.email}` : ' — Sin correo'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="issued_at" className="text-[#1A1F36]">Fecha de emisión</Label>
          <Input
            id="issued_at"
            name="issued_at"
            type="date"
            defaultValue={defaultValues?.issued_at ?? today}
            className="bg-white border-[#E6EAF0] text-[#1A1F36]"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="due_date" className="text-[#1A1F36]">Fecha límite de pago</Label>
          <Input
            id="due_date"
            name="due_date"
            type="date"
            defaultValue={defaultValues?.due_date ?? ''}
            className="bg-white border-[#E6EAF0] text-[#1A1F36]"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bank_account_id" className="text-[#1A1F36]">Datos bancarios para esta orden</Label>
        <Select name="bank_account_id" value={selectedBankAccountId} onValueChange={(value) => value && setSelectedBankAccountId(value)}>
          <SelectTrigger className="w-full bg-white border-[#E6EAF0] text-[#1A1F36]">
            <span className="truncate text-left">
              {selectedBankAccount ? `${selectedBankAccount.alias} — ${selectedBankAccount.bank_name}` : 'Sin datos bancarios visibles'}
            </span>
          </SelectTrigger>
          <SelectContent className="bg-white border-[#E6EAF0]">
            <SelectItem value="none" className="text-[#1A1F36] focus:bg-[#E6EAF0]">
              Sin datos bancarios visibles
            </SelectItem>
            {bankAccounts.map((account) => (
              <SelectItem key={account.id} value={account.id} className="text-[#1A1F36] focus:bg-[#E6EAF0]">
                {account.alias} — {account.bank_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="concept" className="text-[#1A1F36]">Concepto *</Label>
        <Input
          id="concept"
          name="concept"
          placeholder="Proyecto web, mensualidad enero..."
          required
          defaultValue={defaultValues?.concept ?? ''}
          className="bg-white border-[#E6EAF0] text-[#1A1F36]"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
        <div className="space-y-2">
          <Label htmlFor="category" className="text-[#1A1F36]">Categoría</Label>
          <Select name="category" value={category} onValueChange={(value) => value && setCategory(value as OrderCategory)}>
            <SelectTrigger className="w-full bg-white border-[#E6EAF0] text-[#1A1F36]">
              <span className="truncate text-left">{selectedCategoryLabel}</span>
            </SelectTrigger>
            <SelectContent className="bg-white border-[#E6EAF0]">
              {orderCategories.map((item) => (
                <SelectItem key={item.value} value={item.value} className="text-[#1A1F36] focus:bg-[#E6EAF0]">
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tags" className="text-[#1A1F36]">Tags</Label>
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
        <Label htmlFor="amount" className="text-[#1A1F36]">
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
          className="bg-white border-[#E6EAF0] text-[#1A1F36] font-mono"
        />
      </div>

      <div className="rounded-xl border border-[#E6EAF0] bg-white p-4 space-y-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="requires_invoice"
            checked={requiresInvoice}
            onChange={(event) => setRequiresInvoice(event.target.checked)}
            className="mt-1 size-4 rounded border-[#D8DEE8] bg-white accent-[#6C5CE7]"
          />
          <span>
            <span className="block text-sm font-medium text-[#1A1F36]">Requiere factura</span>
          </span>
        </label>

        {requiresInvoice && (
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-start gap-3 rounded-lg border border-[#E6EAF0] bg-white p-3">
              <input
                type="radio"
                name="tax_mode"
                value="included"
                checked={taxMode === 'included'}
                onChange={() => setTaxMode('included')}
                className="mt-1 size-4 accent-[#6C5CE7]"
              />
              <span>
                <span className="block text-sm font-medium text-[#1A1F36]">Precio incluye IVA</span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-lg border border-[#E6EAF0] bg-white p-3">
              <input
                type="radio"
                name="tax_mode"
                value="added"
                checked={taxMode === 'added'}
                onChange={() => setTaxMode('added')}
                className="mt-1 size-4 accent-[#6C5CE7]"
              />
              <span>
                <span className="block text-sm font-medium text-[#1A1F36]">Agregar IVA</span>
              </span>
            </label>
          </div>
        )}

        {taxPreview && (
          <div className="grid grid-cols-3 gap-3 border-t border-[#E6EAF0] pt-4 text-sm">
            <PreviewAmount label="Subtotal" value={taxPreview.subtotal} />
            <PreviewAmount label="IVA" value={taxPreview.tax} />
            <PreviewAmount label="Total" value={taxPreview.total} highlight />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-[#1A1F36]">Descripción</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Detalles adicionales sobre la orden..."
          rows={3}
          defaultValue={defaultValues?.description ?? ''}
          className="bg-white border-[#E6EAF0] text-[#1A1F36] resize-none"
        />
      </div>

      {defaultValues && (
        <div className="space-y-2">
          <Label htmlFor="status" className="text-[#1A1F36]">Estatus operativo</Label>
          <Select name="status" value={editableStatus} onValueChange={(value) => value && setEditableStatus(value)}>
            <SelectTrigger className="w-full bg-white border-[#E6EAF0] text-[#1A1F36]">
              <span className="truncate text-left">{statusLabels[editableStatus] ?? 'Automático por pagos'}</span>
            </SelectTrigger>
            <SelectContent className="bg-white border-[#E6EAF0]">
              <SelectItem value="auto" className="text-[#1A1F36] focus:bg-[#E6EAF0]">Automático por pagos</SelectItem>
              <SelectItem value="paused" className="text-[#1A1F36] focus:bg-[#E6EAF0]">Pausado</SelectItem>
              <SelectItem value="disputed" className="text-[#1A1F36] focus:bg-[#E6EAF0]">En disputa</SelectItem>
              <SelectItem value="cancelled" className="text-[#1A1F36] focus:bg-[#E6EAF0]">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {state?.error && (
        <p className="text-[#EF4444] text-sm">{state.error}</p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="w-full justify-center bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] text-white font-semibold shadow-sm hover:brightness-105 sm:w-auto"
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
    <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-lg border border-[#E6EAF0] bg-white px-3 py-2 focus-within:border-[#6C5CE7] focus-within:ring-3 focus-within:ring-[#6C5CE7]/15">
      {tags.map((tag) => (
        <span key={tag} className="inline-flex min-h-7 items-center gap-1.5 rounded-full bg-[#6C5CE7]/10 px-2.5 py-1 text-xs font-semibold text-[#6C5CE7]">
          {tag}
          <button
            type="button"
            onClick={() => onRemove(tag)}
            className="rounded-full text-[#6C5CE7]/70 hover:text-[#EF4444]"
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
        className="min-h-7 min-w-[160px] flex-1 border-0 bg-transparent text-sm text-[#1A1F36] outline-none placeholder:text-[#8A94A6]"
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
      <p className="mb-1 text-xs uppercase tracking-wider text-[#6B7280]">{label}</p>
      <p className={`font-mono font-semibold ${highlight ? 'text-[#2ED39A]' : 'text-[#1A1F36]'}`}>
        {new Intl.NumberFormat('es-MX', {
          style: 'currency',
          currency: 'MXN',
        }).format(value)}
      </p>
    </div>
  )
}
