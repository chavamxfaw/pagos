import 'server-only'
import { createHash } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppMessage, sendWhatsAppTemplate } from './client'
import { normalizeWhatsAppPhone } from './security'
import { getDisplayName } from '@/lib/user-settings'
import { withSenderTemplate } from './template-identity'

export type MessageInput = {
  clientId: string
  kind: 'text' | 'payment' | 'bank' | 'document' | 'booking'
  resourceId?: string
  body?: string
  idempotencyKey: string
}

export async function prepareContactMessage(actorId: string, input: MessageInput) {
  const admin = createAdminClient()
  const { data: actor } = await admin.from('app_admin_users').select('user_id').eq('user_id', actorId).maybeSingle()
  if (!actor) throw new Error('No autorizado')
  const senderName = await getDisplayName(actorId, 'Equipo OTLA')
  if (!/^[0-9a-f-]{36}$/i.test(input.clientId)) throw new Error('Selecciona un contacto válido')
  if (!['text', 'payment', 'bank', 'document', 'booking'].includes(input.kind)) throw new Error('Tipo de mensaje inválido')
  const { data: client, error } = await admin.from('clients').select('id,name,phone').eq('id', input.clientId).single()
  if (error || !client?.phone) throw new Error('El contacto necesita un teléfono válido')
  const phone = normalizeWhatsAppPhone(client.phone)
  const origin = process.env.NEXT_PUBLIC_APP_URL
  if (!origin) throw new Error('Falta configurar la dirección pública del sistema')
  let body = input.body?.trim() || ''
  let title = ''
  let link = ''
  let template: { contentSid: string; variables: Record<string,string> } | null = null
  let identityWarning: string | null = null
  if (input.kind !== 'text' && !/^[0-9a-f-]{36}$/i.test(input.resourceId ?? '')) throw new Error('Selecciona qué compartir')
  if (input.kind === 'payment' || input.kind === 'bank') {
    const { data: order } = await admin.from('orders').select('*, bank_accounts(*)').eq('id', input.resourceId!).eq('client_id', client.id).single()
    if (!order) throw new Error('La orden no pertenece al contacto')
    if (order.notify_whatsapp_enabled === false) throw new Error('WhatsApp está desactivado para esta orden')
    title = order.concept
    link = new URL(`/p/${order.token}`, origin).toString()
    body = `Hola ${client.name}, te comparto el enlace de pago de ${title}:\n${link}`
    if (input.kind === 'bank') {
      const bank = Array.isArray(order.bank_accounts) ? order.bank_accounts[0] : order.bank_accounts
      if (!bank?.is_active) throw new Error('La orden necesita una cuenta bancaria activa')
      body = `Hola ${client.name}, estos son los datos de pago de ${title}:\nBanco: ${bank.bank_name}\nTitular: ${bank.account_holder}\nCLABE / cuenta: ${bank.clabe || bank.account_number || bank.card_number || ''}\n${link}`
      const sid = process.env.TWILIO_PAYMENT_INSTRUCTIONS_CONTENT_SID
      const selected = withSenderTemplate(sid, process.env.TWILIO_PAYMENT_INSTRUCTIONS_SENDER_CONTENT_SID,
        {'1':client.name,'2':title,'3':`${Math.max(0, Number(order.total_amount)-Number(order.paid_amount)).toFixed(2)} MXN`,'4':bank.bank_name,'5':bank.account_holder,'6':bank.clabe || bank.account_number || bank.card_number || '','7':order.token}, senderName, '8')
      template = selected.template; identityWarning = selected.identityWarning
    } else {
      const sid = process.env.TWILIO_PAYMENT_REMINDER_CONTENT_SID
      if (sid) template = { contentSid: sid, variables: {'1':client.name,'2':title,'3':`${Number(order.total_amount).toFixed(2)} MXN`,'4':`${Number(order.paid_amount).toFixed(2)} MXN`,'5':`${Math.max(0,Number(order.total_amount)-Number(order.paid_amount)).toFixed(2)} MXN`,'6':order.token,'7':senderName} }
    }
  }
  if (input.kind === 'document') {
    const { data: doc } = await admin.from('fiscal_documents').select('title,share_token').eq('id',input.resourceId!).eq('is_active',true).single()
    if (!doc) throw new Error('Documento no disponible')
    title = doc.title; link = new URL(`/d/${doc.share_token}`,origin).toString()
  }
  if (input.kind === 'booking') {
    const { data: event } = await admin.from('booking_event_types').select('title,slug').eq('id',input.resourceId!).eq('owner_user_id',actorId).eq('enabled',true).single()
    if (!event) throw new Error('Enlace de agenda no disponible')
    title = event.title; link = new URL(`/book/${event.slug}`,origin).toString()
  }
  if (input.kind === 'document' || input.kind === 'booking') {
    body = `Hola ${client.name}, te comparto ${title}:\n${link}`
    const sid = input.kind === 'document' ? process.env.TWILIO_DOCUMENT_LINK_CONTENT_SID : process.env.TWILIO_BOOKING_LINK_CONTENT_SID
    const senderSid = input.kind === 'document' ? process.env.TWILIO_DOCUMENT_LINK_SENDER_CONTENT_SID : process.env.TWILIO_BOOKING_LINK_SENDER_CONTENT_SID
    const selected = withSenderTemplate(sid, senderSid, {'1':client.name,'2':title,'3':link}, senderName, '4')
    template = selected.template; identityWarning = selected.identityWarning
  }
  if (input.kind !== 'text') body += `\nDe parte de: ${senderName}`
  if (!body || body.length > 4000) throw new Error('Escribe un mensaje de hasta 4,000 caracteres')
  const { data: recent, error: recentError } = await admin.from('whatsapp_messages').select('id')
    .eq('phone',phone).eq('direction','inbound').gte('created_at',new Date(Date.now()-24*60*60*1000).toISOString()).limit(1)
  if (recentError) throw new Error('La bandeja de WhatsApp necesita completar su configuración')
  const freeform = Boolean(recent?.length)
  // Do not show a signature that the legacy template will not actually send.
  if (!freeform && template && identityWarning) body = body.replace(`\nDe parte de: ${senderName}`, '')
  return { admin, client, phone, body, template: freeform ? null : template, identityWarning: freeform ? null : identityWarning,
    blocked: !freeform && !template ? 'Para iniciar esta conversación se necesita una plantilla aprobada, o que el cliente escriba primero.' : null }
}

export async function sendContactMessage(actorId: string, input: MessageInput) {
  if (!/^[A-Za-z0-9:_-]{16,128}$/.test(input.idempotencyKey)) throw new Error('Clave de envío inválida')
  const { admin, client, phone, body, template, blocked } = await prepareContactMessage(actorId,input)
  if (blocked) throw new Error(blocked)
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_FROM) throw new Error('Conecta WhatsApp antes de enviar')
  const hash = createHash('sha256').update(JSON.stringify([actorId,client.id,input.kind,input.resourceId || null,body])).digest('hex')
  const { data: message, error } = await admin.from('whatsapp_messages').insert({
    client_id:client.id,direction:'outbound',phone,body,kind:input.kind,resource_id:input.resourceId || null,
    actor_id:actorId,idempotency_key:input.idempotencyKey,request_hash:hash,status:'sending',
  }).select('id,status').single()
  if (error) {
    if (error.code !== '23505') throw new Error('No se pudo preparar el envío')
    const { data: existing } = await admin.from('whatsapp_messages').select('id,status,request_hash,actor_id').eq('idempotency_key',input.idempotencyKey).single()
    if (!existing || existing.actor_id !== actorId || existing.request_hash !== hash) throw new Error('Esta clave de envío ya se usó para otro mensaje')
    return { id:existing.id,status:existing.status,replayed:true }
  }
  try {
    const result = template
      ? await sendWhatsAppTemplate({to:phone,...template,messageId:message.id})
      : await sendWhatsAppMessage({to:phone,body,messageId:message.id})
    if (result.skipped) throw new Error('El envío no pudo iniciarse')
    const { error: persistError } = await admin.from('whatsapp_messages').update({provider_sid:result.sid}).eq('id',message.id)
    if (persistError) throw new Error('Delivery acknowledgement unavailable')
    const { error: statusError } = await admin.rpc('apply_whatsapp_status',{p_sid:result.sid,p_status:result.status,p_error:null})
    if (statusError) throw new Error('Delivery status unavailable')
    return {id:message.id,status:result.status,replayed:false}
  } catch {
    // A timeout may occur after provider acceptance. Never automatically resend.
    await admin.from('whatsapp_messages').update({status:'unknown',updated_at:new Date().toISOString()}).eq('id',message.id).eq('status','sending')
    throw new Error('Envío sin confirmar. Revisa el estado antes de volver a enviarlo.')
  }
}
