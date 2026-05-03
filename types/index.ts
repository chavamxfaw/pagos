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

export type OrderStatus = 'pending' | 'partial' | 'completed'
export type OrderTaxMode = 'none' | 'included' | 'added'
export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'check' | 'other'

export type Order = {
  id: string
  client_id: string
  concept: string
  description: string | null
  requires_invoice: boolean
  tax_mode: OrderTaxMode
  subtotal_amount: number
  tax_amount: number
  tax_rate: number
  total_amount: number
  paid_amount: number
  status: OrderStatus
  token: string
  created_at: string
  completed_at: string | null
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
  created_at: string
}

export type ClientWithOrderCount = Client & {
  active_orders_count: number
}
