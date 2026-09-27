import { requireAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { googleRequest } from '@/lib/calendar/google'
import { calendarReadiness } from '@/lib/calendar/setup'
import { CalendarWorkspace } from './workspace'
import type { EventType,ConnectedCalendar,Booking } from '@/lib/calendar/types'
import { reconcileConfirmedBookings } from '@/lib/calendar/reconcile'
import { addDays,dateKey,monthDays,validDay,type CalendarEntry } from '@/lib/calendar/display'
import { formatCurrency } from '@/lib/utils'

export default async function CalendarPage({searchParams}:{searchParams:Promise<{date?:string;connected?:string;error?:string}>}){
 const user=await requireAdmin(),db=createAdminClient()
 const query=await searchParams,setup=calendarReadiness()
 const today=dateKey(new Date()),anchor=validDay(query.date,today),days=monthDays(anchor)
 const window={now:`${days[0]}T00:00:00Z`,end:`${addDays(days[41],2)}T00:00:00Z`}
 let syncError=false
 try{syncError=(await reconcileConfirmedBookings(user.id)).errors>0}catch{syncError=true}
 const [calendars,types,bookings,orders,undated,contacts,recovery]=await Promise.all([
  db.from('connected_calendars').select('*').eq('owner_user_id',user.id),
  db.from('booking_event_types').select('*').eq('owner_user_id',user.id).order('title'),
  db.from('calendar_bookings').select('*').eq('owner_user_id',user.id).gt('ends_at',window.now).lt('starts_at',window.end).order('starts_at').limit(1000),
  // Historical orders use the same admin-only business scope as the Payments module.
  db.from('orders').select('id,concept,due_date,total_amount,paid_amount,status').not('status','in','("completed","cancelled")').gte('due_date',days[0]).lte('due_date',days[41]).order('due_date').limit(1000),
  db.from('orders').select('id',{count:'exact',head:true}).not('status','in','("completed","cancelled")').is('due_date',null),
  db.from('clients').select('id,name,email').order('name').limit(1000),
  db.from('calendar_bookings').select('*').eq('owner_user_id',user.id).eq('recovery_review_required',true).order('starts_at').limit(100)
 ])
 const events:{id:string;title:string;start:string;end:string;calendar:string;allDay:boolean}[]=[]
 if(!calendars.error){
  for(const c of (calendars.data??[]) as ConnectedCalendar[]){
   try{
    const params=new URLSearchParams({timeMin:window.now,timeMax:window.end,singleEvents:'true',orderBy:'startTime',maxResults:'250'})
    let next:string|undefined
    for(let page=0;page<20;page++){
     if(next)params.set('pageToken',next)
     const result=await googleRequest<{nextPageToken?:string;items:{id:string;summary?:string;status?:string;start?:{dateTime?:string;date?:string};end?:{dateTime?:string;date?:string};extendedProperties?:{private?:{crm_booking_id?:string}}}[]}>(c.connection_id,user.id,`calendars/${encodeURIComponent(c.google_calendar_id)}/events?${params}`)
     for(const e of result.items??[]){if(e.status==='cancelled'||!e.start||!e.end||e.extendedProperties?.private?.crm_booking_id)continue;events.push({id:`${c.id}-${e.id}`,title:e.summary||'Ocupado',start:e.start.dateTime||e.start.date!,end:e.end.dateTime||e.end.date!,calendar:c.name,allDay:!e.start.dateTime})}
     next=result.nextPageToken;if(!next)break
    }
    if(next)syncError=true
   }catch{syncError=true}
  }
 }
 const entries:CalendarEntry[]=[
  ...(orders.data??[]).filter(o=>Number(o.total_amount)>Number(o.paid_amount)).map(o=>({id:`payment-${o.id}`,title:o.concept,start:o.due_date!,end:addDays(o.due_date!,1),allDay:true,kind:'payment' as const,detail:`${formatCurrency(Math.max(0,Number(o.total_amount)-Number(o.paid_amount)))} pendiente${o.due_date!<today?' · Vencido':''}`,href:`/admin/orders/${o.id}`})),
  ...((bookings.data??[]) as Booking[]).filter(b=>b.status!=='cancelled').map(b=>({id:`booking-${b.id}`,title:b.guest_name,start:b.starts_at,end:b.ends_at,allDay:false,kind:'booking' as const,detail:b.status==='confirmed'?'Confirmada':'Pendiente de sincronizar',href:b.client_id&&b.contact_link_status==='approved'?`/admin/clients/${b.client_id}`:undefined})),
  ...events.map(e=>({...e,kind:'google' as const,detail:e.calendar})),
 ]
 const warning=[orders.error||undated.error?'No se pudieron cargar todos los pagos.':'',bookings.error?'No se pudieron cargar las citas.':'',syncError?'No se pudieron cargar todos los eventos de Google.':'',(orders.data?.length===1000||bookings.data?.length===1000)?'Hay más registros de los que pueden mostrarse en este periodo. Consulta el módulo de origen.':''].filter(Boolean).join(' ')
 const connectionFeedback=query.error==='configuration'?'configuration':query.error==='connection'?'error':query.connected==='1'&&Boolean(calendars.data?.length)?'success':undefined
 const listBookings=[...new Map([...(recovery.data??[]),...(bookings.data??[])].map(b=>[b.id,b])).values()] as Booking[]
 return <CalendarWorkspace anchor={anchor} today={today} entries={entries} warning={warning} undated={undated.count??0} calendars={(calendars.data??[]) as ConnectedCalendar[]} types={(types.data??[]) as EventType[]} bookings={listBookings} recoveryUnavailable={Boolean(recovery.error)} recoveryLimited={recovery.data?.length===100} contacts={contacts.data??[]} contactsUnavailable={Boolean(contacts.error)} connectionFeedback={connectionFeedback} setupIssues={setup.issues} callbackUrl={setup.callback} events={events.sort((a,b)=>a.start.localeCompare(b.start))} configured={setup.ready} schemaReady={!calendars.error&&!types.error&&!bookings.error} syncError={syncError} appUrl={process.env.NEXT_PUBLIC_APP_URL||''}/>
}
