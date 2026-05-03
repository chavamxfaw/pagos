'use client'

import { useActionState, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Client } from '@/types'

type State = { error?: string } | null

export function OrderForm({
  action,
  clients,
  defaultClientId,
}: {
  action: (prevState: State, formData: FormData) => Promise<State>
  clients: Client[]
  defaultClientId?: string
}) {
  const [state, formAction, pending] = useActionState(action, null)
  const [amount, setAmount] = useState('')
  const [requiresInvoice, setRequiresInvoice] = useState(false)
  const [taxMode, setTaxMode] = useState<'included' | 'added'>('included')

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
        <Label htmlFor="client_id" className="text-zinc-300">Cliente *</Label>
        <Select name="client_id" defaultValue={defaultClientId} required>
          <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-50">
            <SelectValue placeholder="Selecciona un cliente..." />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id} className="text-zinc-200 focus:bg-zinc-800">
                {client.name} — {client.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="concept" className="text-zinc-300">Concepto *</Label>
        <Input
          id="concept"
          name="concept"
          placeholder="Ej: Proyecto web, Mensualidad enero..."
          required
          className="bg-zinc-900 border-zinc-800 text-zinc-50"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount" className="text-zinc-300">
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
          className="bg-zinc-900 border-zinc-800 text-zinc-50 font-mono"
        />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="requires_invoice"
            checked={requiresInvoice}
            onChange={(event) => setRequiresInvoice(event.target.checked)}
            className="mt-1 size-4 rounded border-zinc-700 bg-zinc-900 accent-emerald-500"
          />
          <span>
            <span className="block text-sm font-medium text-zinc-200">Requiere factura</span>
            <span className="block text-sm text-zinc-500">
              Si se activa, la orden guarda subtotal, IVA 16% y total.
            </span>
          </span>
        </label>

        {requiresInvoice && (
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
              <input
                type="radio"
                name="tax_mode"
                value="included"
                checked={taxMode === 'included'}
                onChange={() => setTaxMode('included')}
                className="mt-1 size-4 accent-emerald-500"
              />
              <span>
                <span className="block text-sm font-medium text-zinc-200">Precio incluye IVA</span>
                <span className="block text-xs text-zinc-500">El monto capturado ya es el total facturado.</span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
              <input
                type="radio"
                name="tax_mode"
                value="added"
                checked={taxMode === 'added'}
                onChange={() => setTaxMode('added')}
                className="mt-1 size-4 accent-emerald-500"
              />
              <span>
                <span className="block text-sm font-medium text-zinc-200">Agregar IVA</span>
                <span className="block text-xs text-zinc-500">El monto capturado es subtotal y se suma IVA.</span>
              </span>
            </label>
          </div>
        )}

        {taxPreview && (
          <div className="grid grid-cols-3 gap-3 border-t border-zinc-800 pt-4 text-sm">
            <PreviewAmount label="Subtotal" value={taxPreview.subtotal} />
            <PreviewAmount label="IVA" value={taxPreview.tax} />
            <PreviewAmount label="Total" value={taxPreview.total} highlight />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-zinc-300">Descripción</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Detalles adicionales sobre la orden..."
          rows={3}
          className="bg-zinc-900 border-zinc-800 text-zinc-50 resize-none"
        />
      </div>

      {state?.error && (
        <p className="text-red-400 text-sm">{state.error}</p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
      >
        {pending ? 'Creando...' : 'Crear orden'}
      </Button>
    </form>
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
      <p className="mb-1 text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <p className={`font-mono font-semibold ${highlight ? 'text-emerald-400' : 'text-zinc-200'}`}>
        {new Intl.NumberFormat('es-MX', {
          style: 'currency',
          currency: 'MXN',
        }).format(value)}
      </p>
    </div>
  )
}
