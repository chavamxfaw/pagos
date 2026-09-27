import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { ClientsFilterList } from '@/components/admin/ClientsFilterList'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'
import type { Client } from '@/types'

type ClientListRow = Client & { orders?: { id: string; status: string; total_amount?: number | null }[] }

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('clients').select('*, orders(id, status, total_amount)').order('created_at', { ascending: false })
  const clients = (data ?? []) as ClientListRow[]
  const active = clients.filter(client => client.orders?.some(order => !['completed', 'cancelled'].includes(order.status))).length
  return <div className="mx-auto max-w-7xl space-y-7 px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-semibold tracking-tight">Contactos</h1><p className="mt-2 text-sm text-muted-foreground">Personas, empresas y todo lo que sigue en tu relación con ellas.</p></div><Link href="/admin/clients/new" className={cn(buttonVariants(), 'min-h-11 w-fit')}><Plus className="size-4" />Nuevo contacto</Link></header>
    {error ? <div role="alert" className="rounded-lg border border-amber-200 p-6"><h2 className="font-medium">No pudimos cargar tus contactos</h2><p className="mt-2 text-sm text-muted-foreground">Tus datos siguen guardados. Recarga la página para volver a consultar.</p><Link href="/admin/clients" className="mt-4 inline-block text-sm text-primary">Reintentar →</Link></div> : <><div className="flex flex-wrap gap-x-8 gap-y-3 border-y py-4 text-sm"><p><strong className="font-semibold">{clients.length}</strong><span className="ml-2 text-muted-foreground">contactos</span></p><p><strong className="font-semibold">{active}</strong><span className="ml-2 text-muted-foreground">con órdenes activas</span></p><p className="text-muted-foreground">Selecciona un contacto para consultar su historial.</p></div>{clients.length ? <ClientsFilterList clients={clients} /> : <div className="rounded-lg border border-dashed px-6 py-12"><h2 className="font-medium">Tu próxima relación empieza aquí</h2><p className="mt-2 text-sm text-muted-foreground">Agrega un contacto para registrar notas, proyectos y pagos.</p><Link href="/admin/clients/new" className="mt-5 inline-flex text-sm text-primary">Agregar primer contacto →</Link></div>}</>}
  </div>
}
