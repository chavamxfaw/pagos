"use server"

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/admin'
import { sendWhatsAppMessage, sendWhatsAppTemplate } from '@/lib/whatsapp/client'
import { logActivity } from '@/lib/activity'
import { buildBankInstructionsMessage } from '@/lib/bank-instructions'
import { formatCurrency } from '@/lib/utils'
import type { BankAccount, OrderWithClient } from '@/types'

async function requireAuth() {
  return requireAdmin()
}

function clean(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim()
  return text || null
}

function getBankAccountPayload(formData: FormData) {
  const alias = clean(formData.get('alias'))
  const bankName = clean(formData.get('bank_name'))
  const accountHolder = clean(formData.get('account_holder'))

  if (!alias) throw new Error('El alias es obligatorio.')
  if (!bankName) throw new Error('El banco es obligatorio.')
  if (!accountHolder) throw new Error('El titular es obligatorio.')

  return {
    alias,
    bank_name: bankName,
    account_holder: accountHolder,
    clabe: clean(formData.get('clabe')),
    account_number: clean(formData.get('account_number')),
    card_number: clean(formData.get('card_number')),
    instructions: clean(formData.get('instructions')),
    is_active: formData.get('is_active') === 'on',
    updated_at: new Date().toISOString(),
  }
}

export async function createBankAccount(formData: FormData) {
  await requireAuth()
  const admin = createAdminClient()
  const payload = getBankAccountPayload(formData)

  const { error } = await admin
    .from('bank_accounts')
    .insert(payload)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/settings/bank-accounts')
}

export async function updateBankAccount(bankAccountId: string, formData: FormData) {
  await requireAuth()
  const admin = createAdminClient()
  const payload = getBankAccountPayload(formData)

  const { error } = await admin
    .from('bank_accounts')
    .update(payload)
    .eq('id', bankAccountId)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/settings/bank-accounts')
  revalidatePath('/admin/orders')
}

export async function deleteBankAccount(bankAccountId: string) {
  await requireAuth()
  const admin = createAdminClient()

  const { error } = await admin
    .from('bank_accounts')
    .delete()
    .eq('id', bankAccountId)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/settings/bank-accounts')
}

export async function sendBankInstructions(orderId: string, bankAccountId: string) {
  await requireAuth()
  const admin = createAdminClient()

  const [{ data: order, error: orderError }, { data: bankAccount, error: bankError }] = await Promise.all([
    admin
      .from('orders')
      .select('*, clients(*)')
      .eq('id', orderId)
      .single(),
    admin
      .from('bank_accounts')
      .select('*')
      .eq('id', bankAccountId)
      .single(),
  ])

  if (orderError || !order) throw new Error(orderError?.message ?? 'Orden no encontrada')
  if (bankError || !bankAccount) throw new Error(bankError?.message ?? 'Cuenta bancaria no encontrada')

  const typedOrder = order as OrderWithClient
  const typedBankAccount = bankAccount as BankAccount

  if (!typedOrder.clients.phone) {
    throw new Error('El cliente no tiene teléfono registrado.')
  }

  const message = buildBankInstructionsMessage({
    order: typedOrder,
    bankAccount: typedBankAccount,
    appUrl: process.env.NEXT_PUBLIC_APP_URL!,
  })

  const contentSid = process.env.TWILIO_PAYMENT_INSTRUCTIONS_CONTENT_SID
  if (contentSid) {
    const remaining = Math.max(0, typedOrder.total_amount - typedOrder.paid_amount)
    await sendWhatsAppTemplate({
      to: typedOrder.clients.phone,
      contentSid,
      variables: {
        '1': typedOrder.clients.name,
        '2': typedOrder.concept,
        '3': formatCurrency(remaining),
        '4': typedBankAccount.bank_name,
        '5': typedBankAccount.account_holder,
        '6': typedBankAccount.clabe ?? typedBankAccount.account_number ?? typedBankAccount.card_number ?? 'No disponible',
        '7': typedOrder.token,
      },
    })
  } else {
    await sendWhatsAppMessage({ to: typedOrder.clients.phone, body: message })
  }

  await logActivity(admin, {
    entity_type: 'order',
    entity_id: orderId,
    client_id: typedOrder.client_id,
    order_id: orderId,
    event_type: 'bank_instructions_sent',
    message: `Datos bancarios enviados por WhatsApp: ${typedBankAccount.alias}`,
    metadata: { bank_account_id: bankAccountId },
  })

  revalidatePath(`/admin/orders/${orderId}`)
  revalidatePath(`/admin/clients/${typedOrder.client_id}`)
}
