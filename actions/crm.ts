'use server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { parseKind } from '@/lib/crm/model'
import { saveCrmRecord, deleteCrmRecord, convertOpportunityToProject } from '@/lib/crm/service'

export async function saveCrm(_previous: { error?: string; success?: boolean }, form: FormData): Promise<{ error?: string; success?: boolean }> {
  try {
    const user = await requireAdmin()
    const kind = parseKind(form.get('kind'))
    const db = await createClient()
    await saveCrmRecord({ db, ownerId: user.id }, kind, form, form.get('id'))
    revalidatePath(`/admin/crm/${kind}`)
    revalidatePath('/admin')
    return { success: true }
  } catch (error) { return { error: error instanceof Error ? error.message : 'No se pudo guardar.' } }
}

export async function deleteCrm(_previous: { error?: string; success?: boolean }, form: FormData): Promise<{ error?: string; success?: boolean }> {
  try {
    const user = await requireAdmin()
    const kind = parseKind(form.get('kind'))
    const db = await createClient()
    await deleteCrmRecord({ db, ownerId: user.id }, kind, form.get('id'))
    revalidatePath(`/admin/crm/${kind}`)
    revalidatePath('/admin')
    return { success: true }
  } catch { return { error: 'No autorizado o registro inválido.' } }
}

export async function convertCrmOpportunity(_previous: { error?: string; projectId?: string }, form: FormData): Promise<{ error?: string; projectId?: string }> {
  try {
    const user = await requireAdmin()
    const db = await createClient()
    const result = await convertOpportunityToProject({ db, ownerId: user.id }, form.get('id'))
    revalidatePath('/admin/crm/projects')
    revalidatePath('/admin/crm/opportunities')
    revalidatePath('/admin')
    return { projectId: result.project_id }
  } catch (error) { return { error: error instanceof Error ? error.message : 'No se pudo convertir.' } }
}
