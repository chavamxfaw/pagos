import { requireAgent,jsonOk,jsonError,readJsonObject } from '@/lib/agent/api'
import { getAvailability } from '@/lib/calendar/service'
export async function GET(request:Request){
 const context=await requireAgent(request);if(context instanceof Response)return context
 if(!process.env.NEXT_PUBLIC_APP_URL)return jsonError('Configura la URL pública',503)
 const {data:bookings,error}=await context.admin.from('calendar_bookings').select('id,client_id,guest_name,starts_at,ends_at,status,event_type_id').eq('owner_user_id',context.ownerId).gte('ends_at',new Date().toISOString()).order('starts_at').limit(100)
 const {data:types,error:typesError}=await context.admin.from('booking_event_types').select('id,slug,title,duration_minutes,timezone,enabled').eq('owner_user_id',context.ownerId)
 if(error||typesError)return jsonError('No se pudo consultar tu agenda',503)
 const appUrl=process.env.NEXT_PUBLIC_APP_URL!.replace(/\/$/,'')
 return jsonOk({bookings,event_types:(types??[]).map(e=>({...e,url:`${appUrl}/book/${e.slug}`}))})
}
export async function POST(request:Request){
 const context=await requireAgent(request);if(context instanceof Response)return context
 const body=await readJsonObject(request);if(!body||typeof body.event_type_id!=='string')return jsonError('Indica event_type_id')
 const {data:event,error}=await context.admin.from('booking_event_types').select('slug,title').eq('id',body.event_type_id).eq('owner_user_id',context.ownerId).eq('enabled',true).maybeSingle()
 if(error||!event)return jsonError('Tipo de reunión no encontrado',404)
 try{
  const availability=typeof body.date==='string'?await getAvailability(event.slug,body.date):null
  return jsonOk({title:event.title,url:`${process.env.NEXT_PUBLIC_APP_URL!.replace(/\/$/,'')}/book/${event.slug}`,...(availability?{slots:availability.slots,timezone:availability.event.timezone}:{}),sent:false})
 }catch{return jsonError('No se pudo verificar la disponibilidad',503)}
}
