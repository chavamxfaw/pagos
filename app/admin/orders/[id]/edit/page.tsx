import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { createClient } from '@/lib/supabase/server'
import { updateOrder } from '@/actions/orders'
import { OrderForm } from '@/components/admin/OrderForm'
import type { Order, OrderStatus } from '@/types'

type State = { error?: string } | null

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (!order) notFound()

  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('name')

  async function updateOrderAction(prevState: State, formData: FormData): Promise<State> {
    'use server'
    try {
      await updateOrder(id, {
        client_id: formData.get('client_id') as string,
        concept: formData.get('concept') as string,
        amount: parseFloat(formData.get('amount') as string),
        description: (formData.get('description') as string) || undefined,
        requires_invoice: formData.get('requires_invoice') === 'on',
        tax_mode: formData.get('tax_mode') as 'included' | 'added' | undefined,
        issued_at: formData.get('issued_at') as string,
        due_date: (formData.get('due_date') as string) || undefined,
        status: getStatusValue(formData.get('status') as string | null),
      })
      redirect(`/admin/orders/${id}`)
    } catch (e: unknown) {
      if (isRedirectError(e)) throw e
      return { error: e instanceof Error ? e.message : 'Error al actualizar orden' }
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-7">
        <Link
          href={`/admin/orders/${id}`}
          className="text-[#6B7280] hover:text-[#1A1F36] text-sm transition-colors"
        >
          ← {order.concept}
        </Link>
        <h1 className="text-2xl font-heading font-semibold text-[#1A1F36] mt-2">Editar orden</h1>
      </div>

      <div className="bg-white border border-[#E6EAF0] rounded-xl p-6">
        <OrderForm
          action={updateOrderAction}
          clients={clients ?? []}
          defaultValues={order as Order}
          submitLabel="Guardar cambios"
        />
      </div>
    </div>
  )
}

function getStatusValue(value: string | null): OrderStatus | undefined {
  if (!value || value === 'auto') return undefined
  return value as OrderStatus
}
