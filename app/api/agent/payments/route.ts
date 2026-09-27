import { createAgentPayment, jsonError, jsonOk, readJsonObject, requireAgent } from '@/lib/agent/api'

export async function POST(request: Request) {
  const context = await requireAgent(request)
  if (context instanceof Response) return context

  const body = await readJsonObject(request)
  if (!body) return jsonError('JSON inválido')
  const key = request.headers.get('idempotency-key') ?? ''
  if (!/^[A-Za-z0-9:_-]{16,128}$/.test(key)) return jsonError('Idempotency-Key es requerido (16–128 caracteres)', 400)

  try {
    const payment = await createAgentPayment(context, body, key)
    return jsonOk({ payment }, { status: 201 })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'No se pudo registrar el abono')
  }
}
