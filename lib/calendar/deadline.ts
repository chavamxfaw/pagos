// Whole-provider-operation budget, not merely a timeout for each HTTP request.
// Keep comfortably below the 15-minute database lease.
export const CALENDAR_OPERATION_MS=60_000
export function assertCalendarDeadline(deadline:number,now=Date.now()){
 if(!Number.isFinite(deadline)||now>=deadline)throw new Error('Calendar operation deadline exceeded')
}
export function calendarOperation(startedAt=Date.now()){
 const deadline=startedAt+CALENDAR_OPERATION_MS
 assertCalendarDeadline(deadline)
 return {signal:AbortSignal.timeout(Math.max(1,deadline-Date.now())),assertLive:()=>assertCalendarDeadline(deadline)}
}
