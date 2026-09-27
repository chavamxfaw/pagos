import type { ReactNode } from 'react'
import { formatCurrency, formatDate, formatDateShort, getPaymentMethodLabel } from '@/lib/utils'
import type { Payment } from '@/types'

export function PaymentTimeline({
  payments,
  actions,
}: {
  payments: Payment[]
  actions?: (payment: Payment) => ReactNode
}) {
  if (!payments.length) {
    return (
      <p className="text-muted-foreground text-sm py-4">Sin abonos registrados aún.</p>
    )
  }

  return (
    <div className="space-y-0">
      {payments.map((payment, idx) => (
        <div key={payment.id} className="flex gap-4">
          {/* Timeline line */}
          <div className="flex flex-col items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
            {idx < payments.length - 1 && (
              <div className="w-px flex-1 bg-muted my-1" />
            )}
          </div>

          {/* Content */}
          <div className="pb-5 min-w-0 flex-1">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
              <div className="min-w-0">
                <p className="break-words text-foreground font-medium text-sm">{payment.concept}</p>
                {payment.notes && (
                  <p className="break-words text-muted-foreground text-xs mt-0.5">{payment.notes}</p>
                )}
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>Abono: {formatDateShort(payment.paid_at ?? payment.created_at)}</span>
                  <span>Registrado: {formatDate(payment.created_at)}</span>
                  <span>{getPaymentMethodLabel(payment.payment_method)}</span>
                  {payment.payment_reference && <span>Ref: {payment.payment_reference}</span>}
                </div>
              </div>
              <div className="flex w-full flex-wrap shrink-0 items-center justify-between gap-3 sm:w-auto sm:justify-end">
                <span className="text-emerald-700 tabular-nums font-semibold text-sm">
                  +{formatCurrency(payment.amount)}
                </span>
                {actions?.(payment)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
