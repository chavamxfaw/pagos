'use client'
import { useRef,useState } from 'react'
import { localDate } from '@/lib/calendar/availability'
const field='mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-blue-600'
export function BookingForm({slug,timezone,horizon}:{slug:string;timezone:string;horizon:number}){
 const [date,setDate]=useState(''),[slots,setSlots]=useState<string[]>([]),[slot,setSlot]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState<{status:string;management_url:string}|null>(null),[loaded,setLoaded]=useState(false)
 const key=useRef(''),latest=useRef(0)
 const [dateBounds]=useState(()=>({min:localDate(new Date().toISOString(),timezone),max:localDate(new Date(Date.now()+horizon*86400000).toISOString(),timezone)}))
 async function load(value:string){
  const request=++latest.current
  setDate(value);setSlot('');setSlots([]);setLoaded(false);setError('');if(!value){setBusy(false);return}
  setBusy(true)
  try{const response=await fetch(`/api/booking/${slug}?date=${value}`,{cache:'no-store'});const body=await response.json();if(!response.ok)throw new Error(body.error);if(request===latest.current){setSlots(body.slots);setLoaded(true)}}catch(e){if(request===latest.current)setError(e instanceof Error?e.message:'No se pudo consultar')}finally{if(request===latest.current)setBusy(false)}
 }
 async function submit(form:FormData){
  if(busy)return;setBusy(true);setError('');if(!key.current)key.current=crypto.randomUUID()
  try{const response=await fetch(`/api/booking/${slug}`,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key.current},body:JSON.stringify({start:slot,name:form.get('name'),email:form.get('email'),phone:form.get('phone'),notes:form.get('notes')})});const body=await response.json();if(!response.ok)throw new Error(body.error);setResult(body)}catch(e){setError(e instanceof Error?e.message:'No pudimos confirmar. Reintenta con los mismos datos.')}finally{setBusy(false)}
 }
 if(result)return <section className="mt-8 space-y-4" role="status"><h2 className="text-xl font-semibold">{result.status==='confirmed'?'Tu cita está confirmada':'Recibimos tu solicitud'}</h2><p className="text-sm text-zinc-600">{result.status==='confirmed'?'Recibirás la invitación de calendario en tu correo.':'El horario está apartado mientras finalizamos la sincronización con Google. No necesitas volver a reservar.'}</p><a className="inline-block rounded-lg bg-blue-600 px-4 py-3 text-sm text-white" href={result.management_url}>Ver y gestionar mi cita</a></section>
 return <section className="mt-8 space-y-5"><label className="block text-sm font-medium">Elige un día<input type="date" className={field} value={date} min={dateBounds.min} max={dateBounds.max} onChange={e=>{key.current='';void load(e.target.value)}}/></label>
  {busy&&<p role="status" className="text-sm text-zinc-500">Consultando disponibilidad…</p>}{error&&<div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
  {loaded&&!slots.length&&<p className="text-sm text-zinc-500">No hay horarios disponibles ese día. Prueba otra fecha.</p>}
  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{slots.map(s=><button key={s} type="button" disabled={busy} aria-pressed={slot===s} onClick={()=>{setSlot(s);key.current=''}} className={`rounded-lg border px-3 py-3 text-sm ${slot===s?'border-blue-600 bg-blue-600 text-white':'border-zinc-200 hover:border-blue-600'}`}>{new Date(s).toLocaleTimeString('es-MX',{timeZone:timezone,hour:'2-digit',minute:'2-digit'})}</button>)}</div>
  {slot&&<form action={submit} className="space-y-4 border-t border-zinc-100 pt-5"><p className="text-sm">{new Date(slot).toLocaleString('es-MX',{timeZone:timezone})} · {timezone}</p>{[['name','Nombre','text'],['email','Correo','email'],['phone','WhatsApp (opcional)','tel']].map(([name,label,type])=><label key={name} className="block text-sm">{label}<input className={field} name={name} type={type} required={name!=='phone'} maxLength={name==='name'?120:name==='email'?254:30} disabled={busy}/></label>)}<label className="block text-sm">¿De qué te gustaría hablar?<textarea className={field} name="notes" maxLength={1500} disabled={busy}/></label><p className="text-xs text-zinc-500">Usaremos estos datos para gestionar tu cita y asociarla a tu contacto.</p><button disabled={busy} className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-50">{busy?'Confirmando…':'Confirmar reserva'}</button></form>}
 </section>
}
