import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
const code=stripTypeScriptTypes(readFileSync(new URL('./deadline.ts',import.meta.url),'utf8'))
const {assertCalendarDeadline,calendarOperation,CALENDAR_OPERATION_MS}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
test('whole-operation budget remains much shorter than lease and includes earlier token/busy work',()=>{
 assert.equal(CALENDAR_OPERATION_MS,60000)
 assert(CALENDAR_OPERATION_MS<15*60000)
 assert.doesNotThrow(()=>assertCalendarDeadline(60000,59999))
 assert.throws(()=>assertCalendarDeadline(60000,60000))
 assert.throws(()=>assertCalendarDeadline(NaN,0))
 assert.throws(()=>calendarOperation(Date.now()-61000))
 const operation=calendarOperation();assert.doesNotThrow(operation.assertLive);assert.equal(operation.signal.aborted,false)
})
