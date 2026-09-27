import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
const source=ts.transpileModule(readFileSync(new URL('./display.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
const {dateKey,addDays,validDay,weekStart,monthDays,shiftMonth,onDay}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
test('due dates remain on their date, independent of timezone',()=>{assert.equal(dateKey('2026-09-11'),'2026-09-11');assert.equal(dateKey('2026-09-11T01:00:00Z'),'2026-09-10')})
test('month grid starts Monday and includes six complete weeks',()=>{const days=monthDays('2026-09-10');assert.equal(days.length,42);assert.equal(days[0],'2026-08-31');assert.equal(days[41],'2026-10-11');assert.equal(weekStart('2026-09-13'),'2026-09-07')})
test('navigation handles year boundaries and leap days',()=>{assert.equal(shiftMonth('2026-12-31',1),'2027-01-01');assert.equal(addDays('2028-02-28',1),'2028-02-29');assert.equal(validDay('2026-02-30','2026-09-10'),'2026-09-10');assert.equal(validDay(['2026-09-11'],'2026-09-10'),'2026-09-10')})
test('all-day end is exclusive, including payment deadlines',()=>{const e={start:'2026-09-11',end:'2026-09-13',allDay:true};assert(onDay(e,'2026-09-11'));assert(onDay(e,'2026-09-12'));assert(!onDay(e,'2026-09-13'))})
test('timed events span days but do not spill past a midnight end',()=>{const e={start:'2026-09-11T05:00:00Z',end:'2026-09-11T06:00:00Z',allDay:false};assert(onDay(e,'2026-09-10'));assert(!onDay(e,'2026-09-11'))})
