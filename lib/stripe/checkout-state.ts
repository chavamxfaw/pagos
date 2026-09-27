import type Stripe from 'stripe'

export const reconciliationMessage = 'Hay un pago en proceso de confirmación. Espera antes de volver a pagar o cancelar la orden.'

// Only the signed webhook's transactional ledger operation may mark a checkout paid.
export function checkoutDisposition(session: Pick<Stripe.Checkout.Session, 'status' | 'url'>) {
  if (session.status === 'open' && session.url) return 'reuse'
  if (session.status === 'expired') return 'expired'
  return 'reconcile'
}

export function canRetryCreation(createdAt: string, now = Date.now()) {
  // Stripe may prune idempotency keys after 24h. Never retry an ambiguous creation past that boundary.
  const age = now - Date.parse(createdAt)
  return Number.isFinite(age) && age >= 0 && age < 23 * 60 * 60 * 1000
}
