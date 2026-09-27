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

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*, clients(*), payments(payment_method)')
    .order('created_at', { ascending: false })

  const typedOrders = (orders ?? []) as OrderWithClient[]

  return (
    <div className="mx-auto w-full max-w-[1500px] min-w-0 space-y-6 overflow-x-hidden p-4 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-primary">Pagos y cobranza</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Órdenes</h1>
          <p className="mt-1 text-sm text-muted-foreground">{typedOrders.length} órdenes en total</p>
        </div>
        <Link href="/admin/orders/new" className={cn(buttonVariants(), "h-11 w-full bg-primary text-primary-foreground font-semibold shadow-none hover:bg-primary/90 sm:w-auto")}>
          <Plus className="size-4" />
          Nueva orden
        </Link>
      </div>

      {error ? <div role="alert" className="rounded-xl border border-border bg-card p-6"><h2 className="font-medium text-foreground">No pudimos cargar las órdenes</h2><p className="mt-2 text-sm text-muted-foreground">Revisa la conexión e inténtalo nuevamente.</p><Link className="mt-4 inline-block text-sm text-primary hover:underline" href="/admin/orders">Volver a intentar →</Link></div> : !typedOrders.length ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center text-muted-foreground">
          <p className="mb-2 font-medium text-foreground">Sin órdenes aún</p>
          <p className="mb-4 text-sm">Crea una orden para organizar cobros y compartir su enlace de pago.</p>
          <Link href="/admin/orders/new" className="text-primary hover:underline text-sm">
            Crear primera orden →
          </Link>
        </div>
      ) : (
        <OrdersFilterList orders={typedOrders} initialStatus={resolvedSearchParams.status} />
      )}
    </div>
  )
}
