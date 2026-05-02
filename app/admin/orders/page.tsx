import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDateShort, getProgressPercent, cn } from '@/lib/utils'
import type { OrderWithClient } from '@/types'

export default async function OrdersPage() {
  const supabase = await createClient()

  const { data: orders } = await supabase
    .from('orders')
    .select('*, clients(*)')
    .order('created_at', { ascending: false })

  const typedOrders = (orders ?? []) as OrderWithClient[]

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Órdenes</h1>
          <p className="text-zinc-500 text-sm mt-1">{typedOrders.length} órdenes en total</p>
        </div>
        <Link href="/admin/orders/new" className={cn(buttonVariants(), "bg-emerald-500 hover:bg-emerald-400 text-black font-semibold")}>
          + Nueva orden
        </Link>
      </div>

      {!typedOrders.length ? (
        <div className="text-center py-20 text-zinc-600">
          <p className="text-lg mb-2">Sin órdenes aún</p>
          <Link href="/admin/orders/new" className="text-emerald-400 hover:text-emerald-300 text-sm">
            Crear primera orden →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {typedOrders.map((order) => {
            const percent = getProgressPercent(order.paid_amount, order.total_amount)
            const remaining = order.total_amount - order.paid_amount

            return (
              <Link key={order.id} href={`/admin/orders/${order.id}`} className="block">
                <div className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl p-4 transition-colors">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="min-w-0">
                      <p className="text-zinc-50 font-medium truncate">{order.concept}</p>
                      <p className="text-zinc-500 text-sm truncate">{order.clients.name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-zinc-300 text-sm font-mono hidden sm:block">
                        {formatCurrency(order.total_amount)}
                      </span>
                      <StatusBadge status={order.status} />
                    </div>
                  </div>

                  <div className="h-1.5 bg-zinc-800 rounded-full mb-2">
                    <div
                      className={`h-full rounded-full transition-all ${
                        order.status === 'completed' ? 'bg-emerald-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-xs font-mono text-zinc-500">
                    <span>{formatCurrency(order.paid_amount)} pagado</span>
                    {order.status !== 'completed' ? (
                      <span className="text-amber-400">{formatCurrency(remaining)} pendiente</span>
                    ) : (
                      <span className="text-emerald-400">Liquidado</span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-700 mt-1">{formatDateShort(order.created_at)}</p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') {
    return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Liquidado</Badge>
  }
  if (status === 'partial') {
    return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30">Parcial</Badge>
  }
  return <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700">Pendiente</Badge>
}
