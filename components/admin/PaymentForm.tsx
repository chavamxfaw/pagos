'use client'

import { useActionState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type State = { error?: string; success?: boolean } | null

export function PaymentForm({
  action,
  orderId,
  onSuccess,
}: {
  action: (prevState: State, formData: FormData) => Promise<State>
  orderId: string
  onSuccess?: () => void
}) {
  const [state, formAction, pending] = useActionState(action, null)
  const formRef = useRef<HTMLFormElement>(null)

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
        <Label htmlFor="amount" className="text-zinc-300">Monto del abono (MXN) *</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          required
          className="bg-zinc-950 border-zinc-800 text-zinc-50 font-mono text-lg"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="concept" className="text-zinc-300">Concepto *</Label>
        <Input
          id="concept"
          name="concept"
          placeholder="Ej: Primer abono, Pago quincenal..."
          required
          className="bg-zinc-950 border-zinc-800 text-zinc-50"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes" className="text-zinc-300">Notas</Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="Transferencia, efectivo, referencia..."
          rows={2}
          className="bg-zinc-950 border-zinc-800 text-zinc-50 resize-none"
        />
      </div>

      {state?.error && (
        <p className="text-red-400 text-sm">{state.error}</p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
      >
        {pending ? 'Registrando...' : 'Registrar abono'}
      </Button>
    </form>
  )
}
