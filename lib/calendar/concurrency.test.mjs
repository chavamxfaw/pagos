import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import test from 'node:test'

// Dedicated, network-isolated disposable container only. Never use a shared DB.
const container = 'pagos-calendar-audit-isolated'
const quote = value => `'${String(value).replaceAll("'", "''")}'`
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
function processSql(sql, application = 'crm-calendar-concurrency-test') {
  const child = spawn('docker', ['exec','-i','-e',`PGAPPNAME=${application}`,container,'psql','-h','/tmp','-U','postgres','-d','postgres', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', ...(sql === undefined ? [] : ['-c', sql])])
  let stdout = '', stderr = ''
  child.stdout.on('data', chunk => { stdout += chunk })
  child.stderr.on('data', chunk => { stderr += chunk })
  const done = new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('close', code => resolve({ code, stdout: stdout.trim(), stderr: stderr.trim() }))
  })
  return { child, done, output: () => stdout }
}
async function sql(statement) {
  const result = await processSql(statement).done
  assert.equal(result.code, 0, result.stderr)
  return result.stdout
}
async function until(check, label) {
  const deadline = Date.now() + 8000
  while (Date.now() < deadline) { if (await check()) return; await pause(50) }
  throw new Error(`Timed out waiting for ${label}`)
}

test('real concurrent reservations serialize retries and reject competing slots without trusting guest identity', { timeout: 45000 }, async () => {
  assert.equal(await sql('select current_database()'), 'postgres')
  for (const scenario of ['same-key', 'different-keys']) {
    const owner = randomUUID(), connection = randomUUID(), calendar = randomUUID(), event = randomUUID()
    const run = randomUUID(), firstKey = randomUUID(), secondKey = scenario === 'same-key' ? firstKey : randomUUID()
    const firstEmail = `calendar-test-${run}-first@example.invalid`
    const secondEmail = scenario === 'same-key' ? firstEmail : `calendar-test-${run}-second@example.invalid`
    const firstApp = `cal-race-${run}-a`, secondApp = `cal-race-${run}-b`
    let gate, first, second
    try {
      await sql(`begin;
        insert into auth.users(id,email) values (${quote(owner)},${quote(`owner-${run}@example.invalid`)});
        insert into public.app_admin_users(user_id) values (${quote(owner)});
        insert into public.calendar_connections(id,owner_user_id,account_email,refresh_token_encrypted) values (${quote(connection)},${quote(owner)},${quote(`owner-${run}@example.invalid`)},'fixture-never-used');
        insert into public.connected_calendars(id,owner_user_id,connection_id,google_calendar_id,name,access_role) values (${quote(calendar)},${quote(owner)},${quote(connection)},${quote(run)},'Concurrency test','owner');
        insert into public.booking_event_types(id,owner_user_id,title,destination_calendar_id,timezone,weekdays,start_hour,end_hour,notice_hours,horizon_days,buffer_minutes) values (${quote(event)},${quote(owner)},'Concurrency test',${quote(calendar)},'UTC','{1,2,3,4,5,6,7}',0,24,0,30,0);
        commit;`)
      const start = await sql("select (date_trunc('day',now()) + interval '2 days 12 hours')::text")
      gate = processSql(undefined)
      gate.child.stdin.write(`begin; select pg_advisory_xact_lock(hashtextextended(${quote(owner)},0));\n\\echo LOCKED\n`)
      await until(() => gate.output().includes('LOCKED'), 'advisory gate')
      const reserve = (key, email) => `set role service_role; select public.reserve_calendar_booking(${quote(event)},${quote(start)},'Concurrency guest',${quote(email)},'','',${quote(key)},${quote(scenario === 'same-key' ? 'identical-request' : email)})::text;`
      first = processSql(reserve(firstKey, firstEmail), firstApp)
      second = processSql(reserve(secondKey, secondEmail), secondApp)
      // Both independent database backends must actually be blocked on the same lock.
      await until(async () => Number(await sql(`select count(*) from pg_stat_activity where application_name in (${quote(firstApp)},${quote(secondApp)}) and wait_event='advisory'`)) === 2, 'both concurrent reservation backends')
      gate.child.stdin.end('commit;\n\\q\n')
      await gate.done
      const results = await Promise.all([first.done, second.done])
      const successes = results.filter(result => result.code === 0)
      assert.equal(successes.length, scenario === 'same-key' ? 2 : 1, JSON.stringify(results))
      if (scenario === 'same-key') assert.equal(JSON.parse(successes[0].stdout).id, JSON.parse(successes[1].stdout).id)
      else assert.match(results.find(result => result.code !== 0).stderr, /exclusion constraint/i)
      const counts = JSON.parse(await sql(`select json_build_object(
        'bookings',(select count(*) from public.calendar_bookings where owner_user_id=${quote(owner)}),
        'clients',(select count(*) from public.clients where email in (${quote(firstEmail)},${quote(secondEmail)})),
        'orphans',(select count(*) from public.clients c where c.email in (${quote(firstEmail)},${quote(secondEmail)}) and not exists(select 1 from public.calendar_bookings b where b.client_id=c.id))
      )::text`))
      assert.deepEqual(counts, { bookings: 1, clients: 0, orphans: 0 })
      const bookingId=JSON.parse(successes[0].stdout).id
      const work=await Promise.all([processSql(`set role service_role;select public.claim_calendar_booking_work(${quote(bookingId)},${quote(owner)},'sync',false)::text;`).done,processSql(`set role service_role;select public.claim_calendar_booking_work(${quote(bookingId)},${quote(owner)},'sync',false)::text;`).done])
      assert(work.every(result=>result.code===0),JSON.stringify(work))
      assert.equal(work.filter(result=>result.stdout).length,1,'two workers claimed the same booking')
    } finally {
      if (gate && gate.child.exitCode === null) { gate.child.stdin.end('rollback;\n\\q\n'); await gate.done }
      await Promise.all([first?.done, second?.done].filter(Boolean))
      // Exact generated fixture identifiers and emails only, in dependency order.
      await sql(`begin;
        delete from public.calendar_bookings where owner_user_id=${quote(owner)};
        delete from public.booking_event_types where id=${quote(event)} and owner_user_id=${quote(owner)};
        delete from public.connected_calendars where id=${quote(calendar)} and owner_user_id=${quote(owner)};
        delete from public.calendar_connections where id=${quote(connection)} and owner_user_id=${quote(owner)};
        delete from public.clients where email in (${quote(firstEmail)},${quote(secondEmail)});
        delete from public.app_admin_users where user_id=${quote(owner)};
        delete from auth.users where id=${quote(owner)};
        commit;`)
    }
  }
})
