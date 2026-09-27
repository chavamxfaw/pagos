import twilio from 'twilio'

// Twilio's documented form-webhook signature protocol. Never trust forwarded host headers.
export function verifyTwilioSignature(url: string, params: URLSearchParams, signature: string, token: string) {
  if (!signature || !token) return false
  const keys = [...new Set(params.keys())].sort()
  if (keys.some((key) => params.getAll(key).length !== 1)) return false
  return twilio.validateRequest(token,signature,url,Object.fromEntries(params))
}

export function normalizeWhatsAppPhone(value: string) {
  const digits = value.replace(/^whatsapp:/, '').replace(/\D/g, '')
  if (digits.length === 10) return `52${digits}`
  if (digits.length === 13 && digits.startsWith('521')) return `52${digits.slice(3)}`
  if (!/^[1-9]\d{7,14}$/.test(digits)) throw new Error('Teléfono inválido')
  return digits
}

export function whatsappWebhookUrl(path: '/api/whatsapp/inbound' | '/api/whatsapp/status') {
  const origin = process.env.TWILIO_WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL
  if (!origin) throw new Error('WhatsApp webhook URL is not configured')
  const url = new URL(path, origin)
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') throw new Error('HTTPS is required')
  return url.toString()
}

export async function readVerifiedTwilioForm(request: Request, path: '/api/whatsapp/inbound' | '/api/whatsapp/status') {
  if (!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) return null
  const reader = request.body?.getReader()
  if (!reader) return null
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const chunk = await reader.read()
    if (chunk.done) break
    size += chunk.value.length
    if (size > 65536) { await reader.cancel(); return null }
    chunks.push(chunk.value)
  }
  const params = new URLSearchParams(Buffer.concat(chunks).toString('utf8'))
  const verified = verifyTwilioSignature(whatsappWebhookUrl(path) + new URL(request.url).search, params,
    request.headers.get('x-twilio-signature') ?? '', process.env.TWILIO_AUTH_TOKEN ?? '')
  if (!verified || params.get('AccountSid') !== process.env.TWILIO_ACCOUNT_SID) return null
  return params
}
