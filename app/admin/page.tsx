import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDateShort, getProgressPercent } from '@/lib/utils'
import { buttonVariants, } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { OrderWithClient } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { count: totalClients },
    { data: orders },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*, clients(*)').order('created_at', { ascending: false }).limit(50),
  ])

  const allOrders = (orders ?? []) as OrderWithClient[]
  const activeOrders = allOrders.filter(o => o.status !== 'completed')
  const completedOrders = allOrders.filter(o => o.status === 'completed')
  const totalCollected = allOrders.reduce((s, o) => s + o.paid_amount, 0)
  const totalPending = activeOrders.reduce((s, o) => s + (o.total_amount - o.paid_amount), 0)
  const recentOrders = allOrders.slice(0, 8)

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-8 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-50">Dashboard</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Resumen general de cobros</p>
        </div>
        <Link
          href="/admin/orders/new"
          className={cn(buttonVariants(), 'bg-emerald-500 hover:bg-emerald-400 text-black font-semibold self-start sm:self-auto')}
        >
          + Nueva orden
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Clientes totales"
          value={String(totalClients ?? 0)}
          icon={<PeopleIcon />}
          color="blue"
        />
        <StatCard
          label="Órdenes activas"
          value={String(activeOrders.length)}
          sub={`${completedOrders.length} liquidadas`}
          icon={<OrdersIcon />}
          color="amber"
        />
        <StatCard
          label="Total cobrado"
          value={formatCurrency(totalCollected)}
          icon={<CheckIcon />}
          color="emerald"
          mono
        />
        <StatCard
          label="Por cobrar"
          value={formatCurrency(totalPending)}
          sub={activeOrders.length > 0 ? `en ${activeOrders.length} orden${activeOrders.length !== 1 ? 'es' : ''}` : 'Sin pendientes'}
          icon={<ClockIcon />}
          color="rose"
          mono
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent orders table */}
        <div className="xl:col-span-2 bg-zinc-950 border border-zinc-800/60 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
            <h2 className="text-sm font-semibold text-zinc-200">Órdenes recientes</h2>
            <Link href="/admin/orders" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
              Ver todas →
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="py-16 text-center text-zinc-600">
              <p className="mb-2">Sin órdenes aún</p>
              <Link href="/admin/orders/new" className="text-emerald-400 text-sm">Crear primera orden →</Link>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800/40">
                  <th className="text-left px-5 py-3 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Cliente / Concepto</th>
                  <th className="text-left px-3 py-3 text-[11px] font-medium text-zinc-600 uppercase tracking-wider hidden sm:table-cell">Progreso</th>
                  <th className="text-right px-5 py-3 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => {
                  const pct = getProgressPercent(order.paid_amount, order.total_amount)
                  return (
                    <tr key={order.id} className="border-b border-zinc-800/30 hover:bg-zinc-900/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <Link href={`/admin/orders/${order.id}`} className="block">
                          <p className="text-zinc-100 text-sm font-medium hover:text-emerald-400 transition-colors leading-tight">{order.concept}</p>
                          <p className="text-zinc-500 text-xs mt-0.5">{order.clients.name} · {formatDateShort(order.created_at)}</p>
                        </Link>
                      </td>
                      <td className="px-3 py-3.5 hidden sm:table-cell">
                        <div className="flex items-center gap-2.5">
                          <div className="flex-1 h-1.5 bg-zinc-800 rounded-full max-w-[100px]">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-zinc-500 text-xs font-mono w-8 shrink-0">{pct}%</span>
                        </div>
                        <p className="text-zinc-600 text-xs font-mono mt-0.5">
                          {formatCurrency(order.paid_amount)} / {formatCurrency(order.total_amount)}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <StatusBadge status={order.status} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Quick actions + summary */}
        <div className="space-y-4">
          {/* Quick actions */}
          <div className="bg-zinc-950 border border-zinc-800/60 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-200 mb-4">Acciones rápidas</h2>
            <div className="space-y-2">
              <QuickAction href="/admin/clients/new" label="Nuevo cliente" icon={<PeopleIcon />} />
              <QuickAction href="/admin/orders/new" label="Nueva orden" icon={<OrdersIcon />} />
              <QuickAction href="/admin/clients" label="Ver clientes" icon={<ListIcon />} />
            </div>
          </div>

          {/* Status breakdown */}
          <div className="bg-zinc-950 border border-zinc-800/60 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-200 mb-4">Distribución de órdenes</h2>
            <div className="space-y-3">
              <StatusRow
                label="Pendientes"
                count={allOrders.filter(o => o.status === 'pending').length}
                total={allOrders.length}
                color="bg-zinc-500"
              />
              <StatusRow
                label="Parciales"
                count={allOrders.filter(o => o.status === 'partial').length}
                total={allOrders.length}
                color="bg-amber-500"
              />
              <StatusRow
                label="Liquidadas"
                count={completedOrders.length}
                total={allOrders.length}
                color="bg-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon, color, mono,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ReactNode
  color: 'blue' | 'amber' | 'emerald' | 'rose'
  mono?: boolean
}) {
  const iconBg = {
    blue:    'bg-blue-500/10 text-blue-400',
    amber:   'bg-amber-500/10 text-amber-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    rose:    'bg-rose-500/10 text-rose-400',
  }[color]

  return (
    <div className="bg-zinc-950 border border-zinc-800/60 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider leading-tight">{label}</p>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', iconBg)}>
          {icon}
        </div>
      </div>
      <p className={cn('text-2xl font-bold text-zinc-50 leading-none', mono && 'font-mono text-xl')}>
        {value}
      </p>
      {sub && <p className="text-zinc-600 text-xs mt-1.5">{sub}</p>}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') {
    return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[11px]">Liquidado</Badge>
  }
  if (status === 'partial') {
    return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[11px]">Parcial</Badge>
  }
  return <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[11px]">Pendiente</Badge>
}

function QuickAction({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 transition-colors text-sm text-zinc-300 hover:text-zinc-50"
    >
      <span className="text-zinc-500 w-4 h-4">{icon}</span>
      {label}
      <svg className="w-3 h-3 ml-auto text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}

function StatusRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-zinc-400">{label}</span>
        <span className="text-zinc-500 font-mono">{count}</span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ─── Icons ───────────────────────────────────────────────────────────────────
function PeopleIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
function OrdersIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
function ClockIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
function ListIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  )
}
