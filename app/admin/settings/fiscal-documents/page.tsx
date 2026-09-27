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
    <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <div className="mb-6">
        <Link href="/admin/profile" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
          ← Perfil
        </Link>
      </div>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Configuración</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Documentos fiscales</h1>
          <p className="mt-1 text-sm text-muted-foreground">PDFs fiscales y links compartibles</p>
        </div>
      </div>

      <section className="mb-8 overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border bg-primary/5 px-5 py-5 text-foreground">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UploadCloud className="size-5" />
            </span>
            <div>
              <h2 className="text-xl font-semibold">Subir constancia fiscal</h2>
              <p className="text-sm text-muted-foreground">PDF privado con link compartible</p>
            </div>
          </div>
        </div>
        <FiscalDocumentUploadForm />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Documentos guardados</h2>
          <Badge className="border-input bg-white text-muted-foreground">
            {documents.length} {documents.length === 1 ? 'documento' : 'documentos'}
          </Badge>
        </div>

        {!documents.length && (
          <div className="rounded-xl border border-dashed border-input bg-white p-8 text-center">
            <p className="text-sm font-semibold text-foreground">Sin documentos fiscales todavía</p>
            <p className="mt-1 text-sm text-muted-foreground">No hay documentos guardados.</p>
          </div>
        )}

        <div className="grid gap-4">
          {documents.map((document) => (
            <article key={document.id} className="rounded-xl border border-border bg-card p-5 ">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-primary/8 text-primary">
                      <FileText className="size-5" />
                    </span>
                    <div>
                      <h3 className="break-words font-semibold text-foreground">{document.title}</h3>
                      <p className="break-all text-sm text-muted-foreground">{document.file_name}</p>
                    </div>
                    <Badge className={document.is_active ? 'border-[#2ED39A]/30 bg-[#2ED39A]/10 text-[#129B70]' : 'border-input bg-muted text-muted-foreground'}>
                      {document.is_active ? 'Compartible' : 'Inactivo'}
                    </Badge>
                  </div>
                  {document.description && <p className="mt-2 break-words text-sm text-muted-foreground">{document.description}</p>}
                  <p className="mt-2 text-xs text-muted-foreground">
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
                    className="inline-flex min-h-11 items-center justify-center rounded-lg border border-input bg-white px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
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

              <details className="mt-4 rounded-lg border border-border bg-muted/40">
                <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-foreground">
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
        <Field label="Nombre" name="title" placeholder="Constancia fiscal" required />
        <div className="grid min-w-0 gap-2">
          <Label htmlFor="file" className="text-foreground">PDF</Label>
          <Input id="file" name="file" type="file" accept="application/pdf,.pdf" required className="min-h-11 min-w-0 border-input bg-background text-foreground" />
        </div>
      </div>

      <div className="grid min-w-0 gap-2">
        <Label htmlFor="description" className="text-foreground">Descripción</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Constancia de situación fiscal vigente."
          className="min-h-24 border-input bg-white text-foreground"
        />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
        <input type="checkbox" name="is_active" defaultChecked className="size-4 rounded border-input" />
        Permitir compartir por link
      </label>

      <div>
        <Button type="submit" className="min-h-11 w-full bg-primary text-primary-foreground shadow-none hover:bg-primary/90 sm:w-auto">
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
      <div className="grid min-w-0 gap-2">
        <Label htmlFor={`description-${document.id}`} className="text-foreground">Descripción</Label>
        <Textarea
          id={`description-${document.id}`}
          name="description"
          defaultValue={document.description ?? ''}
          className="min-h-24 border-input bg-white text-foreground"
        />
      </div>
      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
        <input type="checkbox" name="is_active" defaultChecked={document.is_active} className="size-4 rounded border-input" />
        Permitir compartir por link
      </label>
      <div>
        <Button type="submit" className="min-h-11 w-full bg-primary text-primary-foreground shadow-none hover:bg-primary/90 sm:w-auto">
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
    <div className="grid min-w-0 gap-2">
      <Label htmlFor={name} className="text-foreground">{label}</Label>
      <Input
        id={name}
        name={name}
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        required={required}
        className="min-h-11 min-w-0 border-input bg-background text-foreground"
      />
    </div>
  )
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
