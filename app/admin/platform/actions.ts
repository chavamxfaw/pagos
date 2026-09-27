'use server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requirePlatformOwner } from '@/lib/crm/platform'
import { parseId } from '@/lib/crm/model'
import { parsePlatformAccount } from '@/lib/crm/platform-model'

export async function saveAccount(_previous: { error?: string; success?: boolean }, form: FormData): Promise<{ error?: string; success?: boolean }> {
  try {
    const owner = await requirePlatformOwner()
    const fields = parsePlatformAccount(form)
    const id = form.get('id') ? parseId(form.get('id')) : null
    const db = createAdminClient()
    const result = id
      ? await db.from('platform_accounts').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id).eq('owner_user_id', owner.id).select('id').maybeSingle()
      : await db.from('platform_accounts').insert({ ...fields, owner_user_id: owner.id }).select('id').single()
    if (result.error || !result.data) return { error: 'No se pudo guardar la cuenta.' }
    revalidatePath('/admin/platform')
    return { success: true }
  } catch (error) { return { error: error instanceof Error ? error.message : 'No se pudo guardar.' } }
}

export async function deleteAccount(_previous: { error?: string; success?: boolean }, form: FormData): Promise<{ error?: string; success?: boolean }> {
  try {
    const owner = await requirePlatformOwner()
    const id = parseId(form.get('id'))
    const { data, error } = await createAdminClient().from('platform_accounts').delete().eq('id', id).eq('owner_user_id', owner.id).select('id').maybeSingle()
    if (error || !data) return { error: 'No se pudo eliminar la cuenta.' }
    revalidatePath('/admin/platform')
    return { success: true }
  } catch { return { error: 'No autorizado o cuenta inválida.' } }
}
