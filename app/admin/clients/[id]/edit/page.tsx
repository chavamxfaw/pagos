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
        phone: (formData.get('phone') as string) || undefined,
        company: (formData.get('company') as string) || undefined,
        rfc: (formData.get('rfc') as string) || undefined,
        address: (formData.get('address') as string) || undefined,
        notes: (formData.get('notes') as string) || undefined,
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
          className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
        >
          ← {client.name}
        </Link>
        <h1 className="text-2xl font-heading font-semibold text-zinc-50 mt-2">Editar cliente</h1>
      </div>

      <div className="bg-zinc-950 border border-zinc-800/60 rounded-xl p-6">
        <ClientForm
          action={updateClientAction}
          defaultValues={client}
          submitLabel="Guardar cambios"
        />
      </div>
    </div>
  )
}
