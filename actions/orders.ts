"use server"

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')
  return user
}

export async function createOrder(data: {
  client_id: string
  concept: string
  description?: string
  amount: number
  requires_invoice?: boolean
  tax_mode?: 'included' | 'added'
}) {
  await requireAuth()
  const admin = createAdminClient()
  const amounts = calculateOrderAmounts({
    amount: data.amount,
    requiresInvoice: data.requires_invoice ?? false,
    taxMode: data.tax_mode,
  })

  const { data: order, error } = await admin
    .from('orders')
    .insert({
      client_id: data.client_id,
      concept: data.concept,
      description: data.description,
      ...amounts,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/admin/orders')
  revalidatePath(`/admin/clients/${data.client_id}`)
  return order
}

function calculateOrderAmounts({
  amount,
  requiresInvoice,
  taxMode,
}: {
  amount: number
  requiresInvoice: boolean
  taxMode?: 'included' | 'added'
}) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('El monto debe ser mayor a 0')
  }

  if (!requiresInvoice) {
    return {
      total_amount: roundMoney(amount),
      requires_invoice: false,
      tax_mode: 'none',
      subtotal_amount: roundMoney(amount),
      tax_amount: 0,
      tax_rate: 0,
    }
  }

  const rate = 0.16
  if (taxMode === 'included') {
    const subtotal = amount / (1 + rate)
    const tax = amount - subtotal
    return {
      total_amount: roundMoney(amount),
      requires_invoice: true,
      tax_mode: 'included',
      subtotal_amount: roundMoney(subtotal),
      tax_amount: roundMoney(tax),
      tax_rate: rate,
    }
  }

  const subtotal = amount
  const tax = subtotal * rate
  return {
    total_amount: roundMoney(subtotal + tax),
    requires_invoice: true,
    tax_mode: 'added',
    subtotal_amount: roundMoney(subtotal),
    tax_amount: roundMoney(tax),
    tax_rate: rate,
  }
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

export async function markOrderCompleted(orderId: string) {
  await requireAuth()
  const admin = createAdminClient()

  const { error } = await admin
    .from('orders')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', orderId)

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/orders/${orderId}`)
  revalidatePath('/admin/orders')
  revalidatePath('/admin')
}

export async function deleteOrder(orderId: string, clientId: string) {
  await requireAuth()
  const admin = createAdminClient()

  const { error } = await admin
    .from('orders')
    .delete()
    .eq('id', orderId)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/orders')
  revalidatePath(`/admin/clients/${clientId}`)
  revalidatePath('/admin')
}
