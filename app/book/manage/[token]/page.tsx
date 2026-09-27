import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { ManageBooking } from './manage-booking'
export const dynamic='force-dynamic'
export const metadata={title:'Tu cita · Chava Cervantes',robots:{index:false,follow:false}}
export default async function ManagePage({params}:{params:Promise<{token:string}>}){
 const {token}=await params
 if(!/^[0-9a-f-]{36}$/i.test(token))notFound()
 const {data,error}=await createAdminClient().from('calendar_bookings').select('starts_at,ends_at,status,booking_event_types(title,slug,timezone)').eq('management_token',token).maybeSingle()
 if(error)throw new Error('No se pudo consultar la cita')
 if(!data)notFound()
 const event=Array.isArray(data.booking_event_types)?data.booking_event_types[0]:data.booking_event_types
 return <main className="mx-auto max-w-xl px-6 py-16"><p className="text-sm text-zinc-500">Chava Cervantes</p><h1 className="mt-3 text-2xl font-semibold">{event?.title||'Tu cita'}</h1><p className="mt-4">{new Date(data.starts_at).toLocaleString('es-MX',{timeZone:event?.timezone||'America/Monterrey'})} · {event?.timezone}</p><p className="mt-2 text-sm text-zinc-500">{data.status==='confirmed'?'Confirmada':data.status==='cancelled'?'Cancelada':'Pendiente de sincronizar'}</p><ManageBooking token={token} cancelled={data.status==='cancelled'} slug={event?.slug||''}/></main>
}
