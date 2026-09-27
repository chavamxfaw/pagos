import { createAdminClient } from '@/lib/supabase/admin'
import { cancelStoredBooking } from '@/lib/calendar/service'
import { enforceIpRateLimit } from '@/lib/security/rate-limit'
import type { EventType,Booking } from '@/lib/calendar/types'
export async function POST(request:Request,{params}:{params:Promise<{token:string}>}){
 const limit=await enforceIpRateLimit({request,scope:'public_link',limit:15,windowSeconds:300,blockSeconds:600,failClosed:true});if(limit)return limit
 if(request.headers.get('origin')!==new URL(process.env.NEXT_PUBLIC_APP_URL!).origin)return Response.json({error:'Origen no permitido'},{status:403})
 const {token}=await params;if(!/^[0-9a-f-]{36}$/i.test(token))return new Response(null,{status:404})
 try{
  const db=createAdminClient(),{data:b,error}=await db.from('calendar_bookings').select('*').eq('management_token',token).single()
  if(error||!b)return new Response(null,{status:404})
  if(b.status==='cancelled')return Response.json({cancelled:true})
  const {data:event}=await db.from('booking_event_types').select('*').eq('id',b.event_type_id).eq('owner_user_id',b.owner_user_id).single()
  if(!event)throw new Error('event')
  await cancelStoredBooking(b as Booking,event as EventType)
  return Response.json({cancelled:true})
 }catch{return Response.json({error:'No se pudo cancelar la cita'},{status:503})}
}
