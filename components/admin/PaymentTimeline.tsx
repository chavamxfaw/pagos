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
      <p className="text-[#8A94A6] text-sm py-4">Sin abonos registrados aún.</p>
    )
  }

  return (
    <div className="space-y-0">
      {payments.map((payment, idx) => (
        <div key={payment.id} className="flex gap-4">
          {/* Timeline line */}
          <div className="flex flex-col items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-[#2ED39A] mt-1 shrink-0" />
            {idx < payments.length - 1 && (
              <div className="w-px flex-1 bg-[#E6EAF0] my-1" />
            )}
          </div>

          {/* Content */}
          <div className="pb-5 min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[#1A1F36] font-medium text-sm">{payment.concept}</p>
                {payment.notes && (
                  <p className="text-[#6B7280] text-xs mt-0.5">{payment.notes}</p>
                )}
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#8A94A6]">
                  <span>Abono: {formatDateShort(payment.paid_at ?? payment.created_at)}</span>
                  <span>Registrado: {formatDate(payment.created_at)}</span>
                  <span>{getPaymentMethodLabel(payment.payment_method)}</span>
                  {payment.payment_reference && <span>Ref: {payment.payment_reference}</span>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-[#2ED39A] font-mono font-semibold text-sm">
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
