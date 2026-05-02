import { notFound } from 'next/navigation'
import { getPublicOrder } from '@/lib/public-orders'
import { formatCurrency, formatDate, getProgressPercent } from '@/lib/utils'

export default async function PublicOrderPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const publicOrder = await getPublicOrder(token)

  if (!publicOrder) notFound()

  const { order, payments: typedPayments } = publicOrder
  const percent = getProgressPercent(order.paid_amount, order.total_amount)
  const remaining = order.total_amount - order.paid_amount
  const isCompleted = order.status === 'completed'

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-zinc-500 text-sm mb-1">Estado de cuenta</p>
          <h1 className="text-2xl font-bold text-zinc-50 mb-1">
            {/* No exponemos email ni teléfono del cliente */}
            {order.clients.name}
          </h1>
          <p className="text-zinc-400">{order.concept}</p>
        </div>

        {/* Completed banner */}
        {isCompleted && (
          <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
            <div className="text-3xl mb-2">✅</div>
            <h2 className="text-emerald-400 font-bold text-lg">
              ¡Pago completado!
            </h2>
            <p className="text-emerald-300/70 text-sm mt-1">
              Gracias {order.clients.name}, tu saldo está liquidado.
            </p>
          </div>
        )}

        {/* Main progress card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
          {/* Big amounts */}
          <div className="text-center mb-6">
            <p className="text-zinc-500 text-sm mb-1">Has pagado</p>
            <p className="text-4xl font-bold text-emerald-400 font-mono">
              {formatCurrency(order.paid_amount)}
            </p>
            <p className="text-zinc-500 text-sm mt-1">
              de {formatCurrency(order.total_amount)} total
            </p>
          </div>

          {/* Big progress bar */}
          <div className="mb-4">
            <div className="h-6 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-700 flex items-center justify-end pr-2"
                style={{ width: `${Math.max(percent, percent > 0 ? 8 : 0)}%` }}
              >
                {percent >= 15 && (
                  <span className="text-black text-xs font-bold">{percent}%</span>
                )}
              </div>
            </div>
            {percent < 15 && percent > 0 && (
              <p className="text-emerald-400 text-xs text-right mt-1 font-mono">{percent}%</p>
            )}
          </div>

          {/* Balance grid */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
            <div className="text-center">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Pagado</p>
              <p className="text-emerald-400 font-mono font-semibold">{formatCurrency(order.paid_amount)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                {isCompleted ? 'Estado' : 'Restante'}
              </p>
              {isCompleted ? (
                <p className="text-emerald-400 font-semibold">Liquidado ✓</p>
              ) : (
                <p className="text-amber-400 font-mono font-semibold">{formatCurrency(remaining)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Payment history */}
        {typedPayments.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-zinc-200 font-semibold mb-4">
              Historial de abonos
            </h2>
            <div className="space-y-0">
              {typedPayments.map((payment, idx) => (
                <div key={payment.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    {idx < typedPayments.length - 1 && (
                      <div className="w-px flex-1 bg-zinc-800 my-1" />
                    )}
                  </div>
                  <div className="pb-4 flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-zinc-200 text-sm font-medium">{payment.concept}</p>
                        <p className="text-zinc-600 text-xs">{formatDate(payment.created_at)}</p>
                      </div>
                      <span className="text-emerald-400 font-mono text-sm font-semibold shrink-0 ml-2">
                        +{formatCurrency(payment.amount)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-zinc-700 text-xs mt-8">
          Cobros · Sistema de pagos
        </p>
      </div>
    </div>
  )
}
