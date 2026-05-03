import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { createClient } from '@/lib/supabase/server'
import { updateClient } from '@/actions/clients'
import { ClientForm } from '@/components/admin/ClientForm'

type State = { error?: string } | null

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (!client) notFound()

  async function updateClientAction(prevState: State, formData: FormData): Promise<State> {
    'use server'
    try {
      await updateClient(id, {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        company: formData.get('company') as string,
        rfc: formData.get('rfc') as string,
        address: formData.get('address') as string,
        notes: formData.get('notes') as string,
      })
      redirect(`/admin/clients/${id}`)
    } catch (e: unknown) {
      if (isRedirectError(e)) throw e
      return { error: e instanceof Error ? e.message : 'Error al actualizar cliente' }
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-7">
        <Link
          href={`/admin/clients/${id}`}
          className="text-[#6B7280] hover:text-[#1A1F36] text-sm transition-colors"
        >
          ← {client.name}
        </Link>
        <h1 className="text-2xl font-heading font-semibold text-[#1A1F36] mt-2">Editar cliente</h1>
      </div>

      <div className="bg-white border border-[#E6EAF0] rounded-xl p-6">
        <ClientForm
          action={updateClientAction}
          defaultValues={client}
          submitLabel="Guardar cambios"
        />
      </div>
    </div>
  )
}
