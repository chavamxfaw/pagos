import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { createClient } from '@/lib/supabase/server'
import { updateOrder } from '@/actions/orders'
import { OrderForm } from '@/components/admin/OrderForm'
import { requireAdmin } from '@/lib/auth/admin'
import { failedOrderQueries, OrderQueryError } from '../../QueryError'
import type { Order, OrderStatus } from '@/types'

type State = { error?: string } | null

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await requireAdmin()
  const supabase = await createClient()
  const { data: projects, error: projectsError } = await supabase.from('crm_projects').select('id,title,client_id').eq('owner_user_id', user.id).order('title')

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  const orderFailures = failedOrderQueries('edit', [{ label: 'orden', error: orderError }])
  if (orderFailures.length) return <OrderQueryError title="Editar orden" resources={orderFailures} retryHref={`/admin/orders/${id}/edit`} />
  if (!order) notFound()

  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('*')
    .order('name')

  const { data: bankAccounts, error: banksError } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  const { data: fiscalDocuments, error: fiscalError } = await supabase
    .from('fiscal_documents')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  const failures = failedOrderQueries('edit', [{ label: 'contactos', error: clientsError }, { label: 'proyectos', error: projectsError }, { label: 'cuentas bancarias', error: banksError }, { label: 'documentos fiscales', error: fiscalError }])
  if (failures.length) return <OrderQueryError title="Editar orden" resources={failures} retryHref={`/admin/orders/${id}/edit`} />

  async function updateOrderAction(prevState: State, formData: FormData): Promise<State> {
    'use server'
    try {
      await updateOrder(id, {
        client_id: formData.get('client_id') as string,
        crm_project_id: (formData.get('crm_project_id') as string) || null,
        concept: formData.get('concept') as string,
        category: formData.get('category') as never,
        tags: formData.get('tags') as string,
        amount: parseFloat(formData.get('amount') as string),
        description: (formData.get('description') as string) || undefined,
        requires_invoice: formData.get('requires_invoice') === 'on',
        tax_mode: formData.get('tax_mode') as 'included' | 'added' | undefined,
        issued_at: formData.get('issued_at') as string,
        due_date: (formData.get('due_date') as string) || undefined,
        payment_reminder_enabled: formData.get('payment_reminder_enabled') === 'on',
        payment_reminder_days_before: Number(formData.get('payment_reminder_days_before') ?? 1),
        notify_email_enabled: formData.get('notify_email_enabled') === 'on',
        notify_whatsapp_enabled: formData.get('notify_whatsapp_enabled') === 'on',
        bank_account_id: getBankAccountId(formData),
        public_sort_order: Number(formData.get('public_sort_order') ?? 100),
        public_show_fiscal_document: formData.get('public_show_fiscal_document') === 'on',
        fiscal_document_id: getFiscalDocumentId(formData),
        status: getStatusValue(formData.get('status') as string | null),
      })
      redirect(`/admin/orders/${id}`)
    } catch (e: unknown) {
      if (isRedirectError(e)) throw e
      return { error: e instanceof Error ? e.message : 'Error al actualizar orden' }
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-4 md:p-8">
      <div className="mb-7">
        <Link
          href={`/admin/orders/${id}`}
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          ← {order.concept}
        </Link>
        <h1 className="text-2xl font-heading font-semibold text-foreground mt-2">Editar orden</h1>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <OrderForm
          action={updateOrderAction}
          clients={clients ?? []}
          bankAccounts={bankAccounts ?? []}
          fiscalDocuments={fiscalDocuments ?? []}
          defaultValues={order as Order}
          defaultProjectId={order.crm_project_id ?? undefined}
          projects={projects ?? []}
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

function getBankAccountId(formData: FormData) {
  const value = formData.get('bank_account_id') as string | null
  return value && value !== 'none' ? value : undefined
}

function getFiscalDocumentId(formData: FormData) {
  const value = formData.get('fiscal_document_id') as string | null
  return value && value !== 'none' ? value : undefined
}
