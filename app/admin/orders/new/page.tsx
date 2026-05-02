import Link from 'next/link'
import { redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { createClient } from '@/lib/supabase/server'
import { OrderForm } from '@/components/admin/OrderForm'
import { createOrder } from '@/actions/orders'

type State = { error?: string } | null

async function createOrderAction(prevState: State, formData: FormData): Promise<State> {
  'use server'
  try {
    const order = await createOrder({
      client_id: formData.get('client_id') as string,
      concept: formData.get('concept') as string,
      total_amount: parseFloat(formData.get('total_amount') as string),
      description: (formData.get('description') as string) || undefined,
    })
    redirect(`/admin/orders/${order.id}`)
  } catch (e: unknown) {
    if (isRedirectError(e)) throw e
    return { error: e instanceof Error ? e.message : 'Error al crear orden' }
  }
}

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>
}) {
  const { client: defaultClientId } = await searchParams
  const supabase = await createClient()

  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('name')

  if (!clients?.length) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href="/admin/orders" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
            ← Órdenes
          </Link>
          <h1 className="text-2xl font-bold text-zinc-50 mt-2">Nueva orden</h1>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
          <p className="text-zinc-400 mb-4">Necesitas al menos un cliente para crear una orden.</p>
          <Link href="/admin/clients/new" className="text-emerald-400 hover:text-emerald-300">
            Crear primer cliente →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href="/admin/orders" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
          ← Órdenes
        </Link>
        <h1 className="text-2xl font-bold text-zinc-50 mt-2">Nueva orden</h1>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <OrderForm
          action={createOrderAction}
          clients={clients}
          defaultClientId={defaultClientId}
        />
      </div>
    </div>
  )
}
