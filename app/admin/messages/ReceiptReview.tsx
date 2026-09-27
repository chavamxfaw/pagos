'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { resolveReceiptDelivery } from '@/actions/receipt-deliveries'

export type ReceiptReviewRow = {
  payment_id: string; channel: string; status: string; updated_at: string
  provider_id: string | null; orderId: string; concept: string
}

function ReviewForm({ row }: { row: ReceiptReviewRow }) {
  const router = useRouter()
  const [resolution, setResolution] = useState('sent')
  const [reference, setReference] = useState(row.provider_id || '')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const control = 'min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50'
  return <details className="border-t border-border py-3">
    <summary className="cursor-pointer rounded-md py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {row.concept} · {row.channel === 'email' ? 'Correo' : 'WhatsApp'} · {row.status === 'unknown' ? 'Sin confirmación' : 'Envío detenido'}
    </summary>
    <form className="mt-3 space-y-3" onSubmit={async e => {
      e.preventDefault(); setBusy(true); setFeedback('')
      try {
        await resolveReceiptDelivery({paymentId:row.payment_id,channel:row.channel,updatedAt:row.updated_at,resolution,reference,note})
        setFeedback('Revisión guardada. No se envió ningún mensaje.'); router.refresh()
      } catch (error) { setFeedback(error instanceof Error ? error.message : 'No se pudo guardar') }
      finally { setBusy(false) }
    }}>
      <p className="text-sm text-muted-foreground">Primero comprueba el historial en Resend o Twilio. Esta acción solo registra tu revisión, no reenvía el recibo. <Link href={`/admin/orders/${row.orderId}`} className="underline">Ver orden</Link></p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm"><span>Resultado de la revisión</span><select className={control} value={resolution} disabled={busy} onChange={e=>setResolution(e.target.value)}><option value="sent">Envío confirmado en el proveedor</option><option value="skipped">Cerrar sin reenviar</option></select></label>
        <label className="space-y-1 text-sm"><span>Referencia del proveedor {resolution==='sent'?'(obligatoria)':'(opcional)'}</span><input className={control} value={reference} onChange={e=>setReference(e.target.value)} required={resolution==='sent'} minLength={resolution==='sent'?3:undefined} maxLength={200} disabled={busy}/></label>
      </div>
      <label className="block space-y-1 text-sm"><span>Nota de revisión (sin datos sensibles)</span><textarea className={control} value={note} onChange={e=>setNote(e.target.value)} required minLength={10} maxLength={500} disabled={busy}/></label>
      <Button type="submit" variant="outline" disabled={busy}>{busy?'Guardando…':'Guardar revisión sin reenviar'}</Button>
      {feedback&&<p role="status" className="text-sm">{feedback}</p>}
    </form>
  </details>
}

export function ReceiptReview({ rows, error }: { rows: ReceiptReviewRow[]; error: boolean }) {
  return <section className="rounded-lg border border-border p-4" aria-labelledby="receipt-review-title">
    <h2 id="receipt-review-title" className="text-sm font-semibold">Recibos por revisar {rows.length > 0 && `· ${rows.length}`}</h2>
    <p className="mt-1 text-sm text-muted-foreground">Los envíos sin confirmación no se repiten automáticamente para evitar duplicados.</p>
    {error?<p role="alert" className="mt-3 text-sm">No se pudo consultar la cola. <Link href="/admin/messages" className="underline">Actualizar</Link></p>:rows.length?rows.map(row=><ReviewForm key={`${row.payment_id}:${row.channel}`} row={row}/>):<p className="mt-3 text-sm text-muted-foreground">No hay recibos detenidos que requieran revisión.</p>}
    {rows.length===50&&<p className="text-xs text-muted-foreground">Se muestran los 50 más antiguos. Al resolverlos aparecerán los siguientes.</p>}
  </section>
}
