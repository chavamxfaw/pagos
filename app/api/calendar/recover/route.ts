import { requireAdmin } from '@/lib/auth/admin'
import { recoverCalendarBookings } from '@/lib/calendar/recovery'
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(process.env.NEXT_PUBLIC_APP_URL!).origin)return new Response(null,{status:403})
 try{await requireAdmin()}catch{return new Response(null,{status:401})}
 try{return Response.json(await recoverCalendarBookings())}catch{return Response.json({error:'No se pudo recuperar la sincronización'},{status:503})}
}
