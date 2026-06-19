import { requireAgent, jsonError, jsonOk, normalizeOptionalString, normalizePhone, readJsonObject, requireString } from '@/lib/agent/api'
import { logActivity } from '@/lib/activity'

export async function GET(request: Request) {
  const context = await requireAgent(request)
  if (context instanceof Response) return context

  const url = new URL(request.url)
  const query = sanitizeSearchTerm(url.searchParams.get('q'))
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') ?? 20)))

  let builder = context.admin
    .from('clients')
    .select('id, name, email, phone, company, rfc, client_portal_enabled, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (query) {
    builder = builder.or(`name.ilike.%${query}%,company.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%,rfc.ilike.%${query}%`)
  }

  const { data, error } = await builder
  if (error) return jsonError(error.message, 500)

  return jsonOk({ clients: data ?? [] })
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
    const payload = {
      name: requireString(body.name, 'name'),
      email: normalizeOptionalString(body.email, 180),
      phone: normalizePhone(body.phone),
      company: normalizeOptionalString(body.company, 180),
      rfc: normalizeOptionalString(body.rfc, 40),
      address: normalizeOptionalString(body.address, 500),
      notes: normalizeOptionalString(body.notes, 1200),
    }

    const { data: client, error } = await context.admin
      .from('clients')
      .insert(payload)
      .select('id, name, email, phone, company, rfc, client_portal_enabled, created_at')
      .single()

    if (error) return jsonError(error.message, 500)

    await logActivity(context.admin, {
      entity_type: 'client',
      entity_id: client.id,
      client_id: client.id,
      event_type: 'agent_client_created',
      message: `Cliente creado por agente: ${client.name}`,
      metadata: { actor: context.actor },
    })

    return jsonOk({ client }, { status: 201 })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'No se pudo crear el cliente')
  }
}
