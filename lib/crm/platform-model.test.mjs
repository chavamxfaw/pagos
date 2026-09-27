import assert from 'node:assert/strict'
import test from 'node:test'
import { parsePlatformAccount } from './platform-model.ts'
const form = (fields) => { const result = new FormData(); for (const [key, value] of Object.entries(fields)) result.set(key, value); return result }
test('platform account rejects forged status and malformed contact', () => {
  assert.throws(() => parsePlatformAccount(form({ name: 'Business', status: '__proto__', plan: 'Initial' })))
  assert.throws(() => parsePlatformAccount(form({ name: 'Business', status: 'active', plan: 'Initial', contact_email: 'wrong' })))
})
test('platform account accepts explicit commercial fields without accepting owner input', () => {
  const parsed = parsePlatformAccount(form({ name: '  Business ', status: 'active', plan: 'Initial', owner_user_id: 'forged' }))
  assert.equal(parsed.name, 'Business')
  assert.equal(parsed.owner_user_id, undefined)
})
