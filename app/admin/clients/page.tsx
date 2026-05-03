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
          <h1 className="text-2xl font-bold text-[#1A1F36]">Clientes</h1>
          <p className="text-[#6B7280] text-sm mt-1">{clients?.length ?? 0} clientes registrados</p>
        </div>
        <Link href="/admin/clients/new" className={cn(buttonVariants(), "bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] text-white font-semibold shadow-sm hover:brightness-105 self-start sm:self-auto")}>
          + Nuevo cliente
        </Link>
      </div>

      {!clients?.length ? (
        <div className="text-center py-20 text-[#8A94A6]">
          <p className="text-lg mb-2">Sin clientes aún</p>
          <Link href="/admin/clients/new" className="text-[#2ED39A] hover:text-[#26BA88] text-sm">
            Agregar primer cliente →
          </Link>
        </div>
      ) : (
        <ClientsFilterList clients={clients} />
      )}
    </div>
  )
}
