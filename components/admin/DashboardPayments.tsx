'use client'

import Link from 'next/link'
import { Tabs } from '@base-ui/react/tabs'
import { ArrowUpRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn, formatCurrency, formatDateShort } from '@/lib/utils'

export type DashboardPayment = {
  id: string
  client: string
  concept: string
  due: string | null
  balance: number
  timing: string
}

export function DashboardPayments({ payments }: { payments: DashboardPayment[] }) {
  const attention = payments.filter(item => ['overdue', 'due_today', 'due_soon'].includes(item.timing))
  function rows(items: DashboardPayment[]) {
    return items.length ? <div className="divide-y">
      {items.slice(0, 12).map(item => <Link key={item.id} href={`/admin/orders/${item.id}`} className="group flex flex-wrap items-center gap-3 px-1 py-4 hover:bg-muted/70 sm:flex-nowrap">
        <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-semibold text-secondary-foreground">{item.client.split(' ').map(word => word[0]).slice(0, 2).join('')}</span>
        <div className="min-w-0 flex-1 basis-40"><p className="truncate text-sm font-medium">{item.client}</p><p className="mt-1 truncate text-xs text-muted-foreground">{item.concept}</p></div>
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="text-right"><p className="text-sm font-medium tabular-nums">{formatCurrency(item.balance)}</p><p className="mt-1 text-xs text-muted-foreground">{item.due ? formatDateShort(item.due) : 'Sin vencimiento'}</p></div>
          <Badge variant="outline" className={cn(item.timing === 'overdue' ? 'otla-status-overdue' : 'otla-status-pending')}><span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />{item.timing === 'overdue' ? 'Vencido' : item.timing === 'due_today' ? 'Vence hoy' : 'Pendiente'}</Badge>
          <ArrowUpRight aria-hidden="true" className="size-4 text-muted-foreground" />
        </div>
      </Link>)}
      {items.length > 12 && <p className="py-3 text-xs text-muted-foreground">Mostrando 12 cobros. Abre Pagos para consultar el resto.</p>}
    </div> : <div className="py-10"><p className="text-sm font-medium">No hay cobros en esta vista</p><p className="mt-2 text-sm text-muted-foreground">Puedes revisar todos tus pagos o crear un nuevo cobro.</p><Link href="/admin/orders" className="mt-4 inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4">Ir a pagos</Link></div>
  }
  return <Tabs.Root defaultValue="attention">
    <Tabs.List aria-label="Filtrar cobros del inicio" className="flex flex-wrap gap-4 border-b">
      <Tabs.Tab value="attention" className="min-h-11 border-b-2 border-transparent px-1 text-sm text-muted-foreground data-[active]:border-primary data-[active]:font-medium data-[active]:text-foreground">Por revisar <Badge variant="secondary" className="ml-2">{attention.length}</Badge></Tabs.Tab>
      <Tabs.Tab value="active" className="min-h-11 border-b-2 border-transparent px-1 text-sm text-muted-foreground data-[active]:border-primary data-[active]:font-medium data-[active]:text-foreground">Todos los activos <Badge variant="outline" className="ml-2">{payments.length}</Badge></Tabs.Tab>
    </Tabs.List>
    <Tabs.Panel value="attention">{rows(attention)}</Tabs.Panel>
    <Tabs.Panel value="active">{rows(payments)}</Tabs.Panel>
  </Tabs.Root>
}
