'use client'

import { useActionState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getTodayDateString } from '@/lib/utils'
import type { Payment } from '@/types'

type State = { error?: string; success?: boolean } | null
const paymentMethodLabels = { transfer: 'Transferencia', cash: 'Efectivo', card: 'Tarjeta', check: 'Cheque', other: 'Otro' }

export function PaymentForm({
  action,
  orderId,
  onSuccess,
  defaultValues,
  submitLabel = 'Registrar abono',
}: {
  action: (prevState: State, formData: FormData) => Promise<State>
  orderId: string
  onSuccess?: () => void
  defaultValues?: Payment
  submitLabel?: string
}) {
  const [state, formAction, pending] = useActionState(action, null)
  const formRef = useRef<HTMLFormElement>(null)
  const today = getTodayDateString()

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset()
      onSuccess?.()
    }
  }, [state, onSuccess])

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="order_id" value={orderId} />

      <div className="space-y-2">
        <Label htmlFor="paid_at" className="text-foreground">Fecha del abono *</Label>
        <Input
          id="paid_at"
          name="paid_at"
          type="date"
          max={today}
          required
          defaultValue={defaultValues?.paid_at ?? today}
          className="bg-card border-border text-foreground"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount" className="text-foreground">Monto del abono (MXN) *</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          required
          defaultValue={defaultValues?.amount ?? ''}
          className="bg-card border-border text-foreground tabular-nums text-lg"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="concept" className="text-foreground">Concepto *</Label>
        <Input
          id="concept"
          name="concept"
          placeholder="Primer abono, pago quincenal..."
          required
          defaultValue={defaultValues?.concept ?? ''}
          className="bg-card border-border text-foreground"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="payment_method" className="text-foreground">Método de pago *</Label>
          <Select name="payment_method" defaultValue={defaultValues?.payment_method ?? 'transfer'} items={Object.entries(paymentMethodLabels).map(([value, label]) => ({ value, label }))} required>
            <SelectTrigger id="payment_method" className="w-full bg-card border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {Object.entries(paymentMethodLabels).map(([value, label]) => <SelectItem key={value} value={value} className="text-foreground focus:bg-muted">{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment_reference" className="text-foreground">Referencia</Label>
          <Input
            id="payment_reference"
            name="payment_reference"
            placeholder="Folio, banco, últimos 4..."
            defaultValue={defaultValues?.payment_reference ?? ''}
            className="bg-card border-border text-foreground"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes" className="text-foreground">Notas</Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="Transferencia, efectivo, referencia..."
          rows={2}
          defaultValue={defaultValues?.notes ?? ''}
          className="bg-card border-border text-foreground resize-none"
        />
      </div>

      {state?.error && (
        <p role="alert" className="text-destructive text-sm">{state.error}</p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="w-full bg-primary text-primary-foreground font-semibold shadow-none hover:bg-primary/90"
      >
        {pending ? 'Guardando...' : submitLabel}
      </Button>
    </form>
  )
}
