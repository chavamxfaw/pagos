import 'server-only'

export async function logActivity(
  admin: {
    from: (table: string) => {
      insert: (values: Record<string, unknown>) => PromiseLike<{ error: { message: string } | null }>
    }
  },
  values: {
    entity_type: 'client' | 'order' | 'payment'
    entity_id: string
    client_id?: string | null
    order_id?: string | null
    payment_id?: string | null
    event_type: string
    message: string
    metadata?: Record<string, unknown>
  }
) {
  const { error } = await admin.from('activity_logs').insert({
    ...values,
    metadata: values.metadata ?? {},
  })

  if (error) {
    console.error('Error registrando actividad:', error.message)
  }
}
