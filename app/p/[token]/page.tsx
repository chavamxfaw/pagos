import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarDays, CheckCircle2, Clock3, ReceiptText, WalletCards } from 'lucide-react'
import { getPublicOrder } from '@/lib/public-orders'
import { cn, formatCurrency, formatDateShort, getProgressPercent } from '@/lib/utils'

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
  const clientPortalPath = order.clients.client_portal_enabled
    ? `/c/${order.clients.client_portal_token}`
    : null

  return (
    <div className="min-h-screen bg-[#F5F7FB] px-4 py-6 md:py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-center">
          <Image src="/otla-logo.png" alt="OTLA" width={148} height={118} className="h-14 w-auto object-contain" priority />
        </div>

        {clientPortalPath && (
          <div className="mb-4 flex justify-center">
            <Link
              href={clientPortalPath}
              className="inline-flex max-w-full items-center justify-center rounded-full border border-[#E6EAF0] bg-white px-4 py-2 text-center text-sm font-semibold text-[#1A1F36] shadow-sm transition-colors hover:border-[#C8D0DC] hover:bg-[#F8FAFF]"
            >
              ← Volver al resumen general
            </Link>
          </div>
        )}

        <div className="mb-6 overflow-hidden rounded-[28px] border border-white bg-white shadow-[0_18px_45px_rgba(26,31,54,0.08)] ring-1 ring-[#E6EAF0]/80">
          <div className="bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] px-6 py-8 text-center md:px-10">
            <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-white/16 text-white ring-1 ring-white/25">
              {isCompleted ? <CheckCircle2 className="size-8" /> : <WalletCards className="size-8" />}
            </div>
            <p className="mb-2 text-sm font-medium text-white/72">Estado de cuenta</p>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              {order.clients.name}
            </h1>
            <p className="mt-2 text-sm font-medium text-white/72">{order.concept}</p>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-3 md:p-6">
            <MiniMetric label="Total" value={formatCurrency(order.total_amount)} icon={<ReceiptText className="size-4" />} />
            <MiniMetric label="Pagado" value={formatCurrency(order.paid_amount)} tone="paid" icon={<CheckCircle2 className="size-4" />} />
            <MiniMetric label={isCompleted ? 'Estado' : 'Pendiente'} value={isCompleted ? 'Liquidado' : formatCurrency(remaining)} tone={isCompleted ? 'paid' : 'pending'} icon={isCompleted ? <CheckCircle2 className="size-4" /> : <Clock3 className="size-4" />} />
          </div>
        </div>

        {/* Completed banner */}
        {isCompleted && (
          <div className="mb-6 rounded-2xl border border-[#BDF3DE] bg-[#EAFBF5] p-5 text-center shadow-sm">
            <CheckCircle2 className="mx-auto mb-2 size-8 text-[#2ED39A]" />
            <h2 className="text-lg font-bold text-[#129B70]">Pago completado</h2>
            <p className="mt-1 text-sm text-[#129B70]/75">
              Gracias {order.clients.name}, tu saldo está liquidado.
            </p>
          </div>
        )}

        {/* Main progress card */}
        <div className="mb-6 rounded-[28px] border border-white bg-white p-6 shadow-[0_18px_45px_rgba(26,31,54,0.08)] ring-1 ring-[#E6EAF0]/80">
          {/* Big amounts */}
          <div className="text-center mb-6">
            <p className="text-sm font-medium text-[#6B7280] mb-1">Has pagado</p>
            <p className="font-mono text-4xl font-bold tracking-tight text-[#2ED39A] md:text-5xl">
              {formatCurrency(order.paid_amount)}
            </p>
            <p className="text-[#6B7280] text-sm mt-1">
              de {formatCurrency(order.total_amount)} total
            </p>
          </div>

          {/* Big progress bar */}
          <div className="mb-4">
            <div className="h-7 overflow-hidden rounded-full bg-[#E6EAF0] shadow-inner">
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
            <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[#E6EAF0] pt-4 sm:grid-cols-3">
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
          <div className="rounded-[28px] border border-white bg-white p-6 shadow-[0_18px_45px_rgba(26,31,54,0.08)] ring-1 ring-[#E6EAF0]/80">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#6C5CE7]">
                <CalendarDays className="size-5" />
              </div>
              <h2 className="font-semibold text-[#1A1F36]">Historial de abonos</h2>
            </div>
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
                        <p className="text-[#8A94A6] text-xs">{formatDateShort(payment.paid_at ?? payment.created_at)}</p>
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

function MiniMetric({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: string
  icon: React.ReactNode
  tone?: 'paid' | 'pending'
}) {
  return (
    <div className="rounded-2xl border border-[#E6EAF0] bg-[#F8FAFF] p-4">
      <div className="mb-3 flex items-center gap-2">
        <span
          className={cn(
            'flex size-8 items-center justify-center rounded-lg',
            tone === 'paid'
              ? 'bg-[#EAFBF5] text-[#2ED39A]'
              : tone === 'pending'
                ? 'bg-[#FFF7E6] text-[#F4B740]'
                : 'bg-[#EEF2FF] text-[#6C5CE7]'
          )}
        >
          {icon}
        </span>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">{label}</p>
      </div>
      <p className={cn('truncate font-mono text-sm font-bold text-[#1A1F36]', tone === 'paid' && 'text-[#2ED39A]', tone === 'pending' && 'text-[#F4B740]')}>
        {value}
      </p>
    </div>
  )
}
