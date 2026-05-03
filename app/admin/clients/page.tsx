import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { ClientsFilterList } from '@/components/admin/ClientsFilterList'
import { cn } from '@/lib/utils'

export default async function ClientsPage() {
  const supabase = await createClient()

  const { data: clients } = await supabase
    .from('clients')
    .select(`
      *,
      orders(id, status)
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Clientes</h1>
          <p className="text-zinc-500 text-sm mt-1">{clients?.length ?? 0} clientes registrados</p>
        </div>
        <Link href="/admin/clients/new" className={cn(buttonVariants(), "bg-emerald-500 hover:bg-emerald-400 text-black font-semibold self-start sm:self-auto")}>
          + Nuevo cliente
        </Link>
      </div>

      {!clients?.length ? (
        <div className="text-center py-20 text-zinc-600">
          <p className="text-lg mb-2">Sin clientes aún</p>
          <Link href="/admin/clients/new" className="text-emerald-400 hover:text-emerald-300 text-sm">
            Agregar primer cliente →
          </Link>
        </div>
      ) : (
        <ClientsFilterList clients={clients} />
      )}
    </div>
  )
}
