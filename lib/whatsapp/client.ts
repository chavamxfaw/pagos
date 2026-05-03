type SendWhatsAppMessageInput = {
  to: string
  body: string
}

type SendWhatsAppTemplateInput = {
  to: string
  contentSid: string
  variables: Record<string, string>
}

export async function sendWhatsAppMessage({ to, body }: SendWhatsAppMessageInput) {
  return sendTwilioWhatsApp({
    to,
    payload: { Body: body },
  })
}

export async function sendWhatsAppTemplate({ to, contentSid, variables }: SendWhatsAppTemplateInput) {
  return sendTwilioWhatsApp({
    to,
    payload: {
      ContentSid: contentSid,
      ContentVariables: JSON.stringify(variables),
    },
  })
}

async function sendTwilioWhatsApp({ to, payload }: {
  to: string
  payload: Record<string, string>
}) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM

  if (!accountSid || !authToken || !from) {
    return { skipped: true, reason: 'missing_twilio_config' as const }
  }

  const toWhatsApp = formatWhatsAppNumber(to)
  if (!toWhatsApp) {
    return { skipped: true, reason: 'invalid_phone' as const }
  }

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
  const form = new URLSearchParams({
    From: from,
    To: toWhatsApp,
    ...payload,
  })

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message ?? 'Error enviando WhatsApp')
  }

  return { skipped: false, sid: result.sid as string, status: result.status as string }
}

function formatWhatsAppNumber(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null

  const normalized = digits.startsWith('521') || digits.startsWith('52')
    ? digits
    : `521${digits}`

  return `whatsapp:+${normalized}`
}
