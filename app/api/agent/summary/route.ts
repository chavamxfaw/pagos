import { requireAgent, jsonError, jsonOk } from '@/lib/agent/api'

export async function GET(request: Request) {
  const context = await requireAgent(request)
  if (context instanceof Response) return context

  const { data: orders, error } = await context.admin
    .from('orders')
    .select('id, client_id, concept, total_amount, paid_amount, status, due_date')
    .in('status', ['pending', 'partial'])
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return jsonError(error.message, 500)

  const pendingOrders = orders ?? []
  const clientIds = Array.from(new Set(pendingOrders.map((order) => order.client_id).filter(Boolean)))
  const { data: clients } = clientIds.length
    ? await context.admin
        .from('clients')
        .select('id, name, company')
        .in('id', clientIds)
    : { data: [] }
  const clientsById = new Map((clients ?? []).map((client) => [client.id, client]))
  const totals = pendingOrders.reduce(
    (acc, order) => {
      const total = Number(order.total_amount)
      const paid = Number(order.paid_amount)
      acc.total += total
      acc.paid += paid
      acc.pending += Math.max(0, total - paid)
      return acc
    },
    { total: 0, paid: 0, pending: 0 }
  )

  return jsonOk({
    totals,
    pending_order_count: pendingOrders.length,
    pending_orders: pendingOrders.map((order) => ({
      ...order,
      clients: clientsById.get(order.client_id) ?? null,
    })),
  })
}
