'use client'

import { useState } from 'react'
import { CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  settings: Pick<StripeSettings, 'commission_payer' | 'fee_percent' | 'fixed_fee_amount'>
}) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const requestAmount = Math.min(request.amount, pendingAmount)
  const previewFee = request.fee_amount
  const previewTotal = request.total_charged

  async function startCheckout() {
    setError(null)

    if (!Number.isFinite(requestAmount) || requestAmount <= 0) {
      setError('Esta solicitud no tiene un monto válido.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, token, paymentRequestId: request.id }),
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
    <section className="rounded-2xl border border-[#E6EAF0] bg-white p-4">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#6C5CE7]">
          <CreditCard className="size-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6C5CE7]">Pago con tarjeta</p>
          <h2 className="text-sm font-semibold text-[#1A1F36]">{request.concept}</h2>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-[#E6EAF0] bg-[#F8FAFF] p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8A94A6]">Monto solicitado</p>
        <p className="mt-1 font-mono text-2xl font-bold text-[#1A1F36]">{formatCurrency(requestAmount)}</p>
        {request.requires_invoice && (
          <p className="mt-1 text-xs text-[#6B7280]">
            Factura: {request.tax_mode === 'added' ? 'IVA agregado' : 'IVA incluido'}
          </p>
        )}
      </div>

      <Button
        type="button"
        disabled={loading}
        onClick={() => startCheckout()}
        className="w-full justify-center bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] text-white"
      >
        {loading ? 'Abriendo...' : `Pagar ${formatCurrency(previewTotal)}`}
      </Button>

      {settings.commission_payer === 'customer' && previewFee > 0 && (
        <p className="mt-3 text-xs text-[#6B7280]">
          El cargo incluye comisión estimada de {formatCurrency(previewFee)}.
        </p>
      )}
      {settings.commission_payer === 'merchant' && (
        <p className="mt-1 text-xs text-[#6B7280]">
          La comisión de tarjeta la absorbe OTLA; tu abono se aplica completo.
        </p>
      )}
      {error && <p className="mt-2 text-sm text-[#EF4444]">{error}</p>}
    </section>
  )
}
