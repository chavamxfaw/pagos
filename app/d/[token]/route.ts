import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const BUCKET = 'fiscal-documents'
const SIGNED_URL_SECONDS = 60 * 60

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: document } = await admin
    .from('fiscal_documents')
    .select('file_path')
    .eq('share_token', token)
    .eq('is_active', true)
    .single()

  if (!document) {
    return new NextResponse('Documento no encontrado', { status: 404 })
  }

  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(document.file_path, SIGNED_URL_SECONDS)

  if (error || !data?.signedUrl) {
    return new NextResponse('No se pudo generar el link del documento', { status: 500 })
  }

  return NextResponse.redirect(data.signedUrl)
}
