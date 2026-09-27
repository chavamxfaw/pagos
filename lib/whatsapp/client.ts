type SendWhatsAppMessageInput = {
  to: string
  body: string
  messageId?: string
}

type SendWhatsAppTemplateInput = {
  to: string
  contentSid: string
  variables: Record<string, string>
  messageId?: string
}

export async function sendWhatsAppMessage({ to, body, messageId }: SendWhatsAppMessageInput) {
  return sendTwilioWhatsApp({
    to,
    messageId,
    payload: { Body: body },
  })
}

export async function sendWhatsAppTemplate({ to, contentSid, variables, messageId }: SendWhatsAppTemplateInput) {
  return sendTwilioWhatsApp({
    to,
    messageId,
    payload: {
      ContentSid: contentSid,
      ContentVariables: JSON.stringify(variables),
    },
  })
}

async function sendTwilioWhatsApp({ to, payload, messageId }: {
  to: string
  payload: Record<string, string>
  messageId?: string
}) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM

  if (!accountSid || !authToken || !from) {
    throw new Error('WhatsApp no está configurado; no se envió el mensaje.')
  }

  const toWhatsApp = formatWhatsAppNumber(to)
  if (!toWhatsApp) {
    throw new Error('El teléfono no es válido; no se envió el mensaje.')
  }

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
  const form = new URLSearchParams({
    From: from,
    To: toWhatsApp,
    StatusCallback: whatsappWebhookUrl('/api/whatsapp/status') + (messageId ? `?message_id=${encodeURIComponent(messageId)}` : ''),
    ...payload,
  })

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
    signal: AbortSignal.timeout(15000),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error('Twilio no aceptó el mensaje. Revisa la configuración y el historial del proveedor.')
  }

  if (typeof result.sid !== 'string' || !/^SM[0-9a-f]{32}$/i.test(result.sid)
    || !['accepted','queued','sending','sent','delivered','read'].includes(result.status)) {
    throw new Error('Twilio no confirmó el envío. Revisa el historial antes de reenviar.')
  }

  return { skipped: false, sid: result.sid as string, status: result.status as string }
}

function formatWhatsAppNumber(phone: string) {
  try { return `whatsapp:+${normalizeWhatsAppPhone(phone)}` } catch { return null }
}
import { normalizeWhatsAppPhone, whatsappWebhookUrl } from './security'
