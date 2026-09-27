import test from 'node:test'
import assert from 'node:assert/strict'
import { calendarReadiness } from '../lib/calendar/setup.ts'
import { localCalendarEnvironment } from './calendar-local-env.mjs'

const valid = { GOOGLE_CLIENT_ID: 'fixture-client', GOOGLE_CLIENT_SECRET: 'fixture-secret', CALENDAR_TOKEN_KEY: Buffer.alloc(32, 1).toString('base64'), NEXT_PUBLIC_APP_URL: 'http://localhost:3002' }
test('local launcher removes inherited Google credentials unless explicitly opted in', () => {
  assert.deepEqual(localCalendarEnvironment(false, valid), { GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '', CALENDAR_TOKEN_KEY: '' })
})
test('local opt-in imports only three required Google fields', () => {
  const env = localCalendarEnvironment(true, { ...valid, STRIPE_SECRET_KEY_LIVE: 'must-not-pass', NEXT_PUBLIC_APP_URL: 'https://production.example' })
  assert.equal(env.GOOGLE_CLIENT_ID, valid.GOOGLE_CLIENT_ID)
  assert.equal(Object.keys(env).length, 3)
  assert.equal(env.STRIPE_SECRET_KEY_LIVE, undefined)
})
test('opt-in fails closed for missing and invalid credentials', () => {
  assert.throws(() => localCalendarEnvironment(true, {}), /OAuth local no habilitado/)
  assert.throws(() => localCalendarEnvironment(true, { ...valid, CALENDAR_TOKEN_KEY: 'wrong' }), /32 bytes/)
})
test('readiness distinguishes valid configuration from incomplete setup without exposing secrets', () => {
  const result = calendarReadiness(valid)
  assert.equal(result.ready, true)
  assert.equal(result.callback, 'http://localhost:3002/api/calendar/google/callback')
  assert.equal(JSON.stringify(result).includes(valid.GOOGLE_CLIENT_SECRET), false)
  assert.equal(calendarReadiness({ ...valid, GOOGLE_CLIENT_ID: ' ' }).ready, false)
})
test('app URL must be a safe origin, allowing HTTP only on loopback', () => {
  for (const url of ['http://public.example', 'https://user:password@example.com', 'https://example.com/path', 'https://example.com?query=1', 'javascript:alert(1)']) assert.equal(calendarReadiness({ ...valid, NEXT_PUBLIC_APP_URL: url }).ready, false)
  assert.equal(calendarReadiness({ ...valid, NEXT_PUBLIC_APP_URL: 'https://crm.example.com/' }).ready, true)
})
