import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { OrdersFilterList } from '@/components/admin/OrdersFilterList'
import { cn } from '@/lib/utils'
import type { OrderWithClient } from '@/types'

export default async function OrdersPage() {
  const supabase = await createClient()

  const { data: orders } = await supabase
    .from('orders')
    .select('*, clients(*)')
    .order('created_at', { ascending: false })

  const typedOrders = (orders ?? []) as OrderWithClient[]

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Órdenes</h1>
          <p className="text-zinc-500 text-sm mt-1">{typedOrders.length} órdenes en total</p>
        </div>
        <Link href="/admin/orders/new" className={cn(buttonVariants(), "bg-emerald-500 hover:bg-emerald-400 text-black font-semibold self-start sm:self-auto")}>
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
        <OrdersFilterList orders={typedOrders} />
      )}
    </div>
  )
}
