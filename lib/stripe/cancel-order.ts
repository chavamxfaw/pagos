import type { createAdminClient } from '@/lib/supabase/admin'
import { getStripeClient } from './client'
import { checkoutDisposition, reconciliationMessage } from './checkout-state'

export async function expireOrderCheckouts(admin: ReturnType<typeof createAdminClient>, orderId: string) {
  const { data, error } = await admin.from('stripe_checkout_sessions')
    .select('id,stripe_session_id,metadata').eq('order_id', orderId).eq('status', 'pending')
  if (error) throw new Error(reconciliationMessage)
  for (const checkout of data ?? []) {
    if (checkout.stripe_session_id.startsWith('creating:')) throw new Error(reconciliationMessage)
    try {
      // A legacy session lacking its mode must be reconciled manually, never expire in a guessed account.
      const mode = checkout.metadata?.mode
      if (mode !== 'test' && mode !== 'live') throw new Error('Unknown mode')
      const stripe = getStripeClient(mode)
      let session = await stripe.checkout.sessions.retrieve(checkout.stripe_session_id)
      if (session.status === 'open') session = await stripe.checkout.sessions.expire(session.id)
      if (checkoutDisposition(session) !== 'expired') throw new Error('Reconciliation pending')
      const { error: updateError } = await admin.from('stripe_checkout_sessions')
        .update({ status: 'expired' }).eq('id', checkout.id).eq('status', 'pending')
      if (updateError) throw new Error('Expiration pending')
    } catch {
      // Includes completion racing expiration: leave the order active so the signed webhook can record it.
      throw new Error(reconciliationMessage)
    }
  }
  // The database's cancellation guard checks again under the order lock to close the creation race.
}
