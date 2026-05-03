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
      phone: formData.get('phone') as string,
      company: formData.get('company') as string,
      rfc: formData.get('rfc') as string,
      address: formData.get('address') as string,
      notes: formData.get('notes') as string,
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
        <Link href="/admin/clients" className="text-[#6B7280] hover:text-[#1A1F36] text-sm transition-colors">
          ← Clientes
        </Link>
        <h1 className="text-2xl font-bold text-[#1A1F36] mt-2">Nuevo cliente</h1>
      </div>

      <div className="bg-white border border-[#E6EAF0] rounded-xl p-6">
        <ClientForm action={createClientAction} submitLabel="Crear cliente" />
      </div>
    </div>
  )
}
