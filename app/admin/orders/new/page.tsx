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
      amount: parseFloat(formData.get('amount') as string),
      description: (formData.get('description') as string) || undefined,
      requires_invoice: formData.get('requires_invoice') === 'on',
      tax_mode: formData.get('tax_mode') as 'included' | 'added' | undefined,
      issued_at: formData.get('issued_at') as string,
      due_date: (formData.get('due_date') as string) || undefined,
      bank_account_id: getBankAccountId(formData),
      stripe_enabled: formData.get('stripe_enabled') === 'on',
      stripe_payment_mode: getStripePaymentMode(formData),
      stripe_min_payment_amount: getOptionalMoney(formData, 'stripe_min_payment_amount'),
      stripe_fixed_payment_amounts: getStripeFixedAmounts(formData),
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

  const { data: bankAccounts } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (!clients?.length) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href="/admin/orders" className="text-[#6B7280] hover:text-[#1A1F36] text-sm transition-colors">
            ← Órdenes
          </Link>
          <h1 className="text-2xl font-bold text-[#1A1F36] mt-2">Nueva orden</h1>
        </div>
        <div className="bg-white border border-[#E6EAF0] rounded-xl p-8 text-center">
          <p className="text-[#6B7280] mb-4">Necesitas al menos un cliente para crear una orden.</p>
          <Link href="/admin/clients/new" className="text-[#2ED39A] hover:text-[#26BA88]">
            Crear primer cliente →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href="/admin/orders" className="text-[#6B7280] hover:text-[#1A1F36] text-sm transition-colors">
          ← Órdenes
        </Link>
        <h1 className="text-2xl font-bold text-[#1A1F36] mt-2">Nueva orden</h1>
      </div>

      <div className="bg-white border border-[#E6EAF0] rounded-xl p-6">
        <OrderForm
          action={createOrderAction}
          clients={clients}
          bankAccounts={bankAccounts ?? []}
          defaultClientId={defaultClientId}
        />
      </div>
    </div>
  )
}

function getBankAccountId(formData: FormData) {
  const value = formData.get('bank_account_id') as string | null
  return value && value !== 'none' ? value : undefined
}

function getStripePaymentMode(formData: FormData) {
  return formData.get('stripe_payment_mode') === 'fixed_amounts' ? 'fixed_amounts' : 'customer_amount'
}

function getOptionalMoney(formData: FormData, key: string) {
  const value = parseFloat(String(formData.get(key) ?? ''))
  return Number.isFinite(value) && value > 0 ? value : null
}

function getStripeFixedAmounts(formData: FormData) {
  return String(formData.get('stripe_fixed_payment_amounts') ?? '')
    .split(',')
    .map((value) => parseFloat(value.trim()))
    .filter((value) => Number.isFinite(value) && value > 0)
}
