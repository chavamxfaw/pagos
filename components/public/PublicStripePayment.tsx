'use client'

import { useState } from 'react'
import { CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { calculateStripeChargeAmount } from '@/lib/stripe/math'
import { formatCurrency } from '@/lib/utils'
import type { StripePaymentRequest, StripeSettings } from '@/types'

export function PublicStripePayment({
  orderId,
  token,
  pendingAmount,
  request,
  settings,
}: {
  orderId: string
  token: string
  pendingAmount: number
  request: StripePaymentRequest
  settings: Pick<StripeSettings, 'commission_payer' | 'fee_percent' | 'fixed_fee_amount' | 'fee_tax_percent' | 'minimum_payment_amount'>
}) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [customAmount, setCustomAmount] = useState('')
  const isOpenRequest = request.request_type === 'open'
  const minimumAmount = Math.min(
    pendingAmount,
    Math.max(1, request.minimum_amount ?? settings.minimum_payment_amount)
  )
  const parsedCustomAmount = Number.parseFloat(customAmount)
  const paymentAmount = isOpenRequest ? parsedCustomAmount : Math.min(request.amount ?? 0, pendingAmount)
  const openCharge = Number.isFinite(paymentAmount) && paymentAmount > 0
    ? calculateStripeChargeAmount(paymentAmount, settings)
    : null
  const previewFee = isOpenRequest ? openCharge?.feeAmount ?? 0 : request.fee_amount
  const previewTotal = isOpenRequest ? openCharge?.totalCharged ?? 0 : request.total_charged

  async function startCheckout() {
    setError(null)

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      setError('Ingresa un monto válido.')
      return
    }

    if (isOpenRequest && paymentAmount < minimumAmount) {
      setError(`El abono mínimo es ${formatCurrency(minimumAmount)}.`)
      return
    }

    if (paymentAmount > pendingAmount) {
      setError('El monto no puede ser mayor al saldo pendiente.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          token,
          amount: isOpenRequest ? paymentAmount : undefined,
          paymentRequestId: request.id,
        }),
      })
      const data = await response.json()

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? 'No se pudo iniciar el pago.')
      }

      window.location.assign(data.url)
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'No se pudo iniciar el pago.')
      setLoading(false)
    }
  }

  return (
    <section className="rounded-xl border border-border bg-white p-4">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-secondary text-primary">
          <CreditCard className="size-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Pago con tarjeta</p>
          <h2 className="text-sm font-semibold text-foreground">
            {request.concept}
          </h2>
        </div>
      </div>

      {!isOpenRequest ? (
        <div className="mb-4 rounded-xl border border-border bg-muted/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Monto solicitado</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-foreground">{formatCurrency(paymentAmount)}</p>
          {request.requires_invoice && (
            <p className="mt-1 text-xs text-muted-foreground">
              Factura: {request.tax_mode === 'added' ? 'IVA agregado' : 'IVA incluido'}
            </p>
          )}
        </div>
      ) : (
        <div className="mb-4 space-y-2">
          <label htmlFor={`stripe_amount_${orderId}`} className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Monto a abonar
          </label>
          <input
            id={`stripe_amount_${orderId}`}
            type="number"
            min={minimumAmount}
            max={pendingAmount}
            step="0.01"
            inputMode="decimal"
            value={customAmount}
            onChange={(event) => setCustomAmount(event.target.value)}
            placeholder={formatCurrency(minimumAmount)}
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 font-mono text-lg font-semibold text-foreground outline-none transition-colors focus:border-[#6C5CE7] focus:ring-2 focus:ring-primary/5"
          />
          <p className="text-xs text-muted-foreground">
            Mínimo {formatCurrency(minimumAmount)} · Máximo {formatCurrency(pendingAmount)}
          </p>
        </div>
      )}

      {isOpenRequest && Number.isFinite(paymentAmount) && paymentAmount > 0 && (
        <div className="mb-4 rounded-xl border border-border bg-muted/40 p-3 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Abono</span>
            <span className="font-mono font-semibold text-foreground">{formatCurrency(paymentAmount)}</span>
          </div>
          {previewFee > 0 && (
            <div className="mt-1 flex justify-between gap-3">
              <span className="text-muted-foreground">Comisión</span>
              <span className="font-mono font-semibold text-foreground">{formatCurrency(previewFee)}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between gap-3 border-t border-border pt-2">
            <span className="font-semibold text-foreground">Total a tarjeta</span>
            <span className="font-mono font-semibold text-foreground">{formatCurrency(previewTotal)}</span>
          </div>
        </div>
      )}

      <Button
        type="button"
        disabled={loading || (isOpenRequest && (!Number.isFinite(paymentAmount) || paymentAmount <= 0))}
        onClick={() => startCheckout()}
        className="w-full justify-center bg-primary text-white"
      >
        {loading ? 'Abriendo...' : !isOpenRequest ? `Pagar ${formatCurrency(previewTotal)}` : 'Continuar a pago'}
      </Button>

      {settings.commission_payer === 'customer' && previewFee > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          El cargo incluye comisión estimada de {formatCurrency(previewFee)}.
        </p>
      )}
      {settings.commission_payer === 'merchant' && (
        <p className="mt-1 text-xs text-muted-foreground">
          La comisión de tarjeta la absorbe OTLA; tu abono se aplica completo.
        </p>
      )}
      {error && <p className="mt-2 text-sm text-[#EF4444]">{error}</p>}
    </section>
  )
}
