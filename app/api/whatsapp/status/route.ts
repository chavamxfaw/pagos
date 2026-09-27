import { createAdminClient } from '@/lib/supabase/admin'
import { readVerifiedTwilioForm } from '@/lib/whatsapp/security'

export async function POST(request: Request) {
  try {
    const form = await readVerifiedTwilioForm(request, '/api/whatsapp/status')
    if (!form) return new Response('Unauthorized', { status: 403 })
    const sid = form.get('MessageSid') ?? ''
    const status = form.get('MessageStatus') ?? ''
    if (!/^SM[0-9a-fA-F]{32}$/.test(sid) || !['accepted','queued','sending','sent','delivered','read','failed','undelivered'].includes(status)) {
      return new Response('Invalid status', { status: 400 })
    }
    const admin = createAdminClient()
    const messageId = new URL(request.url).searchParams.get('message_id')
    if (messageId && /^[0-9a-f-]{36}$/i.test(messageId)) {
      const { error: bindingError } = await admin.from('whatsapp_messages').update({ provider_sid: sid })
        .eq('id', messageId).eq('direction', 'outbound').is('provider_sid', null)
      if (bindingError) throw new Error('Callback binding failed')
    }
    const { error } = await admin.rpc('apply_whatsapp_status', {
      p_sid: sid, p_status: status, p_error: form.get('ErrorCode')?.slice(0, 30) || null,
    })
    if (error) throw new Error('Status persistence failed')
    // A signed callback can reconcile a receipt whose send response was lost.
    if (['sent','delivered','read'].includes(status)) {
      const {data:message,error:messageError} = await admin.from('whatsapp_messages').select('kind,resource_id').eq('provider_sid',sid).maybeSingle()
      if(messageError) throw new Error('Receipt lookup failed')
      if(message?.kind==='receipt'&&message.resource_id) {
        const {error:receiptError} = await admin.from('payment_receipt_deliveries').update({status:'sent',provider_id:sid,updated_at:new Date().toISOString()})
          .eq('payment_id',message.resource_id).eq('channel','whatsapp').in('status',['sending','unknown'])
        if(receiptError) throw new Error('Receipt reconciliation failed')
      }
    }
    return new Response(null, { status: 204 })
  } catch { return new Response('Unable to receive status', { status: 503 }) }
}
