'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'

export async function resolveReceiptDelivery(input: {
  paymentId: string; channel: string; updatedAt: string
  resolution: string; reference: string; note: string
}) {
  const actor = await requireAdmin()
  if (!/^[0-9a-f-]{36}$/i.test(input.paymentId) || !['email','whatsapp'].includes(input.channel)
    || !['sent','skipped'].includes(input.resolution) || !Number.isFinite(Date.parse(input.updatedAt))
    || typeof input.note !== 'string' || input.note.trim().length < 10 || input.note.length > 500
    || typeof input.reference !== 'string' || input.reference.length > 200
    || (input.resolution === 'sent' && input.reference.trim().length < 3)) {
    throw new Error('Agrega el resultado, la referencia del proveedor y una nota de revisión válida.')
  }
  const { error } = await createAdminClient().rpc('resolve_receipt_delivery', {
    p_payment_id: input.paymentId, p_channel: input.channel, p_expected_updated_at: input.updatedAt,
    p_resolution: input.resolution, p_reference: input.reference.trim(), p_note: input.note.trim(), p_actor_id: actor.id,
  })
  if (error) throw new Error('No se pudo guardar la revisión. El estado pudo cambiar; actualiza antes de volver a intentar.')
  revalidatePath('/admin/messages')
}
