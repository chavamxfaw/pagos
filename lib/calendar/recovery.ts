import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { calendarConfigured } from './google'
import { syncBooking,cancelStoredBooking } from './service'
import { reconcileConfirmedBookings } from './reconcile'
import type { Booking,EventType } from './types'
export async function recoverCalendarBookings(){
 if(!calendarConfigured())return {processed:0,configured:false}
 const db=createAdminClient()
 const reset=await db.rpc('reap_calendar_booking_leases')
 if(reset.error)throw new Error('No se pudo recuperar las reservas pendientes')
 const {data,error}=await db.from('calendar_bookings').select('*').in('status',['pending','sync_failed','cancelling']).eq('recovery_review_required',false).lte('next_retry_at',new Date().toISOString()).order('next_retry_at').order('created_at').limit(10)
 if(error)throw new Error('No se pudo consultar las reservas pendientes')
 let processed=0
 for(const b of (data??[]) as Booking[]){
  const {data:e,error:eventError}=await db.from('booking_event_types').select('*').eq('id',b.event_type_id).eq('owner_user_id',b.owner_user_id).maybeSingle()
  if(eventError)throw new Error('No se pudo consultar la configuración de la reserva')
  if(!e){const saved=await db.from('calendar_bookings').update({recovery_review_required:true,next_retry_at:null,last_sync_error:'dependency_unavailable'}).eq('id',b.id).is('sync_claim_token',null);if(saved.error)throw new Error('No se pudo marcar la reserva para revisión');continue}
  if(b.status==='cancelling'){
   try{await cancelStoredBooking(b,e as EventType);processed++}catch{/* Backoff/review queue retains cancellation intent and occupied interval. */}
  }else{try{const result=await syncBooking(b,e as EventType);if(result.status==='confirmed')processed++}catch{/* Lease recovery handles an interrupted database acknowledgement. */}}
 }
 const reconciled=await reconcileConfirmedBookings()
 return {processed,configured:true,reconciled}
}
