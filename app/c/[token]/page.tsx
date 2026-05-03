import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { CheckCircle2, Clock3, FileText, Layers3, WalletCards } from 'lucide-react'
import { getPublicClientPortal } from '@/lib/public-clients'
import { cn, formatCurrency, formatDateShort, getProgressPercent } from '@/lib/utils'
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
    <div className="min-h-screen bg-[#F5F7FB] px-4 py-6 md:py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-center">
          <Image src="/otla-logo.png" alt="OTLA" width={148} height={118} className="h-14 w-auto object-contain" priority />
        </div>

        <div className="mb-6 overflow-hidden rounded-[28px] border border-white bg-white shadow-[0_18px_45px_rgba(26,31,54,0.08)] ring-1 ring-[#E6EAF0]/80">
          <div className="bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] px-6 py-8 md:px-10">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="mb-2 text-sm font-medium text-white/72">Estado de cuenta general</p>
                <h1 className="text-3xl font-bold tracking-tight text-white">{portal.client.name}</h1>
                {portal.client.company && (
                  <p className="mt-2 inline-flex rounded-full bg-white/14 px-3 py-1 text-sm font-medium text-white ring-1 ring-white/20">
                    {portal.client.company}
                  </p>
                )}
              </div>
              <div className="flex size-16 items-center justify-center rounded-2xl bg-white/16 text-white ring-1 ring-white/25">
                <Layers3 className="size-8" />
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-3 md:p-6">
            <SummaryItem label="Total" value={formatCurrency(totalAmount)} icon={<WalletCards className="size-4" />} />
            <SummaryItem label="Pagado" value={formatCurrency(paidAmount)} tone="paid" icon={<CheckCircle2 className="size-4" />} />
            <SummaryItem label="Pendiente" value={formatCurrency(pendingAmount)} tone={pendingAmount > 0 ? 'pending' : 'paid'} icon={pendingAmount > 0 ? <Clock3 className="size-4" /> : <CheckCircle2 className="size-4" />} />
          </div>

          <div className="px-5 pb-6 md:px-6">
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-[#6B7280]">Progreso general</span>
              <span className="font-mono font-semibold text-[#1A1F36]">{percent}%</span>
            </div>
            <div className="h-5 overflow-hidden rounded-full bg-[#E6EAF0] shadow-inner">
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
            <div className="grid gap-3">
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
        <p className="text-xs uppercase tracking-wider text-[#6B7280]">{label}</p>
      </div>
      <p
        className={
          tone === 'paid'
            ? 'font-mono font-bold text-[#2ED39A]'
            : tone === 'pending'
              ? 'font-mono font-bold text-[#F4B740]'
              : 'font-mono font-bold text-[#1A1F36]'
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
    <div className="rounded-2xl border border-white bg-white p-5 shadow-[0_14px_34px_rgba(26,31,54,0.06)] ring-1 ring-[#E6EAF0]/80 transition-colors hover:border-[#C9D4E5]">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', completed ? 'bg-[#EAFBF5] text-[#2ED39A]' : 'bg-[#FFF7E6] text-[#F4B740]')}>
            {completed ? <CheckCircle2 className="size-5" /> : <FileText className="size-5" />}
          </div>
          <div>
          <p className="font-semibold text-[#1A1F36]">{order.concept}</p>
          {order.description && <p className="mt-1 text-sm text-[#6B7280]">{order.description}</p>}
          <p className="mt-1 text-xs text-[#8A94A6]">{formatDateShort(order.created_at)}</p>
          </div>
        </div>
        <Link
          href={`/p/${order.token}`}
          className="self-start rounded-xl bg-[#EEF2FF] px-4 py-2 text-sm font-semibold text-[#4A8BFF] transition-colors hover:bg-[#E3E9FF]"
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
