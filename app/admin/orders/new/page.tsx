import Link from 'next/link'
import { redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { createClient } from '@/lib/supabase/server'
import { OrderForm } from '@/components/admin/OrderForm'
import { createOrder } from '@/actions/orders'
import { requireAdmin } from '@/lib/auth/admin'
import { failedOrderQueries, OrderQueryError } from '../QueryError'

type State = { error?: string } | null

async function createOrderAction(prevState: State, formData: FormData): Promise<State> {
  'use server'
  try {
    const order = await createOrder({
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
  searchParams: Promise<{ client?: string; project?: string }>
}) {
  const { client: defaultClientId, project: defaultProjectId } = await searchParams
  const user = await requireAdmin()
  const supabase = await createClient()
  const { data: projects, error: projectsError } = await supabase.from('crm_projects').select('id,title,client_id').eq('owner_user_id', user.id).order('title')

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

  const failures = failedOrderQueries('new', [{ label: 'contactos', error: clientsError }, { label: 'proyectos', error: projectsError }, { label: 'cuentas bancarias', error: banksError }, { label: 'documentos fiscales', error: fiscalError }])
  const retryParams = new URLSearchParams()
  if (defaultClientId) retryParams.set('client', defaultClientId)
  if (defaultProjectId) retryParams.set('project', defaultProjectId)
  if (failures.length) return <OrderQueryError title="Nueva orden" resources={failures} retryHref={`/admin/orders/new?${retryParams}`} />

  if (!clients?.length) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href="/admin/orders" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
            ← Órdenes
          </Link>
          <h1 className="text-2xl font-semibold text-foreground mt-2">Nueva orden</h1>
        </div>
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <p className="text-muted-foreground mb-4">Necesitas al menos un cliente para crear una orden.</p>
          <Link href="/admin/clients/new" className="text-emerald-700 hover:text-emerald-800">
            Crear primer cliente →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href="/admin/orders" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
          ← Órdenes
        </Link>
        <h1 className="text-2xl font-semibold text-foreground mt-2">Nueva orden</h1>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <OrderForm
          action={createOrderAction}
          clients={clients}
          bankAccounts={bankAccounts ?? []}
          fiscalDocuments={fiscalDocuments ?? []}
          defaultClientId={defaultClientId}
          defaultProjectId={defaultProjectId}
          projects={projects ?? []}
        />
      </div>
    </div>
  )
}

function getBankAccountId(formData: FormData) {
  const value = formData.get('bank_account_id') as string | null
  return value && value !== 'none' ? value : undefined
}

function getFiscalDocumentId(formData: FormData) {
  const value = formData.get('fiscal_document_id') as string | null
  return value && value !== 'none' ? value : undefined
}
