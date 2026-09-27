import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeWhatsAppPhone, readVerifiedTwilioForm } from '@/lib/whatsapp/security'

export async function POST(request: Request) {
  try {
    const form = await readVerifiedTwilioForm(request, '/api/whatsapp/inbound')
    if (!form) return new Response('Unauthorized', { status: 403 })
    const sid = form.get('MessageSid') ?? ''
    if (!/^SM[0-9a-fA-F]{32}$/.test(sid)) return new Response('Invalid message', { status: 400 })
    if (!form.get('From')?.startsWith('whatsapp:') || !form.get('To')?.startsWith('whatsapp:')) return new Response('Invalid channel', { status: 400 })
    if (normalizeWhatsAppPhone(form.get('To')!) !== normalizeWhatsAppPhone(process.env.TWILIO_WHATSAPP_FROM ?? '')) return new Response('Invalid recipient', { status: 403 })
    const phone = normalizeWhatsAppPhone(form.get('From') ?? '')
    const admin = createAdminClient()
    const candidates = phone.startsWith('52') && phone.length === 12
      ? [phone, `521${phone.slice(2)}`, phone.slice(2)] : [phone]
    const { data: clients, error: clientError } = await admin.from('clients').select('id').in('phone', candidates).limit(2)
    if (clientError) throw new Error('Contact lookup failed')
    // Ambiguous sender stays unlinked. Inbound text is never executed as an agent command.
    const { error } = await admin.from('whatsapp_messages').upsert({
      provider_sid: sid,
      client_id: clients?.length === 1 ? clients[0].id : null,
      direction: 'inbound', phone, body: (form.get('Body') ?? '').slice(0, 10000),
      status: 'received', kind: Number(form.get('NumMedia') ?? 0) > 0 ? 'media' : 'text',
    }, { onConflict: 'provider_sid', ignoreDuplicates: true })
    if (error) throw new Error('Message persistence failed')
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response/>', { headers: { 'Content-Type': 'text/xml' } })
  } catch {
    return new Response('Unable to receive message', { status: 503 })
  }
}
