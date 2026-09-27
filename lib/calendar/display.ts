export const DISPLAY_TIMEZONE = 'America/Monterrey'
export type CalendarEntry = {id:string; title:string; start:string; end:string; allDay:boolean; kind:'payment'|'booking'|'google'; detail:string; href?:string}
export function dateKey(value:string|Date) {
  if(typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  return new Intl.DateTimeFormat('en-CA',{timeZone:DISPLAY_TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value))
}
export function addDays(day:string,count:number){const d=new Date(`${day}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+count);return d.toISOString().slice(0,10)}
export function validDay(value:unknown,fallback:string){return typeof value==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value?value:fallback}
export function weekStart(day:string){const weekday=new Date(`${day}T12:00:00Z`).getUTCDay();return addDays(day,-((weekday+6)%7))}
export function monthDays(day:string){const first=weekStart(`${day.slice(0,7)}-01`);return Array.from({length:42},(_,i)=>addDays(first,i))}
export function shiftMonth(day:string,amount:number){const d=new Date(`${day.slice(0,7)}-01T12:00:00Z`);d.setUTCMonth(d.getUTCMonth()+amount);return d.toISOString().slice(0,10)}
export function onDay(entry:CalendarEntry,day:string){
  const start=dateKey(entry.start)
  // Google all-day end dates and timed midnight ends are exclusive.
  const last=entry.allDay?addDays(dateKey(entry.end),-1):dateKey(new Date(Date.parse(entry.end)-1))
  return start<=day && last>=day
}
