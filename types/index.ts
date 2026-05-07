export type Client = {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  rfc: string | null
  address: string | null
  notes: string | null
  client_portal_token: string
  client_portal_enabled: boolean
  created_at: string
}

export type OrderStatus = 'pending' | 'partial' | 'completed' | 'cancelled' | 'paused' | 'disputed'
export type OrderTaxMode = 'none' | 'included' | 'added'
export type OrderCategory = 'service' | 'product' | 'project' | 'subscription' | 'other'
export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'check' | 'other'

export type Order = {
  id: string
  client_id: string
  concept: string
  description: string | null
  category: OrderCategory
  tags: string[]
  requires_invoice: boolean
  tax_mode: OrderTaxMode
  subtotal_amount: number
  tax_amount: number
  tax_rate: number
  total_amount: number
  paid_amount: number
  status: OrderStatus
  issued_at: string
  due_date: string | null
  bank_account_id: string | null
  token: string
  created_at: string
  completed_at: string | null
  cancelled_at: string | null
}

export type OrderWithClient = Order & {
  clients: Client
}

export type Payment = {
  id: string
  order_id: string
  amount: number
  concept: string
  payment_method: PaymentMethod
  payment_reference: string | null
  notes: string | null
  paid_at: string
  created_at: string
}

export type ClientWithOrderCount = Client & {
  active_orders_count: number
}

export type ActivityLog = {
  id: string
  entity_type: 'client' | 'order' | 'payment'
  entity_id: string
  client_id: string | null
  order_id: string | null
  payment_id: string | null
  event_type: string
  message: string
  metadata: Record<string, unknown>
  created_at: string
}

export type UserSettings = {
  user_id: string
  display_name: string | null
  admin_phone: string | null
  notify_stripe_email: boolean
  notify_stripe_whatsapp: boolean
  created_at: string
  updated_at: string
}

export type ClientFollowup = {
  id: string
  client_id: string
  note_type: 'note' | 'call' | 'promise' | 'reminder' | 'invoice'
  content: string
  follow_up_date: string | null
  created_at: string
}

export type BankAccount = {
  id: string
  alias: string
  bank_name: string
  account_holder: string
  clabe: string | null
  account_number: string | null
  card_number: string | null
  instructions: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type FiscalDocument = {
  id: string
  title: string
  description: string | null
  file_path: string
  file_name: string
  file_size: number
  mime_type: 'application/pdf'
  share_token: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type StripeSettings = {
  id: boolean
  enabled: boolean
  mode: 'test' | 'live'
  stripe_account_id: string | null
  commission_payer: 'merchant' | 'customer'
  fee_percent: number
  fixed_fee_amount: number
  minimum_payment_amount: number
  created_at: string
  updated_at: string
}

export type StripeCheckoutSession = {
  id: string
  order_id: string
  client_id: string
  payment_request_id: string | null
  stripe_session_id: string
  stripe_payment_intent_id: string | null
  amount: number
  fee_amount: number
  total_charged: number
  commission_payer: 'merchant' | 'customer'
  status: 'pending' | 'paid' | 'expired' | 'cancelled'
  created_at: string
  paid_at: string | null
  metadata: Record<string, unknown>
}

export type StripePaymentRequest = {
  id: string
  order_id: string
  client_id: string
  request_type: 'fixed' | 'open'
  amount: number | null
  minimum_amount: number | null
  concept: string
  status: 'pending' | 'paid' | 'cancelled' | 'expired'
  commission_payer: 'merchant' | 'customer'
  fee_amount: number
  total_charged: number
  requires_invoice: boolean
  tax_mode: 'none' | 'included' | 'added'
  notes: string | null
  expires_at: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}
