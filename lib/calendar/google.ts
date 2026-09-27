import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ConnectedCalendar, Busy, Booking, EventType } from './types'
import { calendarReadiness } from './setup'

export function calendarConfigured(){return calendarReadiness().ready}
export function callbackUrl(){return `${process.env.NEXT_PUBLIC_APP_URL!.replace(/\/$/,'')}/api/calendar/google/callback`}
function encryptionKey(){const key=Buffer.from(process.env.CALENDAR_TOKEN_KEY??'','base64');if(key.length!==32)throw new Error('Configura la clave segura del calendario');return key}
export function encryptToken(token:string){
 const iv=randomBytes(12)
 const cipher=createCipheriv('aes-256-gcm',encryptionKey(),iv)
 const data=Buffer.concat([cipher.update(token,'utf8'),cipher.final()])
 return Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64')
}
function decryptToken(value:string){const b=Buffer.from(value,'base64');const d=createDecipheriv('aes-256-gcm',encryptionKey(),b.subarray(0,12));d.setAuthTag(b.subarray(12,28));return Buffer.concat([d.update(b.subarray(28)),d.final()]).toString('utf8')}

export async function tokenExchange(params:Record<string,string>,signal?:AbortSignal){
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...params,client_id:process.env.GOOGLE_CLIENT_ID!,client_secret:process.env.GOOGLE_CLIENT_SECRET!}),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000),cache:'no-store'})
 if(!response.ok)throw new Error('Google requiere reconectar la cuenta')
 return response.json() as Promise<{access_token:string;refresh_token?:string}>
}
async function connectionAccess(connectionId:string,owner:string,signal?:AbortSignal){
 const {data,error}=await createAdminClient().from('calendar_connections').select('refresh_token_encrypted').eq('id',connectionId).eq('owner_user_id',owner).single()
 if(error||!data)throw new Error('Calendario desconectado')
 return (await tokenExchange({grant_type:'refresh_token',refresh_token:decryptToken(data.refresh_token_encrypted)},signal)).access_token
}
export class GoogleCalendarError extends Error { constructor(public status:number){super('No se pudo sincronizar con Google Calendar. Revisa la conexión.')} }
export async function googleRequest<T>(connectionId:string,owner:string,path:string,init:RequestInit={},beforeRequest?:()=>Promise<void>) :Promise<T>{
 const signal=init.signal?AbortSignal.any([init.signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)
 signal.throwIfAborted()
 const access=await connectionAccess(connectionId,owner,signal)
 await beforeRequest?.()
 signal.throwIfAborted()
 const response=await fetch(`https://www.googleapis.com/calendar/v3/${path}`,{...init,headers:{Authorization:`Bearer ${access}`,'Content-Type':'application/json'},cache:'no-store',signal})
 if(!response.ok)throw new GoogleCalendarError(response.status)
 return response.status===204?undefined as T:response.json()
}
export async function getCalendarBusy(owner:string,start:string,end:string,destinationId:string,signal?:AbortSignal):Promise<Busy[]>{
 const db=createAdminClient()
 const {data,error}=await db.from('connected_calendars').select('*').eq('owner_user_id',owner)
 if(error)throw new Error('No se pudo comprobar la disponibilidad')
 const calendars=(data??[]) as ConnectedCalendar[]
 const selected=calendars.filter(c=>c.blocks_availability||c.id===destinationId)
 if(!selected.some(c=>c.id===destinationId))throw new Error('Calendario de destino desconectado')
 const busy:Busy[]=[]
 for(const connectionId of new Set(selected.map(c=>c.connection_id))){
  const ids=selected.filter(c=>c.connection_id===connectionId).map(c=>c.google_calendar_id)
  for(let offset=0;offset<ids.length;offset+=50){
   const batch=ids.slice(offset,offset+50)
   const response=await googleRequest<{calendars:Record<string,{busy:Busy[];errors?:unknown[]}>}>(connectionId,owner,'freeBusy',{signal,method:'POST',body:JSON.stringify({timeMin:start,timeMax:end,items:batch.map(id=>({id}))})})
   for(const id of batch){const calendar=response.calendars?.[id];if(!calendar||calendar.errors?.length)throw new Error('No se pudo comprobar uno de tus calendarios');busy.push(...calendar.busy)}
  }
 }
 return busy
}
export async function calendarDestination(event:EventType,booking?:Booking){
 const {data,error}=await createAdminClient().from('connected_calendars').select('*').eq('owner_user_id',event.owner_user_id).eq('id',booking?.destination_calendar_id||event.destination_calendar_id).single()
 if(error||!data||!['owner','writer'].includes(data.access_role))throw new Error('El calendario de destino no permite crear citas')
 return data as ConnectedCalendar
}
export async function createGoogleBooking(event:EventType,booking:Booking,safety:{signal:AbortSignal;assertCurrent:()=>Promise<void>}){
 const destination=await calendarDestination(event,booking)
 const id=booking.id.replace(/-/g,'')
 const path=`calendars/${encodeURIComponent(destination.google_calendar_id)}/events`
 // Stable event ID permits reconciliation after a timeout without sending another invitation.
 try {const existing=await googleRequest<{id:string;status?:string}>(destination.connection_id,event.owner_user_id,`${path}/${id}`,{signal:safety.signal});if(existing.status==='cancelled')throw new Error('La cita fue cancelada en Google');return existing}catch(error){if(!(error instanceof GoogleCalendarError)||error.status!==404)throw error}
 // Recheck on retries too: an external event may have appeared after initial reservation.
 const range=(booking as Booking & {occupied_range?:string}).occupied_range?.slice(1,-1).split(',').map(s=>s.replaceAll('"',''))
 if(!range||range.length!==2||range.some(s=>!Number.isFinite(Date.parse(s))))throw new Error('No se pudo verificar el intervalo reservado')
 const [start,end]=range
 if((await getCalendarBusy(event.owner_user_id,start,end,destination.id,safety.signal)).length)throw new Error('El horario ahora está ocupado en Google')
 try{
  return await googleRequest<{id:string}>(destination.connection_id,event.owner_user_id,`${path}?sendUpdates=all`,{signal:safety.signal,method:'POST',body:JSON.stringify({id,summary:`${event.title} · ${booking.guest_name}`,description:booking.notes,start:{dateTime:booking.starts_at,timeZone:event.timezone},end:{dateTime:booking.ends_at,timeZone:event.timezone},attendees:[{email:booking.guest_email}],extendedProperties:{private:{crm_booking_id:booking.id}},guestsCanModify:false,guestsCanInviteOthers:false})},safety.assertCurrent)
 }catch(error){
  if(error instanceof GoogleCalendarError&&error.status===409)return googleRequest<{id:string}>(destination.connection_id,event.owner_user_id,`${path}/${id}`,{signal:safety.signal})
  throw error
 }
}
export async function deleteGoogleEvent(connection:string,owner:string,path:string,safety?:{signal:AbortSignal;assertCurrent:()=>Promise<void>}){
 try{await googleRequest(connection,owner,path,{method:'DELETE',signal:safety?.signal},safety?.assertCurrent)}catch(error){if(!(error instanceof GoogleCalendarError)||![404,410].includes(error.status))throw error}
}
