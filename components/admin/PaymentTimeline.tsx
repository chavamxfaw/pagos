import { formatCurrency, formatDate } from '@/lib/utils'
import type { Payment } from '@/types'

export function PaymentTimeline({ payments }: { payments: Payment[] }) {
  if (!payments.length) {
    return (
      <p className="text-zinc-600 text-sm py-4">Sin abonos registrados aún.</p>
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
              <div className="w-px flex-1 bg-zinc-800 my-1" />
            )}
          </div>

          {/* Content */}
          <div className="pb-5 min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-zinc-200 font-medium text-sm">{payment.concept}</p>
                {payment.notes && (
                  <p className="text-zinc-500 text-xs mt-0.5">{payment.notes}</p>
                )}
                <p className="text-zinc-600 text-xs mt-1">{formatDate(payment.created_at)}</p>
              </div>
              <span className="text-emerald-400 font-mono font-semibold text-sm shrink-0">
                +{formatCurrency(payment.amount)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
