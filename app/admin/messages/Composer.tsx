'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { previewMessage,sendMessage } from '@/actions/messages'
import type { MessageInput } from '@/lib/whatsapp/messages'

type Option = {id:string;name:string}
export function MessageComposer({clientId,orders,documents,bookings,enabled,disabledReason}:{clientId:string;orders:Option[];documents:Option[];bookings:Option[];enabled:boolean;disabledReason?:string}) {
  const router = useRouter()
  const [kind,setKind] = useState<MessageInput['kind']>('text')
  const [resource,setResource] = useState('')
  const [body,setBody] = useState('')
  const [preview,setPreview] = useState<{body:string;blocked:string|null;template:boolean;identityWarning:string|null}|null>(null)
  const [busy,setBusy] = useState(false)
  const [feedback,setFeedback] = useState('')
  const [key,setKey] = useState<string|null>(null)
  const options = kind==='payment'||kind==='bank'?orders:kind==='document'?documents:bookings
  const control = 'min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50'
  function resetPreview(){setPreview(null);setKey(null);setFeedback('')}
  async function submit(send:boolean) {
    setBusy(true);setFeedback('')
    const operationKey = key || crypto.randomUUID()
    setKey(operationKey)
    const input: MessageInput = {clientId,kind,resourceId:resource||undefined,body,idempotencyKey:operationKey}
    try {
      if (!send) setPreview(await previewMessage(input))
      else {
        const result = await sendMessage(input)
        setFeedback(`Estado del envío: ${result.status}. ${result.replayed?'Esta solicitud ya estaba registrada.':''}`)
        // Keep the operation key after an uncertain outcome; a retry cannot send twice.
        router.refresh()
      }
    } catch(error){setFeedback(error instanceof Error?error.message:'No se pudo completar la acción')}
    finally {setBusy(false)}
  }
  return <section className="space-y-4 border-t border-border p-5" aria-label="Redactar WhatsApp">
    <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold">Enviar WhatsApp</h2>{preview&&<Button variant="ghost" size="sm" onClick={resetPreview} disabled={busy}>Nuevo mensaje</Button>}</div>
    {!enabled&&<p role="status" className="text-sm text-muted-foreground">{disabledReason||'WhatsApp necesita completar su conexión para enviar mensajes.'}</p>}
    <label className="block space-y-1.5 text-sm"><span>Qué deseas enviar</span><select value={kind} className={control} disabled={busy} onChange={e=>{setKind(e.target.value as MessageInput['kind']);setResource('');resetPreview()}}>
      <option value="text">Mensaje</option><option value="payment">Enlace de pago</option><option value="bank">Datos bancarios de una orden</option><option value="document">Constancia o documento fiscal</option><option value="booking">Enlace para reservar</option>
    </select></label>
    {kind==='text'?<label className="block space-y-1.5 text-sm"><span>Mensaje</span><textarea value={body} maxLength={4000} rows={3} className={`${control} py-3`} disabled={busy} onChange={e=>{setBody(e.target.value);resetPreview()}}/><span className="text-xs text-muted-foreground">Disponible cuando el cliente te escribió en las últimas 24 horas.</span></label>:<label className="block space-y-1.5 text-sm"><span>{kind==='document'?'Documento':kind==='booking'?'Tipo de reunión':'Orden del contacto'}</span><select value={resource} className={control} disabled={busy} onChange={e=>{setResource(e.target.value);resetPreview()}}><option value="">Seleccionar…</option>{options.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select>{!options.length&&<span className="text-xs text-muted-foreground">Todavía no hay opciones disponibles. Crea el registro correspondiente para compartirlo.</span>}</label>}
    {preview&&<div className="space-y-2 rounded-lg bg-muted/40 p-4"><p className="whitespace-pre-wrap break-words text-sm">{preview.body}</p>{preview.template&&<p className="text-xs text-muted-foreground">Resumen del contenido. El texto final usa la plantilla aprobada en WhatsApp.</p>}{preview.identityWarning&&<p role="status" className="text-sm text-amber-700 dark:text-amber-400">{preview.identityWarning}</p>}{preview.blocked&&<p className="text-sm text-destructive">{preview.blocked}</p>}</div>}
    <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!enabled||busy||(!body.trim()&&kind==='text')||(kind!=='text'&&!resource)} onClick={()=>submit(false)}>{busy?'Procesando…':'Vista previa'}</Button>{preview&&<Button disabled={!enabled||busy||Boolean(preview.blocked)} onClick={()=>submit(true)}>Enviar a este contacto</Button>}</div>
    {feedback&&<p role="status" className="text-sm">{feedback}</p>}
  </section>
}
