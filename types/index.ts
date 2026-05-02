export type Client = {
  id: string
  name: string
  email: string
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

export type Order = {
  id: string
  client_id: string
  concept: string
  description: string | null
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
  notes: string | null
  created_at: string
}

export type ClientWithOrderCount = Client & {
  active_orders_count: number
}
