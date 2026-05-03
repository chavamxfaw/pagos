import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getPublicClientPortal } from '@/lib/public-clients'
import { formatCurrency, formatDateShort, getProgressPercent } from '@/lib/utils'
import type { PublicClientOrder } from '@/lib/public-clients'

export default async function PublicClientPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const portal = await getPublicClientPortal(token)

  if (!portal) notFound()

  const activeOrders = portal.orders.filter((order) => order.status !== 'completed')
  const completedOrders = portal.orders.filter((order) => order.status === 'completed')
  const totalAmount = portal.orders.reduce((sum, order) => sum + order.total_amount, 0)
  const paidAmount = portal.orders.reduce((sum, order) => sum + order.paid_amount, 0)
  const pendingAmount = Math.max(0, totalAmount - paidAmount)
  const percent = getProgressPercent(paidAmount, totalAmount)

  return (
    <div className="min-h-screen bg-[#F5F7FB] px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 overflow-hidden rounded-3xl border border-[#E6EAF0] bg-white shadow-sm">
          <div className="flex justify-center bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] px-6 py-6">
            <Image src="/otla-white.png" alt="OTLA" width={180} height={143} className="h-16 w-auto object-contain" priority />
          </div>
          <div className="px-6 py-7">
            <p className="mb-1 text-sm font-medium text-[#6B7280]">Estado de cuenta general</p>
            <h1 className="text-2xl font-bold text-[#1A1F36]">{portal.client.name}</h1>
            {portal.client.company && (
              <p className="mt-1 text-sm font-medium text-[#2ED39A]">{portal.client.company}</p>
            )}
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-[#E6EAF0] bg-white p-6 shadow-sm">
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <SummaryItem label="Total" value={formatCurrency(totalAmount)} />
            <SummaryItem label="Pagado" value={formatCurrency(paidAmount)} tone="paid" />
            <SummaryItem label="Pendiente" value={formatCurrency(pendingAmount)} tone={pendingAmount > 0 ? 'pending' : 'paid'} />
          </div>

          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-[#6B7280]">Progreso general</span>
              <span className="font-mono font-semibold text-[#1A1F36]">{percent}%</span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-[#E6EAF0]">
              <div
                className="h-full rounded-full bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] transition-all duration-700"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>

        {activeOrders.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-[#1A1F36]">
              Pagos pendientes ({activeOrders.length})
            </h2>
            <div className="space-y-3">
              {activeOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          </section>
        )}

        {completedOrders.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-semibold text-[#6B7280]">
              Órdenes liquidadas ({completedOrders.length})
            </h2>
            <div className="space-y-2">
              {completedOrders.map((order) => (
                <OrderCard key={order.id} order={order} completed />
              ))}
            </div>
          </section>
        )}

        {!portal.orders.length && (
          <div className="rounded-2xl border border-[#E6EAF0] bg-white p-10 text-center">
            <p className="text-[#6B7280]">No hay órdenes registradas todavía.</p>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-[#A2ABBA]">
          OTLA · Control de pagos
        </p>
      </div>
    </div>
  )
}

function SummaryItem({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'paid' | 'pending'
}) {
  return (
    <div className="rounded-xl border border-[#E6EAF0] bg-[#F9FBFE] p-4 text-center">
      <p className="mb-1 text-xs uppercase tracking-wider text-[#6B7280]">{label}</p>
      <p
        className={
          tone === 'paid'
            ? 'font-mono font-semibold text-[#2ED39A]'
            : tone === 'pending'
              ? 'font-mono font-semibold text-[#F4B740]'
              : 'font-mono font-semibold text-[#1A1F36]'
        }
      >
        {value}
      </p>
    </div>
  )
}

function OrderCard({
  order,
  completed = false,
}: {
  order: PublicClientOrder
  completed?: boolean
}) {
  const percent = getProgressPercent(order.paid_amount, order.total_amount)
  const remaining = Math.max(0, order.total_amount - order.paid_amount)

  return (
    <div className="rounded-2xl border border-[#E6EAF0] bg-white p-4 shadow-sm transition-colors hover:border-[#C9D4E5]">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-medium text-[#1A1F36]">{order.concept}</p>
          {order.description && <p className="mt-1 text-sm text-[#6B7280]">{order.description}</p>}
          <p className="mt-1 text-xs text-[#8A94A6]">{formatDateShort(order.created_at)}</p>
        </div>
        <Link
          href={`/p/${order.token}`}
          className="rounded-lg bg-[#EEF2FF] px-3 py-1.5 text-sm font-medium text-[#4A8BFF] transition-colors hover:bg-[#E3E9FF]"
        >
          Ver detalle
        </Link>
      </div>

      <div className="mb-3">
        <div className="mb-1 flex justify-between text-xs font-mono text-[#6B7280]">
          <span>{formatCurrency(order.paid_amount)} / {formatCurrency(order.total_amount)}</span>
          <span>{percent}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#E6EAF0]">
          <div className="h-full rounded-full bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)]" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-[#E6EAF0] pt-3 text-sm">
        <span className="text-[#6B7280]">
          Abonos: <span className="font-mono text-[#1A1F36]">{order.payments.length}</span>
        </span>
        <span className={completed ? 'text-[#2ED39A]' : 'text-[#F4B740]'}>
          {completed ? 'Liquidado' : `Pendiente: ${formatCurrency(remaining)}`}
        </span>
      </div>
    </div>
  )
}
