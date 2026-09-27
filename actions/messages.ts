'use server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/admin'
import { prepareContactMessage, sendContactMessage, type MessageInput } from '@/lib/whatsapp/messages'

export async function previewMessage(input: MessageInput) {
  const user = await requireAdmin()
  const preview = await prepareContactMessage(user.id,input)
  return {body:preview.body,blocked:preview.blocked,template:Boolean(preview.template),identityWarning:preview.identityWarning}
}
export async function sendMessage(input: MessageInput) {
  const user = await requireAdmin()
  const result = await sendContactMessage(user.id,input)
  revalidatePath('/admin/messages')
  revalidatePath(`/admin/clients/${input.clientId}`)
  return result
}
