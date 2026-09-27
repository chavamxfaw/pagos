import { Resend } from 'resend'

type SendEmail = Resend['emails']['send']

// The SDK resolves API rejections as { error }, not necessarily a rejected
// promise. Every caller must stop before recording a successful delivery.
export async function sendEmailChecked(send: SendEmail, ...args: Parameters<SendEmail>) {
  try {
    const result = await send(...args)
    if (result.error || !result.data?.id) throw new Error('Missing acknowledgement')
    return result
  } catch {
    throw new Error('El proveedor no confirmó el envío del correo. Revisa el estado antes de reenviar.')
  }
}

// Optional integrations must not crash order pages merely by being imported.
// A send still fails explicitly when the provider has not been configured.
export const resend = {
  get emails() {
    const key=process.env.RESEND_API_KEY
    if(!key)throw new Error('El envío de correo no está configurado.')
    const emails = new Resend(key).emails
    return { send: (...args: Parameters<SendEmail>) => sendEmailChecked(emails.send.bind(emails), ...args) }
  },
}
