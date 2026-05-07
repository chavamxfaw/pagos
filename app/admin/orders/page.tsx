import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { OrdersFilterList } from '@/components/admin/OrdersFilterList'
import { cn } from '@/lib/utils'
import type { OrderWithClient } from '@/types'

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const supabase = await createClient()

  const { data: orders } = await supabase
    .from('orders')
    .select('*, clients(*), payments(payment_method)')
    .order('created_at', { ascending: false })

  const typedOrders = (orders ?? []) as OrderWithClient[]

  return (
    <div className="mx-auto w-full max-w-[1500px] min-w-0 space-y-6 overflow-x-hidden p-4 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6C5CE7]">Cobranza</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#1A1F36]">Órdenes</h1>
          <p className="mt-1 text-sm text-[#6B7280]">{typedOrders.length} órdenes en total</p>
        </div>
        <Link href="/admin/orders/new" className={cn(buttonVariants(), "h-11 w-full bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] text-white font-semibold shadow-sm hover:brightness-105 sm:w-auto")}>
          <Plus className="size-4" />
          Nueva orden
        </Link>
      </div>

      {!typedOrders.length ? (
        <div className="text-center py-20 text-[#8A94A6]">
          <p className="text-lg mb-2">Sin órdenes aún</p>
          <Link href="/admin/orders/new" className="text-[#2ED39A] hover:text-[#26BA88] text-sm">
            Crear primera orden →
          </Link>
        </div>
      ) : (
        <OrdersFilterList orders={typedOrders} initialStatus={resolvedSearchParams.status} />
      )}
    </div>
  )
}
