import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { MessageComposer } from './Composer'
import { createAdminClient } from '@/lib/supabase/admin'
import { ReceiptReview, type ReceiptReviewRow } from './ReceiptReview'

const statusLabels: Record<string,string> = {received:'Recibido',accepted:'Aceptado',queued:'En cola',sending:'Enviando',sent:'Enviado',delivered:'Entregado',read:'Leído',failed:'Falló',undelivered:'No entregado',unknown:'Por confirmar',pending:'Pendiente'}
export default async function MessagesPage({searchParams}:{searchParams:Promise<{client?:string}>}) {
  const user = await requireAdmin()
  const {client:requested} = await searchParams
  const db = await createClient()
  const { data: receiptRows, error: receiptError } = await createAdminClient().from('payment_receipt_deliveries')
    .select('payment_id,channel,status,updated_at,provider_id,payments(order_id,orders(concept))')
    .or(`status.eq.unknown,and(status.eq.sending,updated_at.lt.${new Date(new Date().getTime()-15*60*1000).toISOString()})`)
    .order('updated_at').limit(50)
  const receiptReviews: ReceiptReviewRow[] = (receiptRows || []).flatMap(row => {
    const payment = Array.isArray(row.payments) ? row.payments[0] : row.payments
    const order = payment && (Array.isArray(payment.orders) ? payment.orders[0] : payment.orders)
    return payment && order ? [{...row,orderId:payment.order_id,concept:order.concept}] : []
  })
  const {data:contacts,error:contactsError} = await db.from('clients').select('id,name,phone').order('name').limit(500)
  if(contactsError) return <div className="p-6"><h1 className="text-2xl font-semibold">Mensajes</h1><p className="mt-4">No se pudieron cargar los contactos.</p><Link href="/admin/messages" className="underline">Volver a intentar</Link></div>
  const selected = contacts?.find(c=>c.id===requested)
  let query = db.from('whatsapp_messages').select('id,client_id,phone,direction,body,status,kind,created_at').order('created_at',{ascending:false}).limit(100)
  if(selected) query = query.eq('client_id',selected.id)
  const [{data:messages,error}, {data:orders,error:ordersError}, {data:documents,error:documentsError}, {data:bookings,error:bookingsError}] = await Promise.all([
    query,
    selected?db.from('orders').select('id,concept').eq('client_id',selected.id).order('created_at',{ascending:false}):Promise.resolve({data:[],error:null}),
    db.from('fiscal_documents').select('id,title').eq('is_active',true),
    db.from('booking_event_types').select('id,title').eq('owner_user_id',user.id).eq('enabled',true),
  ])
  const configured = Boolean(process.env.TWILIO_ACCOUNT_SID&&process.env.TWILIO_AUTH_TOKEN&&process.env.TWILIO_WHATSAPP_FROM)
  const disabledReason=!configured?'WhatsApp necesita completar su conexión para enviar mensajes.':error?'No se pudo cargar la bandeja. Actualiza para intentar de nuevo.':!selected?.phone?'Agrega el teléfono de este contacto para enviarle WhatsApp.':ordersError||documentsError||bookingsError?'No se pudieron cargar los recursos para compartir. Actualiza para intentar de nuevo.':undefined
  return <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
    <header><h1 className="text-2xl font-semibold tracking-tight">Mensajes</h1><p className="mt-1 text-sm text-muted-foreground">WhatsApp, pagos y agenda en una conversación.</p></header>
    <ReceiptReview rows={receiptReviews} error={Boolean(receiptError)}/>
    <div className="grid overflow-hidden rounded-xl border border-border bg-background md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="max-h-72 overflow-auto border-b border-border p-3 md:max-h-[75vh] md:border-b-0 md:border-r" aria-label="Contactos">
        <Link href="/admin/messages" className={`mb-2 block rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${!selected?'bg-muted':''}`}>Todos los mensajes</Link>
        {contacts?.map(c=><Link key={c.id} href={`/admin/messages?client=${c.id}`} aria-current={selected?.id===c.id?'page':undefined} className={`block min-h-11 rounded-lg px-3 py-2 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected?.id===c.id?'bg-muted':''}`}><span className="block truncate">{c.name}</span><span className="text-xs text-muted-foreground">{c.phone||'Sin teléfono'}</span></Link>)}
        {!contacts?.length&&<p className="p-3 text-sm text-muted-foreground">Agrega un contacto para iniciar una conversación.</p>}
      </aside>
      <main className="min-w-0">
        <div className="flex items-center justify-between gap-3 border-b border-border p-5"><h2 className="font-medium">{selected?.name||'Actividad reciente'}</h2><Link href={selected?`/admin/clients/${selected.id}`:'/admin/clients/new'} className="text-sm underline underline-offset-4">{selected?'Ver contacto':'Nuevo contacto'}</Link></div>
        <div className="max-h-[55vh] min-h-64 space-y-4 overflow-auto p-5">
          {error?<p role="alert" className="text-sm">La bandeja necesita completar su configuración. <Link href="/admin/messages" className="underline">Actualizar</Link></p>:!messages?.length?<div className="py-8"><h3 className="font-medium">Aún no hay mensajes</h3><p className="mt-1 text-sm text-muted-foreground">{selected?'Comparte un enlace o espera el primer mensaje del contacto.':'Selecciona un contacto para preparar un mensaje.'}</p></div>:messages.slice().reverse().map(m=><article key={m.id} className={`max-w-[95%] rounded-lg p-3 text-sm sm:max-w-[85%] ${m.direction==='outbound'?'ml-auto bg-muted':'border border-border'}`}>
            {!selected&&<p className="mb-1 font-medium">{contacts?.find(c=>c.id===m.client_id)?.name||`${m.phone} · Sin vincular`}</p>}
            <p className="whitespace-pre-wrap break-words">{m.body||(m.kind==='media'?'Archivo recibido. El contenido multimedia no se descarga automáticamente.':'Mensaje sin texto')}</p>
            <p className="mt-2 text-xs text-muted-foreground">{m.direction==='inbound'?'Cliente':'Tú'} · {statusLabels[m.status]||m.status} · {new Date(m.created_at).toLocaleString('es-MX',{timeZone:'America/Monterrey',dateStyle:'short',timeStyle:'short'})}</p>
          </article>)}
        </div>
        {selected&&<MessageComposer key={selected.id} clientId={selected.id} enabled={!disabledReason} disabledReason={disabledReason} orders={(orders||[]).map(o=>({id:o.id,name:o.concept}))} documents={(documents||[]).map(d=>({id:d.id,name:d.title}))} bookings={(bookings||[]).map(b=>({id:b.id,name:b.title}))}/>}
      </main>
    </div>
  </div>
}
