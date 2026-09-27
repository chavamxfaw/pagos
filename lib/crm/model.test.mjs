import assert from 'node:assert/strict'
import test from 'node:test'
import { parseCrmInput, parseKind, parseId } from './model.ts'
function form(values) { const data = new FormData(); for (const [key, value] of Object.entries(values)) data.set(key, value); return data }
test('rejects forged kind, status and owner-like identifiers', () => {
  assert.throws(() => parseKind('__proto__'))
  assert.throws(() => parseId('bad-id'))
  assert.throws(() => parseCrmInput('tasks', form({ title: 'Task', status: 'won' })))
})
test('rejects impossible dates and invalid monetary values', () => {
  for (const date of ['2026-02-30', 'invalid']) assert.throws(() => parseCrmInput('tasks', form({ title: 'Task', status: 'pending', due_date: date })))
  for (const amount of ['-1', 'NaN', '1e5', '10.001', '9999999999']) assert.throws(() => parseCrmInput('projects', form({ title: 'Project', status: 'planned', amount })))
})
test('normalizes input and drops caller-supplied ownership', () => {
  const parsed = parseCrmInput('opportunities', form({ title: '  Website  ', status: 'new', amount: '100.25', owner_user_id: 'attacker' }))
  assert.equal(parsed.title, 'Website')
  assert.equal(parsed.value_amount, 100.25)
  assert.equal(parsed.client_id, null)
  assert.equal(parsed.owner_user_id, undefined)
})
test('validates related project and opportunity identifiers', () => {
  assert.throws(() => parseCrmInput('tasks', form({ title: 'Task', status: 'pending', project_id: 'foreign-string' })))
  const data = parseCrmInput('proposals', form({ title: 'Proposal', status: 'draft', amount: '500', project_id: '72000000-0000-4000-8000-000000000001' }))
  assert.equal(data.project_id, '72000000-0000-4000-8000-000000000001')
  assert.equal(data.opportunity_id, null)
})
