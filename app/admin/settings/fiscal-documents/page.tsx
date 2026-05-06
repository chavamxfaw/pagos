import Link from 'next/link'
import { FileText, UploadCloud } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { deleteFiscalDocument, updateFiscalDocument, uploadFiscalDocument } from '@/actions/fiscal-documents'
import { CopyLinkButton } from '@/components/admin/CopyLinkButton'
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatDateShort } from '@/lib/utils'
import type { FiscalDocument } from '@/types'

export default async function FiscalDocumentsPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('fiscal_documents')
    .select('*')
    .order('created_at', { ascending: false })

  const documents = (data ?? []) as FiscalDocument[]

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <div className="mb-6">
        <Link href="/admin/profile" className="text-sm text-[#6B7280] transition-colors hover:text-[#1A1F36]">
          ← Perfil
        </Link>
      </div>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6C5CE7]">Configuración</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#1A1F36]">Documentos fiscales</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Sube tu constancia fiscal en PDF y genera un link seguro para compartirla.
          </p>
        </div>
      </div>

      <section className="mb-8 overflow-hidden rounded-3xl border border-white bg-white shadow-[0_18px_45px_rgba(26,31,54,0.08)] ring-1 ring-[#E6EAF0]/80">
        <div className="bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] px-6 py-7 text-white">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-white/18 ring-1 ring-white/25">
              <UploadCloud className="size-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold">Subir constancia fiscal</h2>
              <p className="text-sm text-white/70">El archivo queda privado; el link compartido abre una URL temporal del PDF.</p>
            </div>
          </div>
        </div>
        <FiscalDocumentUploadForm />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#1A1F36]">Documentos guardados</h2>
          <Badge className="border-[#D8DEE8] bg-white text-[#6B7280]">
            {documents.length} {documents.length === 1 ? 'documento' : 'documentos'}
          </Badge>
        </div>

        {!documents.length && (
          <div className="rounded-3xl border border-dashed border-[#D8DEE8] bg-white p-8 text-center">
            <p className="text-sm font-semibold text-[#1A1F36]">Sin documentos fiscales todavía</p>
            <p className="mt-1 text-sm text-[#6B7280]">Sube tu constancia fiscal para poder compartirla cuando un cliente la pida.</p>
          </div>
        )}

        <div className="grid gap-4">
          {documents.map((document) => (
            <article key={document.id} className="rounded-3xl border border-[#E6EAF0] bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="flex size-10 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#6C5CE7]">
                      <FileText className="size-5" />
                    </span>
                    <div>
                      <h3 className="font-bold text-[#1A1F36]">{document.title}</h3>
                      <p className="text-sm text-[#6B7280]">{document.file_name}</p>
                    </div>
                    <Badge className={document.is_active ? 'border-[#2ED39A]/30 bg-[#2ED39A]/10 text-[#129B70]' : 'border-[#D8DEE8] bg-[#E6EAF0] text-[#6B7280]'}>
                      {document.is_active ? 'Compartible' : 'Inactivo'}
                    </Badge>
                  </div>
                  {document.description && <p className="mt-2 text-sm text-[#6B7280]">{document.description}</p>}
                  <p className="mt-2 text-xs text-[#8A94A6]">
                    Subido {formatDateShort(document.created_at)} · {formatFileSize(document.file_size)}
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-3 lg:w-auto lg:grid-cols-1 xl:grid-cols-3">
                  {document.is_active && (
                    <CopyLinkButton path={`/d/${document.share_token}`} label="Copiar link" />
                  )}
                  <Link
                    href={`/d/${document.share_token}`}
                    target="_blank"
                    className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#D8DEE8] bg-white px-3 text-sm font-medium text-[#1A1F36] transition-colors hover:bg-[#E6EAF0]"
                  >
                    Ver PDF
                  </Link>
                  <DeleteConfirmDialog
                    action={deleteFiscalDocument.bind(null, document.id)}
                    title="Borrar documento fiscal"
                    description={`Se eliminará "${document.title}" y su PDF asociado. Esta acción no se puede deshacer.`}
                    confirmLabel="Borrar documento"
                    triggerLabel="Borrar"
                  />
                </div>
              </div>

              <details className="mt-4 rounded-2xl border border-[#E6EAF0] bg-[#F8FAFF]">
                <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[#1A1F36]">
                  Editar información
                </summary>
                <FiscalDocumentEditForm document={document} />
              </details>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function FiscalDocumentUploadForm() {
  return (
    <form action={uploadFiscalDocument} className="grid gap-5 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" name="title" placeholder="Constancia fiscal OTLA" required />
        <div className="grid gap-2">
          <Label htmlFor="file" className="text-[#1A1F36]">PDF</Label>
          <Input id="file" name="file" type="file" accept="application/pdf,.pdf" required className="border-[#D8DEE8] bg-white text-[#1A1F36]" />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description" className="text-[#1A1F36]">Descripción</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Ej. Constancia de situación fiscal vigente."
          className="min-h-24 border-[#D8DEE8] bg-white text-[#1A1F36]"
        />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-[#1A1F36]">
        <input type="checkbox" name="is_active" defaultChecked className="size-4 rounded border-[#D8DEE8]" />
        Permitir compartir por link
      </label>

      <div>
        <Button type="submit" className="w-full bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] text-white shadow-sm hover:brightness-105 sm:w-auto">
          Subir documento
        </Button>
      </div>
    </form>
  )
}

function FiscalDocumentEditForm({ document }: { document: FiscalDocument }) {
  return (
    <form action={updateFiscalDocument.bind(null, document.id)} className="grid gap-4 p-4">
      <Field label="Nombre" name="title" defaultValue={document.title} required />
      <div className="grid gap-2">
        <Label htmlFor={`description-${document.id}`} className="text-[#1A1F36]">Descripción</Label>
        <Textarea
          id={`description-${document.id}`}
          name="description"
          defaultValue={document.description ?? ''}
          className="min-h-24 border-[#D8DEE8] bg-white text-[#1A1F36]"
        />
      </div>
      <label className="flex items-center gap-2 text-sm font-medium text-[#1A1F36]">
        <input type="checkbox" name="is_active" defaultChecked={document.is_active} className="size-4 rounded border-[#D8DEE8]" />
        Permitir compartir por link
      </label>
      <div>
        <Button type="submit" className="w-full bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] text-white shadow-sm hover:brightness-105 sm:w-auto">
          Actualizar documento
        </Button>
      </div>
    </form>
  )
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  required,
}: {
  label: string
  name: string
  defaultValue?: string | null
  placeholder?: string
  required?: boolean
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name} className="text-[#1A1F36]">{label}</Label>
      <Input
        id={name}
        name={name}
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        required={required}
        className="border-[#D8DEE8] bg-white text-[#1A1F36]"
      />
    </div>
  )
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
