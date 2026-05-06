import 'server-only'

import Stripe from 'stripe'
import type { StripeSettings } from '@/types'

export function getStripeClient(mode: StripeSettings['mode'] = 'test') {
  const key = getStripeSecretKey(mode)
  if (!key) {
    throw new Error(`Falta la llave secreta de Stripe para modo ${mode}.`)
  }

  return new Stripe(key, {
    typescript: true,
  })
}

export function getStripeSecretKey(mode: StripeSettings['mode']) {
  if (mode === 'live') {
    return process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY
  }

  return process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY
}

export function getStripeWebhookSecrets() {
  return [
    process.env.STRIPE_WEBHOOK_SECRET_TEST || process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_WEBHOOK_SECRET_LIVE,
  ].filter(Boolean) as string[]
}
