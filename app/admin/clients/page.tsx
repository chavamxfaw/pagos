import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { ClientsFilterList } from '@/components/admin/ClientsFilterList'
import { cn, formatCurrency } from '@/lib/utils'
import { ClipboardList, DollarSign, TrendingUp, Users } from 'lucide-react'
import type { Client } from '@/types'

type ClientListRow = Client & {
  orders?: { id: string; status: string; total_amount?: number | null }[]
}

export default async function ClientsPage() {
  const supabase = await createClient()

  const { data: clients } = await supabase
    .from('clients')
    .select(`
      *,
      orders(id, status, total_amount)
    `)
    .order('created_at', { ascending: false })

  const clientRows = (clients ?? []) as ClientListRow[]
  const totalClients = clientRows.length
  const totalOrders = clientRows.reduce((sum, client) => sum + (client.orders?.length ?? 0), 0)
  const totalAmount = clientRows.reduce(
    (sum, client) => sum + (client.orders?.reduce((orderSum, order) => orderSum + (Number(order.total_amount) || 0), 0) ?? 0),
    0
  )
  const averagePerClient = totalClients > 0 ? totalAmount / totalClients : 0

  return (
    <div className="mx-auto max-w-7xl space-y-7 p-4 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1A1F36]">Clientes</h1>
          <p className="mt-1 text-sm text-[#6B7280]">{totalClients} clientes registrados</p>
        </div>
        <Link href="/admin/clients/new" className={cn(buttonVariants({ size: 'lg' }), "w-full bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] px-6 font-semibold text-white shadow-[0_14px_30px_rgba(74,139,255,0.25)] hover:brightness-105 sm:w-auto")}>
          + Nuevo cliente
        </Link>
      </div>

      {totalClients > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ClientMetric
            label="Clientes totales"
            value={String(totalClients)}
            hint="Todos los clientes"
            icon={<Users className="size-5" />}
            tone="purple"
          />
          <ClientMetric
            label="Órdenes totales"
            value={String(totalOrders)}
            hint="En todas las cuentas"
            icon={<ClipboardList className="size-5" />}
            tone="blue"
          />
          <ClientMetric
            label="Monto total"
            value={formatCurrency(totalAmount)}
            hint="En todas las órdenes"
            icon={<DollarSign className="size-5" />}
            tone="green"
          />
          <ClientMetric
            label="Promedio por cliente"
            value={formatCurrency(averagePerClient)}
            hint="Basado en monto total"
            icon={<TrendingUp className="size-5" />}
            tone="amber"
          />
        </div>
      )}

      {!totalClients ? (
        <div className="text-center py-20 text-[#8A94A6]">
          <p className="text-lg mb-2">Sin clientes aún</p>
          <Link href="/admin/clients/new" className="text-[#2ED39A] hover:text-[#26BA88] text-sm">
            Agregar primer cliente →
          </Link>
        </div>
      ) : (
        <ClientsFilterList clients={clientRows} />
      )}
    </div>
  )
}

function ClientMetric({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string
  value: string
  hint: string
  icon: React.ReactNode
  tone: 'purple' | 'blue' | 'green' | 'amber'
}) {
  const tones = {
    purple: {
      bubble: 'bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] text-white shadow-[#6C5CE7]/20',
      dot: 'bg-[#6C5CE7]',
    },
    blue: {
      bubble: 'bg-[#E4F2FF] text-[#1F8BEA] shadow-[#4A8BFF]/10',
      dot: 'bg-[#1F8BEA]',
    },
    green: {
      bubble: 'bg-[#DDF8EE] text-[#13A674] shadow-[#2ED39A]/10',
      dot: 'bg-[#2ED39A]',
    },
    amber: {
      bubble: 'bg-[#FFF0D8] text-[#E48A00] shadow-[#F4B740]/10',
      dot: 'bg-[#F4B740]',
    },
  }[tone]

  return (
    <div className="rounded-2xl border border-white bg-white p-6 shadow-[0_16px_40px_rgba(26,31,54,0.06)] ring-1 ring-[#E6EAF0]/70">
      <div className="flex items-center gap-4">
        <div className={cn('flex size-14 shrink-0 items-center justify-center rounded-full shadow-lg', tones.bubble)}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#6B7280]">{label}</p>
          <p className="mt-1 truncate text-2xl font-bold text-[#1A1F36]">{value}</p>
          <p className="mt-2 flex items-center gap-2 text-xs text-[#6B7280]">
            <span className={cn('size-2 rounded-full', tones.dot)} />
            {hint}
          </p>
        </div>
      </div>
    </div>
  )
}
