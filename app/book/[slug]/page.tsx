import { notFound } from 'next/navigation'
import { getEventType } from '@/lib/calendar/service'
import { BookingForm } from './booking-form'
export const dynamic='force-dynamic'
export const metadata={title:'Reserva una reunión · Chava Cervantes',robots:{index:false,follow:false}}
export default async function BookingPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params
 let event
 try{event=await getEventType(slug)}catch{return <main className="mx-auto max-w-xl px-6 py-20"><h1 className="text-2xl font-semibold">Agenda temporalmente no disponible</h1><p className="mt-3 text-zinc-600">No podemos verificar los horarios en este momento. Intenta más tarde.</p></main>}
 if(!event)notFound()
 return <main className="min-h-screen bg-zinc-50 px-4 py-10 sm:py-20"><div className="mx-auto max-w-3xl rounded-2xl border border-zinc-200 bg-white p-6 sm:p-10"><p className="text-sm font-medium text-zinc-500">Chava Cervantes</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">{event.title}</h1><p className="mt-3 whitespace-pre-wrap text-sm text-zinc-600">{event.description}</p><p className="mt-3 text-sm text-zinc-500">{event.duration_minutes} minutos · Horarios en {event.timezone}</p><BookingForm slug={slug} timezone={event.timezone} horizon={event.horizon_days}/></div></main>
}
