'use server'
import { requireAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { googleRequest } from '@/lib/calendar/google'
import { syncBooking,cancelStoredBooking } from '@/lib/calendar/service'
import type { Booking,EventType } from '@/lib/calendar/types'

export async function saveEventType(form:FormData){
 const user=await requireAdmin(),db=createAdminClient()
 const title=String(form.get('title')??'').trim(),description=String(form.get('description')??'').trim(),timezone=String(form.get('timezone')??'America/Monterrey'),destination=String(form.get('destination_calendar_id')??'')
 const number=(key:string,min:number,max:number)=>{const n=Number(form.get(key));if(!Number.isInteger(n)||n<min||n>max)throw new Error(`Valor inválido: ${key}`);return n}
 if(!title||title.length>120||description.length>1000)throw new Error('Revisa el título y descripción')
 try{new Intl.DateTimeFormat('es',{timeZone:timezone}).format()}catch{throw new Error('Zona horaria inválida')}
 const weekdays=form.getAll('weekdays').map(Number);if(!weekdays.length||weekdays.some(d=>!Number.isInteger(d)||d<1||d>7))throw new Error('Selecciona los días disponibles')
 const start=number('start_hour',0,23),end=number('end_hour',1,24);if(end<=start)throw new Error('La hora de cierre debe ser posterior')
 const {data:calendar}=await db.from('connected_calendars').select('id,access_role').eq('id',destination).eq('owner_user_id',user.id).single()
 if(!calendar||!['owner','writer'].includes(calendar.access_role))throw new Error('Selecciona un calendario editable')
 const values={owner_user_id:user.id,title,description,timezone,destination_calendar_id:destination,weekdays,start_hour:start,end_hour:end,duration_minutes:number('duration_minutes',15,240),buffer_minutes:number('buffer_minutes',0,120),notice_hours:number('notice_hours',0,720),horizon_days:number('horizon_days',1,90),enabled:form.get('enabled')==='on'}
 const id=String(form.get('id')??'')
 const result=id?await db.from('booking_event_types').update(values).eq('id',id).eq('owner_user_id',user.id):await db.from('booking_event_types').insert(values)
 if(result.error)throw new Error('No se pudo guardar el enlace')
 revalidatePath('/admin/calendar')
}
export async function toggleCalendar(id:string,blocks:boolean){
 const user=await requireAdmin();if(typeof blocks!=='boolean')throw new Error('Valor inválido')
 const {error}=await createAdminClient().from('connected_calendars').update({blocks_availability:blocks}).eq('id',id).eq('owner_user_id',user.id)
 if(error)throw new Error('No se pudo actualizar el calendario');revalidatePath('/admin/calendar')
}
export async function retryBooking(id:string){
 const user=await requireAdmin(),db=createAdminClient()
 const {data:b}=await db.from('calendar_bookings').select('*').eq('id',id).eq('owner_user_id',user.id).in('status',['pending','sync_failed','cancelling']).single()
 if(!b)throw new Error('Reserva no encontrada')
 const {data:e}=await db.from('booking_event_types').select('*').eq('id',b.event_type_id).eq('owner_user_id',user.id).single()
 if(!e)throw new Error('Tipo de reunión no encontrado')
 if(b.status==='cancelling'){await cancelStoredBooking(b as Booking,e as EventType,true);revalidatePath('/admin/calendar');return}
 const result=await syncBooking(b as Booking,e as EventType,true)
 revalidatePath('/admin/calendar')
 if(result.status!=='confirmed')throw new Error('Google sigue sin responder. El horario permanece reservado.')
}
export async function cancelBooking(id:string){
 const user=await requireAdmin(),db=createAdminClient()
 const {data:b}=await db.from('calendar_bookings').select('*').eq('id',id).eq('owner_user_id',user.id).single()
 if(!b||b.status==='cancelled')return
 const {data:e}=await db.from('booking_event_types').select('*').eq('id',b.event_type_id).eq('owner_user_id',user.id).single()
 if(!e)throw new Error('Tipo de reunión no encontrado')
 await cancelStoredBooking(b as Booking,e as EventType,true)
 revalidatePath('/admin/calendar')
}

export async function approveBookingContact(form:FormData){
 const user=await requireAdmin()
 const booking=String(form.get('booking_id')??''),client=String(form.get('client_id')??'')
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
 if(!uuid.test(booking)||!uuid.test(client))throw new Error('Selecciona una reserva y un contacto válidos')
 const {error}=await createAdminClient().rpc('approve_calendar_booking_contact',{p_booking:booking,p_owner:user.id,p_client:client})
 if(error)throw new Error('No se pudo aprobar el contacto. Revisa la reserva y sus permisos.')
 revalidatePath('/admin/calendar');revalidatePath(`/admin/clients/${client}`)
}

export async function blockCalendarTime(form:FormData){
 const user=await requireAdmin(),db=createAdminClient(),id=String(form.get('calendar_id')??''),start=String(form.get('start')??''),end=String(form.get('end')??''),title=String(form.get('title')??'Ocupado').trim()
 if(!title||title.length>120||!Number.isFinite(Date.parse(start))||!Number.isFinite(Date.parse(end))||Date.parse(end)<=Date.parse(start))throw new Error('Revisa el intervalo')
 const {data:c}=await db.from('connected_calendars').select('*').eq('id',id).eq('owner_user_id',user.id).single()
 if(!c||!['owner','writer'].includes(c.access_role))throw new Error('Calendario no editable')
 await googleRequest(c.connection_id,user.id,`calendars/${encodeURIComponent(c.google_calendar_id)}/events`,{method:'POST',body:JSON.stringify({summary:title,start:{dateTime:start},end:{dateTime:end},transparency:'opaque'})})
 revalidatePath('/admin/calendar')
}
