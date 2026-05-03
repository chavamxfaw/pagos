import Image from 'next/image'
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
    <div className="min-h-screen bg-[#F5F7FB] px-4 py-8">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="mb-6 overflow-hidden rounded-3xl border border-[#E6EAF0] bg-white shadow-sm">
          <div className="flex justify-center bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] px-6 py-6">
            <Image src="/otla-white.png" alt="OTLA" width={180} height={143} className="h-16 w-auto object-contain" priority />
          </div>
          <div className="px-6 py-7 text-center">
            <p className="text-[#6B7280] text-sm mb-1">Estado de cuenta</p>
            <h1 className="text-2xl font-bold text-[#1A1F36] mb-1">
              {/* No exponemos email ni teléfono del cliente */}
              {order.clients.name}
            </h1>
            <p className="text-[#6B7280]">{order.concept}</p>
          </div>
        </div>

        {/* Completed banner */}
        {isCompleted && (
          <div className="mb-6 rounded-xl border border-[#2ED39A]/30 bg-[#2ED39A]/10 p-5 text-center">
            <div className="text-3xl mb-2">✅</div>
            <h2 className="text-[#2ED39A] font-bold text-lg">
              ¡Pago completado!
            </h2>
            <p className="text-[#2ED39A]/70 text-sm mt-1">
              Gracias {order.clients.name}, tu saldo está liquidado.
            </p>
          </div>
        )}

        {/* Main progress card */}
        <div className="bg-white border border-[#E6EAF0] rounded-2xl p-6 mb-6 shadow-sm">
          {/* Big amounts */}
          <div className="text-center mb-6">
            <p className="text-[#6B7280] text-sm mb-1">Has pagado</p>
            <p className="text-4xl font-bold text-[#2ED39A] font-mono">
              {formatCurrency(order.paid_amount)}
            </p>
            <p className="text-[#6B7280] text-sm mt-1">
              de {formatCurrency(order.total_amount)} total
            </p>
          </div>

          {/* Big progress bar */}
          <div className="mb-4">
            <div className="h-6 bg-[#E6EAF0] rounded-full overflow-hidden">
              <div
                className="h-full bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] rounded-full transition-all duration-700 flex items-center justify-end pr-2"
                style={{ width: `${Math.max(percent, percent > 0 ? 8 : 0)}%` }}
              >
                {percent >= 15 && (
                  <span className="text-white text-xs font-bold">{percent}%</span>
                )}
              </div>
            </div>
            {percent < 15 && percent > 0 && (
              <p className="text-[#2ED39A] text-xs text-right mt-1 font-mono">{percent}%</p>
            )}
          </div>

          {/* Balance grid */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#E6EAF0]">
            <div className="text-center">
              <p className="text-xs text-[#6B7280] uppercase tracking-wider mb-1">Pagado</p>
              <p className="text-[#2ED39A] font-mono font-semibold">{formatCurrency(order.paid_amount)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-[#6B7280] uppercase tracking-wider mb-1">
                {isCompleted ? 'Estado' : 'Restante'}
              </p>
              {isCompleted ? (
                <p className="text-[#2ED39A] font-semibold">Liquidado ✓</p>
              ) : (
                <p className="text-[#F4B740] font-mono font-semibold">{formatCurrency(remaining)}</p>
              )}
            </div>
          </div>

          {order.requires_invoice && (
            <div className="grid grid-cols-3 gap-3 pt-4 mt-4 border-t border-[#E6EAF0]">
              <div className="text-center">
                <p className="text-xs text-[#6B7280] uppercase tracking-wider mb-1">Subtotal</p>
                <p className="text-[#1A1F36] font-mono text-sm">{formatCurrency(order.subtotal_amount)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-[#6B7280] uppercase tracking-wider mb-1">
                  IVA {Math.round(order.tax_rate * 100)}%
                </p>
                <p className="text-[#1A1F36] font-mono text-sm">{formatCurrency(order.tax_amount)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-[#6B7280] uppercase tracking-wider mb-1">Factura</p>
                <p className="text-[#1A1F36] text-sm">
                  {order.tax_mode === 'included' ? 'IVA incluido' : 'IVA agregado'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Payment history */}
        {typedPayments.length > 0 && (
          <div className="bg-white border border-[#E6EAF0] rounded-2xl p-6 shadow-sm">
            <h2 className="text-[#1A1F36] font-semibold mb-4">
              Historial de abonos
            </h2>
            <div className="space-y-0">
              {typedPayments.map((payment, idx) => (
                <div key={payment.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-[#2ED39A] mt-1.5 shrink-0" />
                    {idx < typedPayments.length - 1 && (
                      <div className="w-px flex-1 bg-[#E6EAF0] my-1" />
                    )}
                  </div>
                  <div className="pb-4 flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[#1A1F36] text-sm font-medium">{payment.concept}</p>
                        <p className="text-[#8A94A6] text-xs">{formatDate(payment.created_at)}</p>
                      </div>
                      <span className="text-[#2ED39A] font-mono text-sm font-semibold shrink-0 ml-2">
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
        <p className="text-center text-[#A2ABBA] text-xs mt-8">
          OTLA · Control de pagos
        </p>
      </div>
    </div>
  )
}
