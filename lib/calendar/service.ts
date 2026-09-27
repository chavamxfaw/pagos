import 'server-only'
import { createHash } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { availableSlots,localDate } from './availability'
import { createGoogleBooking,getCalendarBusy,calendarDestination,deleteGoogleEvent } from './google'
import type { Booking,EventType } from './types'
import { calendarOperation } from './deadline'

export async function getEventType(slug:string){
 if(slug.length>100)return null
 const {data,error}=await createAdminClient().from('booking_event_types').select('*').eq('slug',slug).eq('enabled',true).maybeSingle()
 if(error)throw new Error('La agenda no está disponible en este momento')
 if(data){const {data:owner,error:ownerError}=await createAdminClient().from('app_admin_users').select('user_id').eq('user_id',data.owner_user_id).maybeSingle();if(ownerError)throw new Error('La agenda no está disponible en este momento');if(!owner)return null}
 return data as EventType|null
}
export async function getAvailability(slug:string,date:string){
 const event=await getEventType(slug)
 if(!event)throw new Error('Este enlace de reserva no está disponible')
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||Math.abs(Date.parse(date)-Date.now())>92*86400000)throw new Error('Fecha fuera del periodo de reserva')
 const start=new Date(Date.parse(date)-14*3600000).toISOString(),end=new Date(Date.parse(date)+38*3600000).toISOString()
 const busy=await getCalendarBusy(event.owner_user_id,start,end,event.destination_calendar_id)
 // Stored ranges contain buffers from the original booking, even if the event type changes later.
 const {data:ranges,error:rangeError}=await createAdminClient().from('calendar_bookings').select('occupied_range').eq('owner_user_id',event.owner_user_id).neq('status','cancelled').lt('starts_at',end).gt('ends_at',start)
 if(rangeError)throw new Error('No se pudo comprobar los intervalos')
 for(const row of ranges??[]){
  const parts=String(row.occupied_range).slice(1,-1).split(',').map(s=>s.replaceAll('"',''))
  if(parts.length!==2||parts.some(s=>!Number.isFinite(Date.parse(s))))throw new Error('No se pudo verificar la agenda')
  busy.push({start:parts[0],end:parts[1]})
 }
 return {event,slots:availableSlots(event,date,busy)}
}
async function currentBooking(id:string,owner:string){
 const {data,error}=await createAdminClient().from('calendar_bookings').select('*').eq('id',id).eq('owner_user_id',owner).single()
 if(error||!data)throw new Error('No se pudo comprobar el estado de la reserva')
 return data as Booking
}
function claimedOperation(booking:Booking){
 const operation=calendarOperation(Date.parse(booking.sync_started_at??''))
 return {signal:operation.signal,assertCurrent:async()=>{
  operation.assertLive();operation.signal.throwIfAborted()
  const {data,error}=await createAdminClient().from('calendar_bookings').select('id').eq('id',booking.id).eq('owner_user_id',booking.owner_user_id).eq('sync_claim_token',booking.sync_claim_token!).eq('status',booking.status).abortSignal(operation.signal).maybeSingle()
  if(error||!data)throw new Error('La reserva ya no pertenece a este intento')
  operation.assertLive();operation.signal.throwIfAborted()
 }}
}
export async function syncBooking(booking:Booking,event:EventType,manual=false){
 const db=createAdminClient()
 if(event.owner_user_id!==booking.owner_user_id||event.id!==booking.event_type_id)throw new Error('Reserva no autorizada')
 const {data:claim,error:claimError}=await db.rpc('claim_calendar_booking_work',{p_booking:booking.id,p_owner:booking.owner_user_id,p_operation:'sync',p_manual:manual})
 if(claimError)throw new Error('No se pudo iniciar la sincronización')
 if(!claim)return currentBooking(booking.id,booking.owner_user_id)
 try{
  const google=await createGoogleBooking(event,claim as Booking,claimedOperation(claim as Booking))
  const {data:saved,error}=await db.rpc('finish_calendar_booking_work',{p_booking:booking.id,p_claim:claim.sync_claim_token,p_success:true,p_google_event_id:google.id})
  if(error)throw new Error('save')
  return saved as Booking||currentBooking(booking.id,booking.owner_user_id)
 }catch{
  const {data:saved,error}=await db.rpc('finish_calendar_booking_work',{p_booking:booking.id,p_claim:claim.sync_claim_token,p_success:false})
  if(error)throw new Error('La sincronización está pendiente de recuperación')
  return saved as Booking||currentBooking(booking.id,booking.owner_user_id)
 }
}

export async function cancelStoredBooking(booking:Booking,event:EventType,manual=false){
 const db=createAdminClient()
 if(booking.status==='cancelled')return
 if(event.owner_user_id!==booking.owner_user_id||event.id!==booking.event_type_id)throw new Error('Reserva no autorizada')
 const {data:claim,error}=await db.rpc('claim_calendar_booking_work',{p_booking:booking.id,p_owner:booking.owner_user_id,p_operation:'cancel',p_manual:manual})
 if(error||!claim)throw new Error('La cita se está sincronizando. Intenta de nuevo en un momento.')
 try{
  const c=await calendarDestination(event,claim as Booking)
  await deleteGoogleEvent(c.connection_id,booking.owner_user_id,`calendars/${encodeURIComponent(c.google_calendar_id)}/events/${claim.google_event_id||booking.id.replace(/-/g,'')}?sendUpdates=all`,claimedOperation(claim as Booking))
  const {data:saved,error:saveError}=await db.rpc('finish_calendar_booking_work',{p_booking:booking.id,p_claim:claim.sync_claim_token,p_success:true})
  if(saveError||!saved)throw new Error('save')
 }catch{
  // Retry only cancellation, never recreate an event that Google may already have deleted.
  await db.rpc('finish_calendar_booking_work',{p_booking:booking.id,p_claim:claim.sync_claim_token,p_success:false})
  throw new Error('La cancelación está pendiente de sincronizar. Conservamos el horario hasta verificarla.')
 }
}
export async function reserveBooking(slug:string,input:Record<string,unknown>,key:string){
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(key))throw new Error('Identificador de reserva inválido')
 const name=String(input.name??'').trim(),email=String(input.email??'').trim().toLowerCase(),phone=String(input.phone??'').trim(),notes=String(input.notes??'').trim(),start=String(input.start??'')
 if(!name||name.length>120||!/^\S+@\S+\.\S+$/.test(email)||email.length>254||phone.length>30||notes.length>1500||!Number.isFinite(Date.parse(start)))throw new Error('Revisa el nombre, correo y horario')
 const event=await getEventType(slug);if(!event)throw new Error('Enlace no disponible')
 const hash=createHash('sha256').update(JSON.stringify({slug,name,email,phone,notes,start})).digest('hex')
 const db=createAdminClient()
 const {data:existing,error:lookupError}=await db.from('calendar_bookings').select('*').eq('idempotency_key',key).maybeSingle()
 if(lookupError)throw new Error('No se pudo comprobar la reserva')
 if(existing){if(existing.request_hash!==hash)throw new Error('Esta solicitud ya se utilizó con otros datos');return existing as Booking}
 const {slots}=await getAvailability(slug,localDate(start,event.timezone))
 if(!slots.includes(new Date(start).toISOString()))throw new Error('Ese horario ya no está disponible. Elige otro.')
 const {data,error}=await db.rpc('reserve_calendar_booking',{p_event_type:event.id,p_start:start,p_name:name,p_email:email,p_phone:phone,p_notes:notes,p_key:key,p_hash:hash})
 if(error)throw new Error('No se pudo reservar ese horario. Actualiza la disponibilidad.')
 return syncBooking(data as Booking,event)
}
