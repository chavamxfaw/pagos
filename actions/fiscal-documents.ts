"use server"

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/admin'

const BUCKET = 'fiscal-documents'
const MAX_FILE_SIZE = 10 * 1024 * 1024

async function requireAuth() {
  return requireAdmin()
}

function clean(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim()
  return text || null
}

export async function uploadFiscalDocument(formData: FormData) {
  await requireAuth()
  const admin = createAdminClient()

  const title = clean(formData.get('title'))
  const description = clean(formData.get('description'))
  const file = formData.get('file')

  if (!title) throw new Error('El nombre del documento es obligatorio.')
  if (!(file instanceof File) || file.size === 0) throw new Error('Selecciona un PDF.')
  if (file.type !== 'application/pdf') throw new Error('Solo se permiten archivos PDF.')
  if (file.size > MAX_FILE_SIZE) throw new Error('El PDF no puede pesar más de 10 MB.')

  const fileId = randomUUID()
  const safeName = file.name.replace(/[^\w.-]+/g, '-').toLowerCase()
  const path = `constancias/${fileId}-${safeName || 'documento.pdf'}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (uploadError) throw new Error(uploadError.message)

  const { error } = await admin
    .from('fiscal_documents')
    .insert({
      title,
      description,
      file_path: path,
      file_name: file.name,
      file_size: file.size,
      mime_type: 'application/pdf',
      is_active: formData.get('is_active') === 'on',
    })

  if (error) {
    await admin.storage.from(BUCKET).remove([path])
    throw new Error(error.message)
  }

  revalidatePath('/admin/settings/fiscal-documents')
}

export async function updateFiscalDocument(fiscalDocumentId: string, formData: FormData) {
  await requireAuth()
  const admin = createAdminClient()
  const title = clean(formData.get('title'))
  const description = clean(formData.get('description'))

  if (!title) throw new Error('El nombre del documento es obligatorio.')

  const { error } = await admin
    .from('fiscal_documents')
    .update({
      title,
      description,
      is_active: formData.get('is_active') === 'on',
      updated_at: new Date().toISOString(),
    })
    .eq('id', fiscalDocumentId)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/settings/fiscal-documents')
}

export async function deleteFiscalDocument(fiscalDocumentId: string) {
  await requireAuth()
  const admin = createAdminClient()

  const { data: document, error: fetchError } = await admin
    .from('fiscal_documents')
    .select('file_path')
    .eq('id', fiscalDocumentId)
    .single()

  if (fetchError || !document) {
    throw new Error(fetchError?.message ?? 'Documento no encontrado')
  }

  const { error } = await admin
    .from('fiscal_documents')
    .delete()
    .eq('id', fiscalDocumentId)

  if (error) throw new Error(error.message)

  await admin.storage.from(BUCKET).remove([document.file_path])
  revalidatePath('/admin/settings/fiscal-documents')
}
