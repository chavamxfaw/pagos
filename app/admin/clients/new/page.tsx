import Link from 'next/link'
import { redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { ClientForm } from '@/components/admin/ClientForm'
import { createClient_action } from '@/actions/clients'

type State = { error?: string } | null

async function createClientAction(prevState: State, formData: FormData): Promise<State> {
  'use server'
  try {
    const client = await createClient_action({
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: (formData.get('phone') as string) || undefined,
      company: (formData.get('company') as string) || undefined,
      rfc: (formData.get('rfc') as string) || undefined,
      address: (formData.get('address') as string) || undefined,
      notes: (formData.get('notes') as string) || undefined,
    })
    redirect(`/admin/clients/${client.id}`)
  } catch (e: unknown) {
    if (isRedirectError(e)) throw e
    return { error: e instanceof Error ? e.message : 'Error al crear cliente' }
  }
}

export default function NewClientPage() {
  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href="/admin/clients" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
          ← Clientes
        </Link>
        <h1 className="text-2xl font-bold text-zinc-50 mt-2">Nuevo cliente</h1>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <ClientForm action={createClientAction} submitLabel="Crear cliente" />
      </div>
    </div>
  )
}
