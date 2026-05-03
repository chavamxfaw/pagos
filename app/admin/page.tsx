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
          <h1 className="text-2xl font-semibold text-[#1A1F36]">Dashboard</h1>
          <p className="text-[#6B7280] text-sm mt-0.5">Resumen general de cobros</p>
        </div>
        <Link
          href="/admin/orders/new"
          className={cn(buttonVariants(), 'bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] text-white font-semibold shadow-sm hover:brightness-105 self-start sm:self-auto')}
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
        <div className="xl:col-span-2 bg-white border border-[#E6EAF0] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E6EAF0]">
            <h2 className="text-sm font-semibold text-[#1A1F36]">Órdenes recientes</h2>
            <Link href="/admin/orders" className="text-xs text-[#2ED39A] hover:text-[#26BA88] transition-colors">
              Ver todas →
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="py-16 text-center text-[#8A94A6]">
              <p className="mb-2">Sin órdenes aún</p>
              <Link href="/admin/orders/new" className="text-[#2ED39A] text-sm">Crear primera orden →</Link>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E6EAF0]">
                  <th className="text-left px-5 py-3 text-[11px] font-medium text-[#8A94A6] uppercase tracking-wider">Cliente / Concepto</th>
                  <th className="text-left px-3 py-3 text-[11px] font-medium text-[#8A94A6] uppercase tracking-wider hidden sm:table-cell">Progreso</th>
                  <th className="text-right px-5 py-3 text-[11px] font-medium text-[#8A94A6] uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => {
                  const pct = getProgressPercent(order.paid_amount, order.total_amount)
                  return (
                    <tr key={order.id} className="border-b border-[#E6EAF0] hover:bg-white/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <Link href={`/admin/orders/${order.id}`} className="block">
                          <p className="text-[#1A1F36] text-sm font-medium hover:text-[#2ED39A] transition-colors leading-tight">{order.concept}</p>
                          <p className="text-[#6B7280] text-xs mt-0.5">{order.clients.name} · {formatDateShort(order.created_at)}</p>
                        </Link>
                      </td>
                      <td className="px-3 py-3.5 hidden sm:table-cell">
                        <div className="flex items-center gap-2.5">
                          <div className="flex-1 h-1.5 bg-[#E6EAF0] rounded-full max-w-[100px]">
                            <div
                              className="h-full bg-[#2ED39A] rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[#6B7280] text-xs font-mono w-8 shrink-0">{pct}%</span>
                        </div>
                        <p className="text-[#8A94A6] text-xs font-mono mt-0.5">
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
          <div className="bg-white border border-[#E6EAF0] rounded-xl p-5">
            <h2 className="text-sm font-semibold text-[#1A1F36] mb-4">Acciones rápidas</h2>
            <div className="space-y-2">
              <QuickAction href="/admin/clients/new" label="Nuevo cliente" icon={<PeopleIcon />} />
              <QuickAction href="/admin/orders/new" label="Nueva orden" icon={<OrdersIcon />} />
              <QuickAction href="/admin/clients" label="Ver clientes" icon={<ListIcon />} />
            </div>
          </div>

          {/* Status breakdown */}
          <div className="bg-white border border-[#E6EAF0] rounded-xl p-5">
            <h2 className="text-sm font-semibold text-[#1A1F36] mb-4">Distribución de órdenes</h2>
            <div className="space-y-3">
              <StatusRow
                label="Pendientes"
                count={allOrders.filter(o => o.status === 'pending').length}
                total={allOrders.length}
                color="bg-[#6B7280]"
              />
              <StatusRow
                label="Parciales"
                count={allOrders.filter(o => o.status === 'partial').length}
                total={allOrders.length}
                color="bg-[#F4B740]"
              />
              <StatusRow
                label="Liquidadas"
                count={completedOrders.length}
                total={allOrders.length}
                color="bg-[#2ED39A]"
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
    amber:   'bg-[#F4B740]/10 text-[#F4B740]',
    emerald: 'bg-[#2ED39A]/10 text-[#2ED39A]',
    rose:    'bg-[#EF4444]/10 text-[#EF4444]',
  }[color]

  return (
    <div className="bg-white border border-[#E6EAF0] rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wider leading-tight">{label}</p>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', iconBg)}>
          {icon}
        </div>
      </div>
      <p className={cn('text-2xl font-bold text-[#1A1F36] leading-none', mono && 'font-mono text-xl')}>
        {value}
      </p>
      {sub && <p className="text-[#8A94A6] text-xs mt-1.5">{sub}</p>}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') {
    return <Badge className="bg-[#2ED39A]/10 text-[#2ED39A] border-[#2ED39A]/20 text-[11px]">Liquidado</Badge>
  }
  if (status === 'partial') {
    return <Badge className="bg-[#F4B740]/10 text-[#F4B740] border-[#F4B740]/20 text-[11px]">Parcial</Badge>
  }
  return <Badge className="bg-[#E6EAF0] text-[#6B7280] border-[#D8DEE8] text-[11px]">Pendiente</Badge>
}

function QuickAction({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white hover:bg-[#E6EAF0] transition-colors text-sm text-[#1A1F36] hover:text-[#1A1F36]"
    >
      <span className="text-[#6B7280] w-4 h-4">{icon}</span>
      {label}
      <svg className="w-3 h-3 ml-auto text-[#8A94A6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <span className="text-[#6B7280]">{label}</span>
        <span className="text-[#6B7280] font-mono">{count}</span>
      </div>
      <div className="h-1.5 bg-[#E6EAF0] rounded-full">
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
