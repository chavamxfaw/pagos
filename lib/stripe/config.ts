import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
export { calculateStripeChargeAmount, calculateStripeFee, roundMoney } from '@/lib/stripe/math'
import type { StripeSettings } from '@/types'

export const DEFAULT_STRIPE_ACCOUNT_ID = 'acct_1SHFKe2R4B7Tceo0'

export const DEFAULT_STRIPE_SETTINGS: StripeSettings = {
  id: true,
  enabled: false,
  mode: 'test',
  stripe_account_id: DEFAULT_STRIPE_ACCOUNT_ID,
  commission_payer: 'merchant',
  fee_percent: 3.6,
  fixed_fee_amount: 3,
  fee_tax_percent: 16,
  minimum_payment_amount: 100,
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
}

export async function getStripeSettings() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('stripe_settings')
    .select('*')
    .eq('id', true)
    .maybeSingle()

  if (error) {
    console.warn('Stripe settings table is not available yet:', error.message)
    return DEFAULT_STRIPE_SETTINGS
  }

  return (data as StripeSettings | null) ?? DEFAULT_STRIPE_SETTINGS
}
