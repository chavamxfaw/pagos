import Link from 'next/link'
import { AlertTriangle, CheckCircle2, CreditCard, DollarSign, Plus, UsersRound } from 'lucide-react'
import { getDisplayName } from '@/actions/user-settings'
import { requireAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn, formatCurrency, formatDateShort, getOrderTiming, getPaymentMethodLabel, getProgressPercent } from '@/lib/utils'
import type { OrderCategory, OrderWithClient, Payment, PaymentMethod } from '@/types'

type DashboardOrder = OrderWithClient & {
  payments?: { payment_method: PaymentMethod }[]
}

const categoryLabels: Record<OrderCategory, string> = {
  service: 'Servicios',
  product: 'Productos',
  project: 'Proyectos',
  subscription: 'Mensualidades',
  other: 'Otros',
}

export default async function DashboardPage() {
  const user = await requireAdmin()
  const supabase = await createClient()

  const [
    displayName,
    { count: totalClients },
    { data: orders },
    { data: payments },
  ] = await Promise.all([
    getDisplayName(user.id, user.email!),
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*, clients(*), payments(payment_method)').order('created_at', { ascending: false }).limit(200),
    supabase.from('payments').select('*').order('paid_at', { ascending: false }).limit(300),
  ])

  const allOrders = (orders ?? []) as DashboardOrder[]
  const allPayments = (payments ?? []) as Payment[]
  const activeOrders = allOrders.filter((order) => !['completed', 'cancelled'].includes(order.status))
  const completedOrders = allOrders.filter((order) => order.status === 'completed')
  const overdueOrders = activeOrders.filter((order) => getOrderTiming(order).key === 'overdue')
  const dueSoonOrders = activeOrders.filter((order) => ['due_today', 'due_soon'].includes(getOrderTiming(order).key))
  const totalPending = activeOrders.reduce((sum, order) => sum + Math.max(0, order.total_amount - order.paid_amount), 0)
  const totalPortfolio = allOrders.reduce((sum, order) => sum + order.total_amount, 0)
  const collectedTotal = allOrders.reduce((sum, order) => sum + order.paid_amount, 0)
  const now = new Date()
  const collectedThisMonth = allPayments
    .filter((payment) => {
      const date = new Date(`${payment.paid_at ?? payment.created_at}T00:00:00`)
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
    })
    .reduce((sum, payment) => sum + payment.amount, 0)
  const monthlyBars = getMonthlyBars(allPayments)
  const categoryBreakdown = getCategoryBreakdown(allOrders)
  const paymentsByMethod = getPaymentsByMethod(allPayments)
  const criticalOrders = [...overdueOrders, ...dueSoonOrders].slice(0, 5)
  const recentOrders = allOrders.slice(0, 6)
  const recentPayments = allPayments.slice(0, 6)
  const portfolioProgress = getProgressPercent(collectedTotal, totalPortfolio)

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-4 md:p-8">
      <section className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6C5CE7]">Panel operativo</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#1A1F36] md:text-4xl">Bienvenido, {displayName} 👋</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#6B7280]">Cartera, órdenes críticas y actividad reciente.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/admin/clients/new" className={cn(buttonVariants({ variant: 'outline' }), 'h-11 border-[#D8DEE8] bg-white text-[#1A1F36]')}>
            <UsersRound className="size-4" />
            Nuevo cliente
          </Link>
          <Link href="/admin/orders/new" className={cn(buttonVariants(), 'h-11 bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] font-semibold text-white shadow-sm hover:brightness-105')}>
            <Plus className="size-4" />
            Nueva orden
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Por cobrar" value={formatCurrency(totalPending)} hint={`${activeOrders.length} órdenes activas`} icon={<DollarSign className="size-4" />} accent="purple" />
        <MetricCard label="Cobrado este mes" value={formatCurrency(collectedThisMonth)} hint={`${allPayments.length} abonos registrados`} icon={<CheckCircle2 className="size-4" />} accent="green" />
        <MetricCard label="Vencidas" value={String(overdueOrders.length)} hint={overdueOrders.length ? 'Requieren atención' : 'Sin vencidas'} icon={<AlertTriangle className="size-4" />} accent="red" />
        <MetricCard label="Clientes" value={String(totalClients ?? 0)} hint={`${completedOrders.length} órdenes liquidadas`} icon={<UsersRound className="size-4" />} accent="blue" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel className="p-5">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#1A1F36]">Estado de cartera</h2>
              <p className="text-sm text-[#6B7280]">Progreso global de cobro.</p>
            </div>
            <Badge className="w-fit border-[#6C5CE7]/20 bg-[#6C5CE7]/10 text-[#6C5CE7]">{portfolioProgress}% cobrado</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <MiniTotal label="Cartera total" value={formatCurrency(totalPortfolio)} />
            <MiniTotal label="Cobrado" value={formatCurrency(collectedTotal)} tone="green" />
            <MiniTotal label="Pendiente" value={formatCurrency(totalPending)} tone="amber" />
          </div>
          <div className="mt-6">
            <div className="mb-2 flex justify-between text-xs font-medium text-[#6B7280]">
              <span>Avance global</span>
              <span>{portfolioProgress}%</span>
            </div>
            <div className="h-3 rounded-full bg-[#E6EAF0]">
              <div className="h-full rounded-full bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)]" style={{ width: `${portfolioProgress}%` }} />
            </div>
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#1A1F36]">Órdenes críticas</h2>
              <p className="text-sm text-[#6B7280]">Vencidas y próximas.</p>
            </div>
            <Link href="/admin/orders?status=overdue" className="text-sm font-medium text-[#6C5CE7]">Ver</Link>
          </div>
          <div className="space-y-3">
            {criticalOrders.length ? criticalOrders.map((order) => (
              <CompactOrder key={order.id} order={order} />
            )) : (
              <EmptyState title="Sin urgencias" text="No hay órdenes vencidas o por vencer." />
            )}
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr_0.9fr]">
        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-[#1A1F36]">Cobros por mes</h2>
          <p className="text-sm text-[#6B7280]">Últimos seis meses.</p>
          <div className="mt-5 space-y-3">
            {monthlyBars.map((item) => (
              <div key={item.label} className="grid grid-cols-[76px_1fr_90px] items-center gap-3 text-sm">
                <span className="text-[#6B7280]">{item.label}</span>
                <div className="h-8 overflow-hidden rounded-lg bg-[#F0F3F8]">
                  <div className="h-full rounded-lg bg-[#1A1F36]" style={{ width: `${item.percent}%` }} />
                </div>
                <span className="text-right font-mono text-xs font-semibold text-[#1A1F36]">{formatCurrency(item.total)}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#1A1F36]">Órdenes recientes</h2>
              <p className="text-sm text-[#6B7280]">Movimientos recientes.</p>
            </div>
            <Link href="/admin/orders" className="text-sm font-medium text-[#6C5CE7]">Todas</Link>
          </div>
          <div className="space-y-3">
            {recentOrders.length ? recentOrders.map((order) => (
              <CompactOrder key={order.id} order={order} muted />
            )) : (
              <EmptyState title="Sin órdenes" text="Crea una orden para empezar a dar seguimiento." />
            )}
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-[#1A1F36]">Categorías</h2>
          <p className="text-sm text-[#6B7280]">Por tipo de orden.</p>
          <div className="mt-5 space-y-4">
            {categoryBreakdown.map((item) => (
              <StatusRow key={item.category} label={categoryLabels[item.category]} count={item.count} total={allOrders.length} color="bg-[#6C5CE7]" />
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-[#1A1F36]">Pagos por método</h2>
          <p className="text-sm text-[#6B7280]">Totales por método.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {paymentsByMethod.map((item) => (
              <div key={item.method} className="rounded-2xl border border-[#E6EAF0] bg-[#F8FAFD] p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[#6B7280]">
                  <CreditCard className="size-4 text-[#6C5CE7]" />
                  {getPaymentMethodLabel(item.method)}
                </div>
                <p className="font-mono text-lg font-semibold text-[#1A1F36]">{formatCurrency(item.total)}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-[#1A1F36]">Abonos recientes</h2>
          <p className="text-sm text-[#6B7280]">Pagos capturados.</p>
          <div className="mt-5 space-y-3">
            {recentPayments.length ? recentPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between gap-4 rounded-2xl border border-[#E6EAF0] bg-[#F8FAFD] p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#1A1F36]">{payment.concept}</p>
                  <p className="text-xs text-[#6B7280]">{getPaymentMethodLabel(payment.payment_method)} · {formatDateShort(payment.paid_at ?? payment.created_at)}</p>
                </div>
                <p className="shrink-0 font-mono text-sm font-semibold text-[#2ED39A]">{formatCurrency(payment.amount)}</p>
              </div>
            )) : (
              <EmptyState title="Sin abonos" text="No hay pagos registrados." />
            )}
          </div>
        </Panel>
      </section>
    </div>
  )
}

function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-3xl border border-[#E3E8F0] bg-white/90 shadow-[0_10px_30px_rgba(26,31,54,0.025)]', className)}>
      {children}
    </div>
  )
}

function MetricCard({ label, value, hint, icon, accent }: { label: string; value: string; hint: string; icon: React.ReactNode; accent: 'purple' | 'green' | 'red' | 'blue' }) {
  const styles = {
    purple: 'bg-[#6C5CE7]/10 text-[#6C5CE7]',
    green: 'bg-[#2ED39A]/10 text-[#2ED39A]',
    red: 'bg-[#EF4444]/10 text-[#EF4444]',
    blue: 'bg-[#4A8BFF]/10 text-[#4A8BFF]',
  }[accent]

  return (
    <Panel className="p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[#6B7280]">{label}</p>
        <div className={cn('flex size-9 items-center justify-center rounded-xl', styles)}>{icon}</div>
      </div>
      <p className="font-mono text-2xl font-semibold tracking-tight text-[#1A1F36]">{value}</p>
      <p className="mt-1 text-sm text-[#8A94A6]">{hint}</p>
    </Panel>
  )
}

function MiniTotal({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'green' | 'amber' }) {
  const color = tone === 'green' ? 'text-[#2ED39A]' : tone === 'amber' ? 'text-[#F4B740]' : 'text-[#1A1F36]'
  return (
    <div className="rounded-2xl border border-[#E6EAF0] bg-[#F8FAFD] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280]">{label}</p>
      <p className={cn('mt-3 font-mono text-lg font-semibold', color)}>{value}</p>
    </div>
  )
}

function CompactOrder({ order, muted }: { order: DashboardOrder; muted?: boolean }) {
  const percent = getProgressPercent(order.paid_amount, order.total_amount)
  const remaining = Math.max(0, order.total_amount - order.paid_amount)
  const timing = getOrderTiming(order)

  return (
    <Link href={`/admin/orders/${order.id}`} className="block rounded-2xl border border-[#E6EAF0] bg-[#F8FAFD] p-4 transition hover:border-[#C9D4E5] hover:bg-white">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#1A1F36]">{order.concept}</p>
          <p className="truncate text-xs text-[#6B7280]">{order.clients.name}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div className="mb-2 h-2 rounded-full bg-[#E6EAF0]">
        <div className={cn('h-full rounded-full', muted ? 'bg-[#6C5CE7]' : 'bg-[#2ED39A]')} style={{ width: `${percent}%` }} />
      </div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className={timing.key === 'overdue' ? 'text-[#EF4444]' : 'text-[#6B7280]'}>
          {timing.label ?? `Emitida ${formatDateShort(order.issued_at ?? order.created_at)}`}
        </span>
        <span className="font-mono font-semibold text-[#F4B740]">{formatCurrency(remaining)}</span>
      </div>
    </Link>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') return <Badge className="border-[#2ED39A]/20 bg-[#2ED39A]/10 text-[#2ED39A]">Liquidada</Badge>
  if (status === 'partial') return <Badge className="border-[#F4B740]/20 bg-[#F4B740]/10 text-[#F4B740]">Parcial</Badge>
  if (status === 'cancelled') return <Badge className="border-[#EF4444]/20 bg-[#EF4444]/10 text-[#EF4444]">Cancelada</Badge>
  if (status === 'paused') return <Badge className="border-[#D8DEE8] bg-[#E6EAF0] text-[#6B7280]">Pausada</Badge>
  if (status === 'disputed') return <Badge className="border-[#EF4444]/20 bg-[#EF4444]/10 text-[#EF4444]">En disputa</Badge>
  return <Badge className="border-[#D8DEE8] bg-[#E6EAF0] text-[#6B7280]">Pendiente</Badge>
}

function StatusRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span className="text-[#6B7280]">{label}</span>
        <span className="font-mono text-[#1A1F36]">{count}</span>
      </div>
      <div className="h-2 rounded-full bg-[#E6EAF0]">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#D8DEE8] bg-[#F8FAFD] p-6 text-center">
      <p className="text-sm font-semibold text-[#1A1F36]">{title}</p>
      <p className="mt-1 text-sm text-[#6B7280]">{text}</p>
    </div>
  )
}

function getCategoryBreakdown(orders: DashboardOrder[]) {
  const categories: OrderCategory[] = ['service', 'product', 'project', 'subscription', 'other']
  return categories.map((category) => ({
    category,
    count: orders.filter((order) => (order.category ?? 'service') === category).length,
  }))
}

function getPaymentsByMethod(payments: Payment[]) {
  const totals = payments.reduce<Record<PaymentMethod, number>>((acc, payment) => {
    acc[payment.payment_method] = (acc[payment.payment_method] ?? 0) + payment.amount
    return acc
  }, { cash: 0, transfer: 0, card: 0, check: 0, other: 0 })

  return (Object.entries(totals) as [PaymentMethod, number][])
    .filter(([, total]) => total > 0)
    .map(([method, total]) => ({ method, total }))
}

function getMonthlyBars(payments: Payment[]) {
  const formatter = new Intl.DateTimeFormat('es-MX', { month: 'short' })
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date()
    date.setMonth(date.getMonth() - (5 - index))
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: formatter.format(date).replace('.', ''),
      total: 0,
    }
  })
  const byKey = new Map(months.map((month) => [month.key, month]))

  for (const payment of payments) {
    const date = new Date(`${payment.paid_at ?? payment.created_at}T00:00:00`)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const month = byKey.get(key)
    if (month) month.total += payment.amount
  }

  const max = Math.max(1, ...months.map((month) => month.total))
  return months.map((month) => ({ ...month, percent: Math.max(6, Math.round((month.total / max) * 100)) }))
}
