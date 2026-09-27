import { requireAgent,readJsonObject,jsonError,jsonOk } from '@/lib/agent/api'
import { sendContactMessage,prepareContactMessage,type MessageInput } from '@/lib/whatsapp/messages'

export async function GET(request: Request) {
  const context = await requireAgent(request)
  if (context instanceof Response) return context
  const clientId = new URL(request.url).searchParams.get('client_id')
  if (!clientId || !/^[0-9a-f-]{36}$/i.test(clientId)) return jsonError('client_id es requerido')
  const {data,error} = await context.admin.from('whatsapp_messages').select('id,direction,body,status,created_at,kind').eq('client_id',clientId).order('created_at',{ascending:false}).limit(100)
  if(error) return jsonError('No se pudieron consultar los mensajes',503)
  return jsonOk({messages:data})
}
export async function POST(request: Request) {
  const context = await requireAgent(request)
  if (context instanceof Response) return context
  const body = await readJsonObject(request)
  if (!body) return jsonError('JSON inválido')
  if (typeof body.client_id !== 'string' || typeof body.kind !== 'string' || !['text','payment','bank','document','booking'].includes(body.kind)) return jsonError('client_id y kind son requeridos')
  const input: MessageInput = {clientId:body.client_id,kind:body.kind as MessageInput['kind'],resourceId:typeof body.resource_id==='string'?body.resource_id:undefined,body:typeof body.body==='string'?body.body:undefined,idempotencyKey:request.headers.get('idempotency-key') || ''}
  try {
    if (body.preview === true) {
      const p = await prepareContactMessage(context.ownerId,input)
      return jsonOk({body:p.body,blocked:p.blocked,template:Boolean(p.template),identityWarning:p.identityWarning})
    }
    return jsonOk(await sendContactMessage(context.ownerId,input),{status:201})
  } catch(error) { return jsonError(error instanceof Error?error.message:'No se pudo enviar el mensaje') }
}
