import 'server-only'
import type { createAdminClient } from '@/lib/supabase/admin'
type Admin = ReturnType<typeof createAdminClient>

export async function deliverReceiptOnce(admin: Admin,paymentId: string,channel: 'email'|'whatsapp',enabled:boolean,send:()=>Promise<string|undefined>) {
  const {data,error} = await admin.from('payment_receipt_deliveries').update({status:enabled?'sending':'skipped',updated_at:new Date().toISOString()})
    .eq('payment_id',paymentId).eq('channel',channel).eq('status','pending').select('payment_id').maybeSingle()
  if(error) throw new Error('Receipt queue is unavailable')
  if(!data||!enabled) return
  try {
    const providerId = await send()
    const {error:persistError} = await admin.from('payment_receipt_deliveries').update({status:'sent',provider_id:providerId||null,updated_at:new Date().toISOString()}).eq('payment_id',paymentId).eq('channel',channel).eq('status','sending')
    if(persistError) throw new Error('Receipt acknowledgement unavailable')
  } catch {
    // A provider timeout is ambiguous; manual reconciliation prevents duplicate communication.
    await admin.from('payment_receipt_deliveries').update({status:'unknown',updated_at:new Date().toISOString()}).eq('payment_id',paymentId).eq('channel',channel).eq('status','sending')
  }
}
