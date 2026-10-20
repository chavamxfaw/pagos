import test from 'node:test'
import assert from 'node:assert/strict'
import { reminderDate } from './reminder-preview.ts'

test('supports any whole-day offset, including same-day and month boundaries', () => {
  assert.equal(reminderDate('2026-11-01', 4), '2026-10-28')
  assert.equal(reminderDate('2026-11-01', 0), '2026-11-01')
  assert.equal(reminderDate('2026-01-01', 30), '2025-12-02')
  assert.equal(reminderDate('2028-03-01', 1), '2028-02-29')
})
test('invalid dates and unsupported schedules never produce a misleading preview', () => {
  for (const days of [-1, 31, 1.5, NaN, Infinity]) assert.equal(reminderDate('2026-11-01', days), null)
  for (const date of ['', '2026-02-30', '2026-13-01', 'bad']) assert.equal(reminderDate(date, 1), null)
})
