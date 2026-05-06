"use server"

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_STRIPE_ACCOUNT_ID } from '@/lib/stripe/config'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')
}

function parseMoney(value: FormDataEntryValue | null, fallback: number) {
  const parsed = parseFloat(String(value ?? ''))
  return Number.isFinite(parsed) ? parsed : fallback
}

export async function saveStripeSettings(formData: FormData) {
  await requireAuth()
  const admin = createAdminClient()

  const payload = {
    id: true,
    enabled: formData.get('enabled') === 'on',
    mode: formData.get('mode') === 'live' ? 'live' : 'test',
    stripe_account_id: String(formData.get('stripe_account_id') || DEFAULT_STRIPE_ACCOUNT_ID).trim(),
    commission_payer: formData.get('commission_payer') === 'customer' ? 'customer' : 'merchant',
    fee_percent: parseMoney(formData.get('fee_percent'), 3.6),
    fixed_fee_amount: parseMoney(formData.get('fixed_fee_amount'), 3),
    minimum_payment_amount: parseMoney(formData.get('minimum_payment_amount'), 100),
    updated_at: new Date().toISOString(),
  }

  if (payload.fee_percent < 0) throw new Error('La comisión porcentual no puede ser negativa.')
  if (payload.fixed_fee_amount < 0) throw new Error('La comisión fija no puede ser negativa.')
  if (payload.minimum_payment_amount < 1) throw new Error('El mínimo global debe ser mayor a 0.')

  const { error } = await admin
    .from('stripe_settings')
    .upsert(payload, { onConflict: 'id' })

  if (error) throw new Error(error.message)

  revalidatePath('/admin/settings/stripe')
}
