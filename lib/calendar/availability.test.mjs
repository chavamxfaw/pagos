import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const source=ts.transpileModule(readFileSync(new URL('./availability.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
const {availableSlots,localDate}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
const type={timezone:'America/Monterrey',weekdays:[1,2,3,4,5],start_hour:9,end_hour:18,duration_minutes:30,buffer_minutes:15,notice_hours:0,horizon_days:30}
const now=Date.parse('2026-09-10T00:00:00Z')
test('a Google all-day busy event removes the entire local day',()=>{assert.equal(availableSlots(type,'2026-09-11',[{start:'2026-09-11T06:00:00Z',end:'2026-09-12T06:00:00Z'}],now).length,0)})
test('busy intervals from any calendar block slots and buffers',()=>{const slots=availableSlots(type,'2026-09-11',[{start:'2026-09-11T16:00:00Z',end:'2026-09-11T17:00:00Z'}],now);assert(!slots.includes('2026-09-11T15:30:00.000Z'));assert(!slots.includes('2026-09-11T17:00:00.000Z'));assert(slots.includes('2026-09-11T17:15:00.000Z'))})
test('weekend, notice, horizon and invalid dates are unavailable',()=>{assert.deepEqual(availableSlots(type,'2026-09-12',[],now),[]);assert.deepEqual(availableSlots(type,'invalid',[],now),[]);assert.deepEqual(availableSlots({...type,notice_hours:720},'2026-09-11',[],now),[]);assert.deepEqual(availableSlots({...type,horizon_days:1},'2026-09-18',[],now),[])})
test('calendar timezone determines local date, including DST offset',()=>{assert.equal(localDate('2026-09-11T01:00:00Z','America/Monterrey'),'2026-09-10');const slots=availableSlots({...type,timezone:'America/New_York'},'2026-09-11',[],now);assert(slots.includes('2026-09-11T13:00:00.000Z'));assert(!slots.includes('2026-09-11T12:00:00.000Z'))})
