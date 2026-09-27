import type { Busy, EventType } from './types'

export function overlaps(start: number, end: number, busy: Busy[]) {
 return busy.some(b => start < Date.parse(b.end) && end > Date.parse(b.start))
}

// Iterate absolute instants; Intl handles DST and unusual UTC offsets without inventing wall times.
export function availableSlots(event: EventType, date: string, busy: Busy[], now = Date.now()) {
 if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date))) return []
 const formatter = new Intl.DateTimeFormat('en-CA', { timeZone:event.timezone, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23',weekday:'short' })
 const midnight = Date.parse(`${date}T00:00:00Z`)
 const result:string[]=[]
 for(let t=midnight-14*3600000;t<midnight+38*3600000;t+=15*60000){
  const p=Object.fromEntries(formatter.formatToParts(t).map(x=>[x.type,x.value]))
  if(`${p.year}-${p.month}-${p.day}`!==date) continue
  const day=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].indexOf(p.weekday)+1
  const minutes=Number(p.hour)*60+Number(p.minute)
  if(!event.weekdays.includes(day)||minutes<event.start_hour*60||minutes+event.duration_minutes>event.end_hour*60)continue
  if(t<now+event.notice_hours*3600000||t>now+event.horizon_days*86400000)continue
  const buffer=event.buffer_minutes*60000
  if(!overlaps(t-buffer,t+(event.duration_minutes*60000)+buffer,busy))result.push(new Date(t).toISOString())
 }
 return result
}

export function localDate(instant:string,timezone:string){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(instant)).map(x=>[x.type,x.value]))
 return `${p.year}-${p.month}-${p.day}`
}
