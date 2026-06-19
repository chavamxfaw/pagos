import { createAgentOrder, jsonError, jsonOk, readJsonObject, requireAgent } from '@/lib/agent/api'

export async function GET(request: Request) {
  const context = await requireAgent(request)
  if (context instanceof Response) return context

  const url = new URL(request.url)
  const status = url.searchParams.get('status')
  const clientId = url.searchParams.get('client_id')
  const query = sanitizeSearchTerm(url.searchParams.get('q'))
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 30)))

  let builder = context.admin
    .from('orders')
    .select('id, client_id, concept, description, category, tags, total_amount, paid_amount, status, issued_at, due_date, token')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status && status !== 'all') {
    builder = builder.eq('status', status)
  }

  if (clientId) {
    builder = builder.eq('client_id', clientId)
  }

  if (query) {
    builder = builder.or(`concept.ilike.%${query}%,description.ilike.%${query}%`)
  }

  const { data, error } = await builder
  if (error) return jsonError(error.message, 500)

  const clientIds = Array.from(new Set((data ?? []).map((order) => order.client_id).filter(Boolean)))
  const { data: clients } = clientIds.length
    ? await context.admin
        .from('clients')
        .select('id, name, company, email, phone')
        .in('id', clientIds)
    : { data: [] }
  const clientsById = new Map((clients ?? []).map((client) => [client.id, client]))
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin
  const orders = (data ?? []).map((order) => ({
    ...order,
    clients: clientsById.get(order.client_id) ?? null,
    pending_amount: Math.max(0, Number(order.total_amount) - Number(order.paid_amount)),
    public_url: `${appUrl}/p/${order.token}`,
  }))

  return jsonOk({ orders })
}

function sanitizeSearchTerm(value: string | null) {
  return value?.replace(/[,%]/g, ' ').trim().slice(0, 80)
}

export async function POST(request: Request) {
  const context = await requireAgent(request)
  if (context instanceof Response) return context

  const body = await readJsonObject(request)
  if (!body) return jsonError('JSON inválido')

  try {
    const order = await createAgentOrder(context, body)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin
    return jsonOk({ order: { ...order, public_url: `${appUrl}/p/${order.token}` } }, { status: 201 })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'No se pudo crear la orden')
  }
}
