'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { CreditCard } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency } from '@/lib/utils'

export function StripePaymentRequestDialog({
  orderId,
  pendingAmount,
  action,
}: {
  orderId: string
  pendingAmount: number
  action: (formData: FormData) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [requestType, setRequestType] = useState<'fixed' | 'open'>('fixed')
  const [pending, startTransition] = useTransition()

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await action(formData)
        toast.success('Solicitud de pago Stripe creada')
        setOpen(false)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo crear la solicitud')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-center border-[#D8DEE8] text-xs text-[#1A1F36] hover:bg-[#E6EAF0] sm:w-auto"
          >
            <CreditCard className="mr-2 size-4" />
            Solicitar pago Stripe
          </Button>
        }
      />
      <DialogContent className="bg-white border-[#E6EAF0] text-[#1A1F36] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#1A1F36]">Crear solicitud Stripe</DialogTitle>
        </DialogHeader>

        <form action={onSubmit} className="space-y-4">
          <input type="hidden" name="order_id" value={orderId} />
          <input type="hidden" name="request_type" value={requestType} />

          <div className="rounded-xl border border-[#E6EAF0] bg-[#F8FAFF] p-3 text-sm text-[#6B7280]">
            Saldo disponible para solicitar: <span className="font-mono font-semibold text-[#1A1F36]">{formatCurrency(pendingAmount)}</span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-start gap-3 rounded-lg border border-[#E6EAF0] bg-white p-3">
              <input
                type="radio"
                checked={requestType === 'fixed'}
                onChange={() => setRequestType('fixed')}
                className="mt-1 size-4 accent-[#6C5CE7]"
              />
              <span>
                <span className="block text-sm font-medium text-[#1A1F36]">Monto fijo</span>
                <span className="block text-xs text-[#6B7280]">El cliente paga exactamente este monto.</span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-lg border border-[#E6EAF0] bg-white p-3">
              <input
                type="radio"
                checked={requestType === 'open'}
                onChange={() => setRequestType('open')}
                className="mt-1 size-4 accent-[#6C5CE7]"
              />
              <span>
                <span className="block text-sm font-medium text-[#1A1F36]">Monto abierto</span>
                <span className="block text-xs text-[#6B7280]">El cliente decide cuánto abonar.</span>
              </span>
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stripe_request_amount" className="text-[#1A1F36]">
              {requestType === 'fixed' ? 'Monto a solicitar *' : 'Abono mínimo'}
            </Label>
            <Input
              id="stripe_request_amount"
              name={requestType === 'fixed' ? 'amount' : 'minimum_amount'}
              type="number"
              step="0.01"
              min={requestType === 'fixed' ? '0.01' : '1'}
              max={pendingAmount}
              required={requestType === 'fixed'}
              placeholder="0.00"
              className="bg-white border-[#E6EAF0] text-[#1A1F36] font-mono text-lg"
            />
            {requestType === 'open' && (
              <p className="text-xs text-[#6B7280]">
                Si lo dejas vacío se usará el mínimo global de Stripe. El máximo siempre será el saldo pendiente.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="stripe_request_concept" className="text-[#1A1F36]">Concepto</Label>
            <Input
              id="stripe_request_concept"
              name="concept"
              placeholder="Ej: Anticipo, segunda parcialidad..."
              className="bg-white border-[#E6EAF0] text-[#1A1F36]"
            />
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-[#E6EAF0] bg-white p-3">
            <input
              type="checkbox"
              name="requires_invoice"
              className="mt-1 size-4 rounded border-[#D8DEE8] accent-[#6C5CE7]"
            />
            <span>
              <span className="block text-sm font-medium text-[#1A1F36]">Este pago requiere factura</span>
              <span className="block text-xs text-[#6B7280]">Queda marcado en la solicitud para referencia operativa.</span>
            </span>
          </label>

          <div className="space-y-2">
            <Label htmlFor="stripe_request_tax_mode" className="text-[#1A1F36]">IVA de esta solicitud</Label>
            <select
              id="stripe_request_tax_mode"
              name="tax_mode"
              defaultValue="included"
              className="min-h-11 w-full rounded-lg border border-[#D8DEE8] bg-white px-3 text-sm text-[#1A1F36]"
            >
              <option value="included">IVA incluido</option>
              <option value="added">IVA agregado</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stripe_request_notes" className="text-[#1A1F36]">Notas</Label>
            <Textarea
              id="stripe_request_notes"
              name="notes"
              rows={2}
              placeholder="Acuerdo con cliente, referencia interna..."
              className="bg-white border-[#E6EAF0] text-[#1A1F36] resize-none"
            />
          </div>

          <Button
            type="submit"
            disabled={pending}
            className="w-full bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] text-white font-semibold shadow-sm hover:brightness-105"
          >
            {pending ? 'Creando...' : 'Crear solicitud'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
