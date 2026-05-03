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
        <Label htmlFor="paid_at" className="text-[#1A1F36]">Fecha del abono *</Label>
        <Input
          id="paid_at"
          name="paid_at"
          type="date"
          max={today}
          required
          defaultValue={defaultValues?.paid_at ?? today}
          className="bg-white border-[#E6EAF0] text-[#1A1F36]"
        />
        <p className="text-xs text-[#6B7280]">Puedes registrar pagos de hoy o de fechas anteriores.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount" className="text-[#1A1F36]">Monto del abono (MXN) *</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          required
          defaultValue={defaultValues?.amount ?? ''}
          className="bg-white border-[#E6EAF0] text-[#1A1F36] font-mono text-lg"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="concept" className="text-[#1A1F36]">Concepto *</Label>
        <Input
          id="concept"
          name="concept"
          placeholder="Ej: Primer abono, Pago quincenal..."
          required
          defaultValue={defaultValues?.concept ?? ''}
          className="bg-white border-[#E6EAF0] text-[#1A1F36]"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="payment_method" className="text-[#1A1F36]">Método de pago *</Label>
          <Select name="payment_method" defaultValue={defaultValues?.payment_method ?? 'transfer'} required>
            <SelectTrigger className="w-full bg-white border-[#E6EAF0] text-[#1A1F36]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-[#E6EAF0]">
              <SelectItem value="transfer" className="text-[#1A1F36] focus:bg-[#E6EAF0]">Transferencia</SelectItem>
              <SelectItem value="cash" className="text-[#1A1F36] focus:bg-[#E6EAF0]">Efectivo</SelectItem>
              <SelectItem value="card" className="text-[#1A1F36] focus:bg-[#E6EAF0]">Tarjeta</SelectItem>
              <SelectItem value="check" className="text-[#1A1F36] focus:bg-[#E6EAF0]">Cheque</SelectItem>
              <SelectItem value="other" className="text-[#1A1F36] focus:bg-[#E6EAF0]">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment_reference" className="text-[#1A1F36]">Referencia</Label>
          <Input
            id="payment_reference"
            name="payment_reference"
            placeholder="Folio, banco, últimos 4..."
            defaultValue={defaultValues?.payment_reference ?? ''}
            className="bg-white border-[#E6EAF0] text-[#1A1F36]"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes" className="text-[#1A1F36]">Notas</Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="Transferencia, efectivo, referencia..."
          rows={2}
          defaultValue={defaultValues?.notes ?? ''}
          className="bg-white border-[#E6EAF0] text-[#1A1F36] resize-none"
        />
      </div>

      {state?.error && (
        <p className="text-[#EF4444] text-sm">{state.error}</p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="w-full bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] text-white font-semibold shadow-sm hover:brightness-105"
      >
        {pending ? 'Guardando...' : submitLabel}
      </Button>
    </form>
  )
}
