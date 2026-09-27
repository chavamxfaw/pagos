import 'server-only'

import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logActivity } from '@/lib/activity'
import { notifyPaymentReceipt } from '@/lib/payments/notifications'
import { enforceIpRateLimit } from '@/lib/security/rate-limit'
import { getTodayDateString } from '@/lib/utils'
import type { OrderCategory, PaymentMethod } from '@/types'
import { validateOrderProject } from '@/lib/crm/service'

export type AgentContext = {
  admin: ReturnType<typeof createAdminClient>
  actor: string
  ownerId: string
}

export type AgentOrderInput = {
  client_id?: unknown
  concept?: unknown
  description?: unknown
  category?: unknown
  tags?: unknown
  amount?: unknown
  issued_at?: unknown
  due_date?: unknown
  payment_reminder_enabled?: unknown
  payment_reminder_days_before?: unknown
  bank_account_id?: unknown
  requires_invoice?: unknown
  tax_mode?: unknown
  crm_project_id?: unknown
}

const ORDER_CATEGORIES = new Set<OrderCategory>(['service', 'product', 'project', 'subscription', 'other'])
const PAYMENT_METHODS = new Set<PaymentMethod>(['cash', 'transfer', 'card', 'check', 'other'])

export async function requireAgent(request: Request): Promise<AgentContext | NextResponse> {
  const rateLimitResponse = await enforceIpRateLimit({
    request,
    scope: 'agent_api',
    limit: 120,
    windowSeconds: 60,
    blockSeconds: 900,
    failClosed: process.env.NODE_ENV === 'production',
  })

  if (rateLimitResponse) return rateLimitResponse

  const configuredKey = process.env.OTLA_AGENT_API_KEY
  if (!configuredKey) {
    return jsonError('Agent API key is not configured', 500)
  }

  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : ''

  if (!safeEqual(token, configuredKey)) {
    return jsonError('Unauthorized', 401)
  }

  const admin = createAdminClient()
  const ownerId = process.env.OTLA_AGENT_OWNER_ID
  // Explicit owner binding; adding another admin never expands the agent's identity.
  if (!ownerId) return jsonError('Agent owner is not configured', 503)
  const { data: owner, error } = await admin.from('app_admin_users').select('user_id').eq('user_id', ownerId).maybeSingle()
  if (error || !owner) return jsonError('Agent owner is unavailable', 503)
  return { admin, actor: 'openclaw', ownerId: owner.user_id }
}

export function jsonOk(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      'Cache-Control': 'no-store',
      ...init?.headers,
    },
  })
}

export function jsonError(message: string, status = 400) {
  return jsonOk({ error: message }, { status })
}

export async function readJsonObject(request: Request) {
  try {
    const {readLimitedText}=await import('@/lib/security/request-body')
    const body = JSON.parse(await readLimitedText(request))
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return null
    }
    return body as Record<string, unknown>
  } catch {
    return null
  }
}

export function normalizePhone(value: unknown) {
  if (value == null) return null
  const digits = String(value).replace(/\D/g, '')
  return digits || null
}

export function normalizeOptionalString(value: unknown, maxLength = 500) {
  if (value == null) return null
  const text = String(value).trim()
  if (!text) return null
  return text.slice(0, maxLength)
}

export function requireString(value: unknown, label: string, maxLength = 180) {
  const text = normalizeOptionalString(value, maxLength)
  if (!text) throw new Error(`${label} es requerido`)
  return text
}

export function requirePositiveAmount(value: unknown, label = 'amount') {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${label} debe ser mayor a 0`)
  }
  return roundMoney(amount)
}

export function getOptionalDate(value: unknown, label: string) {
  if (value == null || value === '') return null
  const text = String(value).trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new Error(`${label} debe tener formato YYYY-MM-DD`)
  }
  return text
}

export function getPaymentMethod(value: unknown): PaymentMethod {
  const method = String(value || 'transfer') as PaymentMethod
  if (!PAYMENT_METHODS.has(method)) {
    throw new Error('payment_method no es válido')
  }
  return method
}

export function normalizeOrderPayload(body: AgentOrderInput) {
  const amount = requirePositiveAmount(body.amount)
  const requiresInvoice = Boolean(body.requires_invoice)
  const taxMode = body.tax_mode === 'included' || body.tax_mode === 'added' ? body.tax_mode : undefined

  return {
    client_id: requireString(body.client_id, 'client_id', 80),
    concept: requireString(body.concept, 'concept', 180),
    description: normalizeOptionalString(body.description, 1200),
    category: getOrderCategory(body.category),
    tags: normalizeTags(body.tags),
    issued_at: getOptionalDate(body.issued_at, 'issued_at') || getTodayDateString(),
    due_date: getOptionalDate(body.due_date, 'due_date'),
    payment_reminder_enabled: Boolean(body.payment_reminder_enabled),
    payment_reminder_days_before: getReminderDaysBefore(body.payment_reminder_days_before),
    bank_account_id: normalizeOptionalString(body.bank_account_id, 80),
    amount,
    ...calculateOrderAmounts({
      amount,
      requiresInvoice,
      taxMode,
    }),
  }
}

export async function createAgentOrder(
  context: AgentContext,
  body: AgentOrderInput
) {
  const data = normalizeOrderPayload(body)
  const projectId = await validateOrderProject({db:context.admin,ownerId:context.ownerId},body.crm_project_id,data.client_id)

  const { data: client, error: clientError } = await context.admin
    .from('clients')
    .select('id, name')
    .eq('id', data.client_id)
    .single()

  if (clientError || !client) {
    throw new Error('Cliente no encontrado')
  }

  const { data: order, error } = await context.admin
    .from('orders')
    .insert({
      client_id: data.client_id,
      crm_project_id: projectId,
      concept: data.concept,
      description: data.description,
      category: data.category,
      tags: data.tags,
      issued_at: data.issued_at,
      due_date: data.due_date,
      payment_reminder_enabled: Boolean(data.due_date && data.payment_reminder_enabled),
      payment_reminder_days_before: data.payment_reminder_days_before,
      payment_reminder_last_sent_on: null,
      bank_account_id: data.bank_account_id,
      public_sort_order: 100,
      public_show_fiscal_document: false,
      fiscal_document_id: null,
      total_amount: data.total_amount,
      requires_invoice: data.requires_invoice,
      tax_mode: data.tax_mode,
      subtotal_amount: data.subtotal_amount,
      tax_amount: data.tax_amount,
      tax_rate: data.tax_rate,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  await logActivity(context.admin, {
    entity_type: 'order',
    entity_id: order.id,
    client_id: data.client_id,
    order_id: order.id,
    event_type: 'agent_order_created',
    message: `Orden creada por agente: ${data.concept}`,
    metadata: {
      actor: context.actor,
      total_amount: data.total_amount,
      client_name: client.name,
    },
  })

  return {
    ...order,
    clients: client,
  }
}

export async function createAgentPayment(
  context: AgentContext,
  body: Record<string, unknown>,
  idempotencyKey: string
) {
  const orderId = requireString(body.order_id, 'order_id', 80)
  const amount = requirePositiveAmount(body.amount)
  const concept = normalizeOptionalString(body.concept, 180) || 'Abono registrado por agente'
  const paymentMethod = getPaymentMethod(body.payment_method)
  const paidAt = getOptionalDate(body.paid_at, 'paid_at') || getTodayDateString()

  if (paidAt > getTodayDateString()) {
    throw new Error('paid_at no puede ser una fecha futura')
  }

  if (!/^[A-Za-z0-9:_-]{16,128}$/.test(idempotencyKey)) throw new Error('Idempotency-Key es requerido (16–128 caracteres)')
  const { data: result, error } = await context.admin.rpc('record_agent_payment', {
    p_key: idempotencyKey,
    p_actor: context.ownerId,
    p_payload: {
      order_id: orderId,
      amount,
      concept,
      payment_method: paymentMethod,
      payment_reference: normalizeOptionalString(body.payment_reference, 180),
      notes: normalizeOptionalString(body.notes, 1200),
      paid_at: paidAt,
    },
  })

  if (error) throw new Error('No se pudo registrar el abono. Verifica saldo e idempotencia.')
  const payment = result.payment

  const { data: updatedOrder } = await context.admin
    .from('orders')
    .select('*, clients(*)')
    .eq('id', orderId)
    .single()

  if (!result.replayed) await logActivity(context.admin, {
    entity_type: 'payment',
    entity_id: payment.id,
    client_id: updatedOrder?.client_id,
    order_id: orderId,
    payment_id: payment.id,
    event_type: 'agent_payment_created',
    message: `Abono registrado por agente: ${amount.toFixed(2)}`,
    metadata: {
      actor: context.actor,
      actor_id: context.ownerId,
      amount,
      payment_method: paymentMethod,
      paid_at: paidAt,
    },
  })

  if (updatedOrder?.clients) {
    await notifyPaymentReceipt({
      admin: context.admin,
      order: updatedOrder,
      payment,
    })
  }

  return payment
}

function safeEqual(a: string, b: string) {
  if (!a || !b) return false
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return crypto.timingSafeEqual(left, right)
}

function normalizeTags(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((tag) => String(tag).trim())
      .filter(Boolean)
      .slice(0, 20)
  }

  return String(value ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 20)
}

function getOrderCategory(value: unknown): OrderCategory {
  const category = String(value || 'service') as OrderCategory
  return ORDER_CATEGORIES.has(category) ? category : 'service'
}

function getReminderDaysBefore(value: unknown) {
  const days = Number(value ?? 1)
  if (!Number.isFinite(days)) return 1
  return Math.min(30, Math.max(0, Math.floor(days)))
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
