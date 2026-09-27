'use client'
import { useState,useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft,ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { addDays,monthDays,weekStart,shiftMonth,onDay,DISPLAY_TIMEZONE,type CalendarEntry } from '@/lib/calendar/display'

const labels={payment:'Cobro pendiente',booking:'Cita',google:'Google'}
const tones={payment:'border-amber-200 bg-amber-50 text-amber-900',booking:'border-blue-200 bg-blue-50 text-blue-900',google:'border-emerald-200 bg-emerald-50 text-emerald-900'}
const formatted=(day:string,options:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat('es-MX',{...options,timeZone:'UTC'}).format(new Date(`${day}T12:00:00Z`))

export function CalendarView({entries,anchor,today,warning,undated}:{entries:CalendarEntry[];anchor:string;today:string;warning:string;undated:number}){
 const router=useRouter(),[pending,startTransition]=useTransition()
 const [view,setView]=useState<'month'|'week'|'day'>('month'),[selected,setSelected]=useState(anchor)
 const [filters,setFilters]=useState({payment:true,booking:true,google:true})
 const filtered=entries.filter(e=>filters[e.kind])
 const days=view==='month'?monthDays(anchor):view==='week'?Array.from({length:7},(_,i)=>addDays(weekStart(anchor),i)):[anchor]
 const eventsFor=(day:string)=>filtered.filter(e=>onDay(e,day)).sort((a,b)=>Number(b.allDay)-Number(a.allDay)||a.start.localeCompare(b.start))
 const navigate=(day:string)=>{setSelected(day);startTransition(()=>router.push(`/admin/calendar?date=${day}`))}
 const move=(direction:number)=>navigate(view==='month'?shiftMonth(anchor,direction):addDays(anchor,direction*(view==='week'?7:1)))
 const selectedDay=days.includes(selected)?selected:anchor
 const title=view==='month'?formatted(anchor,{month:'long',year:'numeric'}):view==='day'?formatted(anchor,{day:'numeric',month:'long',year:'numeric'}):`${formatted(days[0],{day:'numeric',month:'short'})} – ${formatted(days[6],{day:'numeric',month:'short',year:'numeric'})}`
 return <section className="space-y-4" aria-label="Calendario unificado" aria-busy={pending}>
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div className="flex items-center gap-2"><Button variant="outline" size="icon" aria-label="Periodo anterior" disabled={pending} onClick={()=>move(-1)}><ChevronLeft/></Button><Button variant="outline" disabled={pending} onClick={()=>navigate(today)}>Hoy</Button><Button variant="outline" size="icon" aria-label="Periodo siguiente" disabled={pending} onClick={()=>move(1)}><ChevronRight/></Button></div>
   <h2 className="text-lg font-semibold capitalize" aria-live="polite">{title}</h2>
   <div className="flex gap-1" aria-label="Tipo de vista">{(['month','week','day'] as const).map((mode,i)=><Button key={mode} variant={view===mode?'secondary':'ghost'} aria-pressed={view===mode} onClick={()=>setView(mode)}>{['Mes','Semana','Día'][i]}</Button>)}</div>
  </div>
  <div className="flex flex-wrap items-center gap-4 text-sm">{(Object.keys(labels) as (keyof typeof labels)[]).map(kind=><label key={kind} className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={filters[kind]} onChange={e=>setFilters({...filters,[kind]:e.target.checked})}/>{labels[kind]}</label>)}<span className="text-xs text-muted-foreground">Hora de Monterrey · los cobros no bloquean reservas</span></div>
  {pending&&<p role="status" className="text-sm text-primary">Cargando periodo…</p>}
  {warning&&<div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{warning} <button className="underline" onClick={()=>startTransition(()=>router.refresh())}>Reintentar</button></div>}
  {undated>0&&<p className="text-sm text-muted-foreground">{undated} órdenes pendientes sin fecha. <Link className="text-primary underline" href="/admin/orders">Asignar vencimiento en Pagos</Link></p>}
  {view!=='day'&&<div className={`overflow-hidden rounded-xl border border-border bg-white ${pending?'opacity-60':''}`}>
   <div className="grid grid-cols-7 border-b border-border bg-muted/30">{['Lu','Ma','Mi','Ju','Vi','Sá','Do'].map(d=><span key={d} className="p-2 text-center text-xs text-muted-foreground">{d}</span>)}</div>
   <div className="grid grid-cols-7">{days.map(day=>{const items=eventsFor(day);return <div key={day} className={`min-w-0 border-b border-r border-border p-1 sm:min-h-28 sm:p-2 ${day.slice(0,7)!==anchor.slice(0,7)?'bg-muted/30':''} ${day===selectedDay?'bg-secondary/40':''}`}>
    <button aria-label={`${formatted(day,{day:'numeric',month:'long'})}, ${items.length} eventos`} aria-pressed={day===selectedDay} onClick={()=>setSelected(day)} className={`flex min-h-11 w-full items-center justify-center rounded-md text-sm focus-visible:outline-2 focus-visible:outline-primary sm:w-11 ${day===today?'bg-primary text-white':'hover:bg-secondary'}`}>{Number(day.slice(-2))}</button>
    <div className="flex justify-center gap-0.5 pb-2 sm:hidden">{items.slice(0,3).map(e=><span key={e.id} className={`size-1.5 rounded-full ${e.kind==='payment'?'bg-amber-500':e.kind==='booking'?'bg-blue-500':'bg-emerald-500'}`}/>)}{items.length>3&&<span className="text-[9px]">+</span>}</div>
    <div className="hidden space-y-1 sm:block">{items.slice(0,3).map(e=><button key={e.id} onClick={()=>setSelected(day)} title={`${labels[e.kind]}: ${e.title} · ${e.detail}`} className={`block w-full truncate rounded border px-1.5 py-1 text-left text-xs focus-visible:outline-2 focus-visible:outline-primary ${tones[e.kind]}`}>{labels[e.kind]} · {e.title}</button>)}{items.length>3&&<button onClick={()=>setSelected(day)} className="text-xs text-primary">+{items.length-3} más</button>}</div>
   </div>})}</div>
  </div>}
  <div className="rounded-xl border border-border bg-white p-4"><h3 className="mb-3 font-medium capitalize">{formatted(view==='day'?anchor:selectedDay,{weekday:'long',day:'numeric',month:'long'})}</h3>
   {!eventsFor(view==='day'?anchor:selectedDay).length&&<p className="text-sm text-muted-foreground">No hay eventos con los filtros seleccionados para este día.</p>}
   <ul className="space-y-2">{eventsFor(view==='day'?anchor:selectedDay).map(e=><li key={e.id} className={`rounded-lg border p-3 ${tones[e.kind]}`}><p className="text-xs">{labels[e.kind]} · {e.allDay?'Todo el día':new Date(e.start).toLocaleTimeString('es-MX',{timeZone:DISPLAY_TIMEZONE,hour:'2-digit',minute:'2-digit'})}</p><p className="mt-1 break-words text-sm font-semibold">{e.title}</p><p className="mt-1 break-words text-sm">{e.detail}</p>{e.href&&<Link className="mt-2 inline-flex min-h-11 items-center text-sm font-medium underline focus-visible:outline-2" href={e.href}>{e.kind==='payment'?'Abrir orden':'Abrir contacto'}</Link>}</li>)}</ul>
  </div>
 </section>
}
