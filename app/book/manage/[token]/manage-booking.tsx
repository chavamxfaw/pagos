'use client'
import { useState } from 'react'
export function ManageBooking({token,cancelled,slug}:{token:string;cancelled:boolean;slug:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('')
 async function cancel(){if(busy||!confirm('¿Quieres cancelar esta cita?'))return;setError('');setBusy(true);try{const r=await fetch(`/api/booking/manage/${token}`,{method:'POST'});if(!r.ok)throw new Error('No se pudo cancelar ahora. Intenta de nuevo más tarde.');location.reload()}catch(e){setError(e instanceof Error?e.message:'No se pudo cancelar la cita.');setBusy(false)}}
 return <div className="mt-8 space-y-4">{error&&<p role="alert" className="text-sm text-red-600">{error}</p>}{!cancelled?<><button disabled={busy} onClick={cancel} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm disabled:opacity-50">{busy?'Cancelando…':'Cancelar cita'}</button><p className="text-sm text-zinc-500">Para cambiar de fecha, cancela esta cita y elige un nuevo horario.</p></>:<a href={`/book/${slug}`} className="text-blue-600">Elegir un nuevo horario</a>}</div>
}
