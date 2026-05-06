import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
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

export function calculateStripeFee(amount: number, settings: Pick<StripeSettings, 'fee_percent' | 'fixed_fee_amount'>) {
  const fee = amount * (settings.fee_percent / 100) + settings.fixed_fee_amount
  return roundMoney(fee)
}

export function calculateStripeChargeAmount(amount: number, settings: Pick<StripeSettings, 'commission_payer' | 'fee_percent' | 'fixed_fee_amount'>) {
  const fee = calculateStripeFee(amount, settings)
  const totalCharged = settings.commission_payer === 'customer' ? amount + fee : amount

  return {
    paymentAmount: roundMoney(amount),
    feeAmount: settings.commission_payer === 'customer' ? fee : 0,
    absorbedFee: settings.commission_payer === 'merchant' ? fee : 0,
    totalCharged: roundMoney(totalCharged),
  }
}

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}
