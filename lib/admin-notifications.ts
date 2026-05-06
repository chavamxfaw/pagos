import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { formatCurrency, getOrderTiming, getTodayDateString } from '@/lib/utils'
import type { Client, ClientFollowup, OrderWithClient } from '@/types'

export type AdminNotification = {
  id: string
  title: string
  description: string
  href: string
  tone: 'danger' | 'warning' | 'info'
  count?: number
}

export async function getAdminNotifications(): Promise<AdminNotification[]> {
  const supabase = await createClient()

  const [{ data: orders }, { data: followups }, { data: clients }] = await Promise.all([
    supabase
      .from('orders')
      .select('*, clients(*)')
      .not('status', 'in', '("completed","cancelled")')
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(200),
    supabase
      .from('client_followups')
      .select('*, clients(name)')
      .not('follow_up_date', 'is', null)
      .lte('follow_up_date', getTodayDateString())
      .order('follow_up_date', { ascending: true })
      .limit(20),
    supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  const activeOrders = (orders ?? []) as OrderWithClient[]
  const clientRows = (clients ?? []) as Client[]
  const followupRows = (followups ?? []) as (ClientFollowup & { clients?: { name?: string } })[]

  const notifications: AdminNotification[] = []
  const overdueOrders = activeOrders.filter((order) => getOrderTiming(order).key === 'overdue')
  const dueSoonOrders = activeOrders.filter((order) => ['due_today', 'due_soon'].includes(getOrderTiming(order).key))
  const ordersWithoutBank = activeOrders.filter((order) => !order.bank_account_id)
  const clientsWithoutContact = clientRows.filter((client) => !client.email && !client.phone)
  const clientsWithoutPortal = getClientsWithOrdersAndNoPortal(activeOrders)

  if (overdueOrders.length) {
    const pendingTotal = overdueOrders.reduce((sum, order) => sum + Math.max(0, order.total_amount - order.paid_amount), 0)
    notifications.push({
      id: 'overdue-orders',
      title: `${overdueOrders.length} orden${overdueOrders.length === 1 ? '' : 'es'} vencida${overdueOrders.length === 1 ? '' : 's'}`,
      description: `Pendiente vencido: ${formatCurrency(pendingTotal)}.`,
      href: '/admin/orders?status=overdue',
      tone: 'danger',
      count: overdueOrders.length,
    })
  }

  if (dueSoonOrders.length) {
    const first = dueSoonOrders[0]
    notifications.push({
      id: 'due-soon-orders',
      title: `${dueSoonOrders.length} orden${dueSoonOrders.length === 1 ? '' : 'es'} por vencer`,
      description: `${first.clients?.name ?? 'Cliente'} · ${first.concept}.`,
      href: '/admin/orders?status=due_soon',
      tone: 'warning',
      count: dueSoonOrders.length,
    })
  }

  if (followupRows.length) {
    const first = followupRows[0]
    notifications.push({
      id: 'followups-due',
      title: `${followupRows.length} seguimiento${followupRows.length === 1 ? '' : 's'} pendiente${followupRows.length === 1 ? '' : 's'}`,
      description: `${first.clients?.name ?? 'Cliente'} · ${first.content}`,
      href: `/admin/clients/${first.client_id}`,
      tone: 'warning',
      count: followupRows.length,
    })
  }

  if (ordersWithoutBank.length) {
    const first = ordersWithoutBank[0]
    notifications.push({
      id: 'orders-without-bank',
      title: `${ordersWithoutBank.length} orden${ordersWithoutBank.length === 1 ? '' : 'es'} sin datos bancarios`,
      description: `${first.clients?.name ?? 'Cliente'} no verá instrucciones de pago en su link.`,
      href: '/admin/orders',
      tone: 'info',
      count: ordersWithoutBank.length,
    })
  }

  if (clientsWithoutContact.length) {
    notifications.push({
      id: 'clients-without-contact',
      title: `${clientsWithoutContact.length} cliente${clientsWithoutContact.length === 1 ? '' : 's'} sin contacto`,
      description: 'No tienen correo ni teléfono para enviar recordatorios.',
      href: '/admin/clients',
      tone: 'info',
      count: clientsWithoutContact.length,
    })
  }

  if (clientsWithoutPortal.length) {
    notifications.push({
      id: 'clients-without-portal',
      title: `${clientsWithoutPortal.length} link${clientsWithoutPortal.length === 1 ? '' : 's'} general${clientsWithoutPortal.length === 1 ? '' : 'es'} inactivo${clientsWithoutPortal.length === 1 ? '' : 's'}`,
      description: 'Clientes con órdenes activas sin link general habilitado.',
      href: `/admin/clients/${clientsWithoutPortal[0].id}`,
      tone: 'info',
      count: clientsWithoutPortal.length,
    })
  }

  return notifications.slice(0, 8)
}

function getClientsWithOrdersAndNoPortal(orders: OrderWithClient[]) {
  const clientsById = new Map<string, Client>()

  for (const order of orders) {
    if (order.clients && !order.clients.client_portal_enabled) {
      clientsById.set(order.clients.id, order.clients)
    }
  }

  return Array.from(clientsById.values())
}
