import Link from 'next/link'
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
    <div className="min-h-screen bg-zinc-950 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <p className="mb-1 text-sm text-zinc-500">Estado de cuenta general</p>
          <h1 className="text-2xl font-bold text-zinc-50">{portal.client.name}</h1>
          {portal.client.company && (
            <p className="mt-1 text-sm font-medium text-emerald-400/80">{portal.client.company}</p>
          )}
        </div>

        <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <SummaryItem label="Total" value={formatCurrency(totalAmount)} />
            <SummaryItem label="Pagado" value={formatCurrency(paidAmount)} tone="paid" />
            <SummaryItem label="Pendiente" value={formatCurrency(pendingAmount)} tone={pendingAmount > 0 ? 'pending' : 'paid'} />
          </div>

          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-zinc-400">Progreso general</span>
              <span className="font-mono font-semibold text-zinc-300">{percent}%</span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>

        {activeOrders.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-zinc-200">
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
            <h2 className="mb-3 text-lg font-semibold text-zinc-500">
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
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-10 text-center">
            <p className="text-zinc-500">No hay órdenes registradas todavía.</p>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-zinc-700">
          Cobros · Sistema de pagos
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
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center">
      <p className="mb-1 text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <p
        className={
          tone === 'paid'
            ? 'font-mono font-semibold text-emerald-400'
            : tone === 'pending'
              ? 'font-mono font-semibold text-amber-400'
              : 'font-mono font-semibold text-zinc-100'
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
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-medium text-zinc-100">{order.concept}</p>
          {order.description && <p className="mt-1 text-sm text-zinc-500">{order.description}</p>}
          <p className="mt-1 text-xs text-zinc-600">{formatDateShort(order.created_at)}</p>
        </div>
        <Link
          href={`/p/${order.token}`}
          className="text-sm text-emerald-400 transition-colors hover:text-emerald-300"
        >
          Ver detalle
        </Link>
      </div>

      <div className="mb-3">
        <div className="mb-1 flex justify-between text-xs font-mono text-zinc-500">
          <span>{formatCurrency(order.paid_amount)} / {formatCurrency(order.total_amount)}</span>
          <span>{percent}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-zinc-800 pt-3 text-sm">
        <span className="text-zinc-500">
          Abonos: <span className="font-mono text-zinc-300">{order.payments.length}</span>
        </span>
        <span className={completed ? 'text-emerald-400' : 'text-amber-400'}>
          {completed ? 'Liquidado' : `Pendiente: ${formatCurrency(remaining)}`}
        </span>
      </div>
    </div>
  )
}
