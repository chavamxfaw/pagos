import { PaymentReceiptEmail } from '@/emails/PaymentReceiptEmail'
import { resend } from '@/lib/resend/client'
import { sendWhatsAppMessage, sendWhatsAppTemplate } from '@/lib/whatsapp/client'
import { formatCurrency, getPaymentMethodLabel } from '@/lib/utils'
import type { Client, Order, Payment } from '@/types'
import { deliverReceiptOnce } from './delivery'
import { normalizeWhatsAppPhone } from '@/lib/whatsapp/security'
import { getDefaultSenderName } from '@/lib/user-settings'

type AdminClient = ReturnType<typeof import('@/lib/supabase/admin').createAdminClient>

type OrderWithClient = Order & {
  clients: Client
}

type NotifyPaymentReceiptInput = {
  admin: AdminClient
  order: OrderWithClient
  payment: Payment
  senderName?: string
}

export async function notifyPaymentReceipt({
  admin,
  order,
  payment,
  senderName,
}: NotifyPaymentReceiptInput) {
  const resolvedSenderName = senderName?.trim() || await getDefaultSenderName()
  const emailEnabled = order.notify_email_enabled ?? true
  const whatsAppEnabled = order.notify_whatsapp_enabled ?? true
  const normalizedAppUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? ''
  const receiptLink = payment.receipt_token ? `${normalizedAppUrl}/r/${payment.receipt_token}` : undefined

  await deliverReceiptOnce(admin,payment.id,'email',Boolean(emailEnabled&&order.clients.email),async()=>{
      const result = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: order.clients.email!,
        subject: `Recibo de abono — ${order.concept}`,
        react: PaymentReceiptEmail({
          clientName: order.clients.name,
          concept: order.concept,
          paymentAmount: payment.amount,
          paymentDate: payment.paid_at ?? payment.created_at,
          paidAmount: order.paid_amount,
          totalAmount: order.total_amount,
          token: order.token,
          appUrl: process.env.NEXT_PUBLIC_APP_URL!,
          receiptToken: payment.receipt_token,
          senderName: resolvedSenderName,
        }),
      }, {idempotencyKey:`payment-receipt/${payment.id}`})
      if(result.error) throw new Error('Email delivery failed')
      return result.data?.id
  })

  await deliverReceiptOnce(admin,payment.id,'whatsapp',Boolean(whatsAppEnabled&&order.clients.phone),async()=>{
      const remaining = Math.max(0, order.total_amount - order.paid_amount)
      const statusLink = `${normalizedAppUrl}/p/${order.token}`
      const contentSid = process.env.TWILIO_PAYMENT_REMINDER_CONTENT_SID
      const receiptBody = [
        `Hola ${order.clients.name}, registramos tu abono de ${formatCurrency(payment.amount)} para ${order.concept}.`,
        `Método: ${getPaymentMethodLabel(payment.payment_method)}${payment.payment_reference ? ` (${payment.payment_reference})` : ''}.`,
        `Pagado: ${formatCurrency(order.paid_amount)} de ${formatCurrency(order.total_amount)}.`,
        remaining > 0 ? `Saldo pendiente: ${formatCurrency(remaining)}.` : 'Tu orden quedó liquidada.',
        `Consulta tu estado aquí: ${statusLink}`,
        receiptLink ? `Recibo del abono: ${receiptLink}` : '',
        `De parte de: ${resolvedSenderName}`,
      ].filter(Boolean).join('\n')
      const {data:message,error:messageError} = await admin.from('whatsapp_messages').insert({
        client_id:order.client_id,direction:'outbound',phone:normalizeWhatsAppPhone(order.clients.phone!),
        body:receiptBody,kind:'receipt',resource_id:payment.id,idempotency_key:`receipt:${payment.id}`,status:'sending',
      }).select('id').single()
      if(messageError) throw new Error('Receipt message could not be registered')
      const track = async (result: Awaited<ReturnType<typeof sendWhatsAppMessage>>) => {
        if(result.skipped) throw new Error('WhatsApp is not configured')
        const {error} = await admin.from('whatsapp_messages').update({provider_sid:result.sid}).eq('id',message.id)
        if(error) throw new Error('Receipt status could not be registered')
        const {error:statusError} = await admin.rpc('apply_whatsapp_status',{p_sid:result.sid,p_status:result.status,p_error:null})
        if(statusError) throw new Error('Receipt status unavailable')
        return result.sid
      }

      try {
      if (contentSid) {
        const result = await sendWhatsAppTemplate({
          to: order.clients.phone!,
          contentSid,
          messageId:message.id,
          variables: {
            '1': order.clients.name,
            '2': order.concept,
            '3': formatCurrency(order.total_amount),
            '4': formatCurrency(order.paid_amount),
            '5': formatCurrency(remaining),
            '6': order.token,
            '7': resolvedSenderName,
          },
        })
        return await track(result)
      } else {
        const result = await sendWhatsAppMessage({
          to: order.clients.phone!,
          body: receiptBody,
          messageId:message.id,
        })
        return await track(result)
      }
      } catch(error) {
        await admin.from('whatsapp_messages').update({status:'unknown'}).eq('id',message.id).eq('status','sending')
        throw error
      }
  })
}

export async function processPendingPaymentReceipts(admin: AdminClient,limit=25) {
  const {data,error} = await admin.from('payment_receipt_deliveries').select('payment_id').eq('status','pending').order('updated_at').limit(Math.min(limit,100))
  if(error) throw new Error('Receipt queue unavailable')
  let processed=0
  for(const id of new Set((data||[]).map(row=>row.payment_id))) {
    const {data:payment} = await admin.from('payments').select('*').eq('id',id).single()
    if(!payment) continue
    const {data:order} = await admin.from('orders').select('*,clients(*)').eq('id',payment.order_id).single()
    if(!order?.clients) continue
    await notifyPaymentReceipt({admin,payment,order}); processed++
  }
  return {processed}
}
