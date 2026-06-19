import { createAgentPayment, jsonError, jsonOk, readJsonObject, requireAgent } from '@/lib/agent/api'

export async function POST(request: Request) {
  const context = await requireAgent(request)
  if (context instanceof Response) return context

  const body = await readJsonObject(request)
  if (!body) return jsonError('JSON inválido')

  try {
    const payment = await createAgentPayment(context, body)
    return jsonOk({ payment }, { status: 201 })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'No se pudo registrar el abono')
  }
}
