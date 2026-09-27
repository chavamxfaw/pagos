import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { calendarConfigured,calendarDestination,googleRequest,GoogleCalendarError } from './google'
import type { Booking,EventType } from './types'

// External edits are pulled on dashboard refresh and by the recovery job. Availability
// independently queries Google's live free/busy on every public request.
export async function reconcileConfirmedBookings(owner?:string){
 if(!calendarConfigured())return {processed:0,errors:0}
 const db=createAdminClient()
 let query=db.from('calendar_bookings').select('*').eq('status','confirmed').gte('ends_at',new Date(Date.now()-86400000).toISOString()).order('starts_at').limit(200)
 if(owner)query=query.eq('owner_user_id',owner)
 const {data,error}=await query
 if(error)throw new Error('No se pudo consultar las citas para sincronizar')
 let processed=0,errors=0
 for(const booking of (data??[]) as (Booking & {occupied_range:string})[]){
  try{
   const {data:e,error:eventError}=await db.from('booking_event_types').select('*').eq('id',booking.event_type_id).eq('owner_user_id',booking.owner_user_id).single()
   if(eventError||!e)throw new Error('event')
   const calendar=await calendarDestination(e as EventType,booking)
   let remote:{status?:string;start?:{dateTime?:string};end?:{dateTime?:string}}
   try{remote=await googleRequest(calendar.connection_id,booking.owner_user_id,`calendars/${encodeURIComponent(calendar.google_calendar_id)}/events/${booking.google_event_id||booking.id.replace(/-/g,'')}`)}
   catch(error){if(error instanceof GoogleCalendarError&&error.status===410)remote={status:'cancelled'};else throw error}
   if(remote.status==='cancelled'){
    const saved=await db.from('calendar_bookings').update({status:'cancelled'}).eq('id',booking.id).eq('status','confirmed')
    if(saved.error)throw saved.error
    processed++;continue
   }
   const start=Date.parse(remote.start?.dateTime??''),end=Date.parse(remote.end?.dateTime??'')
   if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)throw new Error('unsupported_time')
   if(start===Date.parse(booking.starts_at)&&end===Date.parse(booking.ends_at))continue
   const range=booking.occupied_range.slice(1,-1).split(',').map(s=>Date.parse(s.replaceAll('"','')))
   if(range.length!==2||range.some(n=>!Number.isFinite(n)))throw new Error('range')
   const before=Date.parse(booking.starts_at)-range[0],after=range[1]-Date.parse(booking.ends_at)
   const saved=await db.from('calendar_bookings').update({starts_at:new Date(start).toISOString(),ends_at:new Date(end).toISOString(),occupied_range:`[${new Date(start-before).toISOString()},${new Date(end+after).toISOString()})`}).eq('id',booking.id).eq('status','confirmed').eq('starts_at',booking.starts_at).eq('ends_at',booking.ends_at)
   // An externally introduced overlap cannot silently displace another reservation.
   if(saved.error)throw saved.error
   processed++
  }catch{errors++}
 }
 return {processed,errors}
}
