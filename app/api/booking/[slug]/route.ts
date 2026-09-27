import { getAvailability,reserveBooking } from '@/lib/calendar/service'
import { enforceIpRateLimit } from '@/lib/security/rate-limit'
import { readLimitedText } from '@/lib/security/request-body'
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}})
export async function GET(request:Request,{params}:{params:Promise<{slug:string}>}){
 const limit=await enforceIpRateLimit({request,scope:'public_link',limit:60,windowSeconds:300,blockSeconds:300,failClosed:true});if(limit)return limit
 try{const {slots,event}=await getAvailability((await params).slug,new URL(request.url).searchParams.get('date')??'');return json({slots,timezone:event.timezone})}catch{return json({error:'No se puede verificar la disponibilidad. Intenta de nuevo más tarde.'},503)}
}
export async function POST(request:Request,{params}:{params:Promise<{slug:string}>}){
 const limit=await enforceIpRateLimit({request,scope:'public_link',limit:15,windowSeconds:300,blockSeconds:600,failClosed:true});if(limit)return limit
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(process.env.NEXT_PUBLIC_APP_URL!).origin)return json({error:'Origen no permitido'},403)
 try{const body=JSON.parse(await readLimitedText(request,6000));if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'Datos inválidos'},400)
 const booking=await reserveBooking((await params).slug,body,request.headers.get('Idempotency-Key')??'')
 return json({status:booking.status,starts_at:booking.starts_at,management_url:`/book/manage/${booking.management_token}`},booking.status==='confirmed'?201:202)
 }catch(error){return json({error:error instanceof Error?error.message:'No se pudo reservar'},400)}
}
