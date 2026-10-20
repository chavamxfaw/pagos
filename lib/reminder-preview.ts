/** Calendar-only arithmetic: no browser timezone conversion and no outbound effects. */
export function reminderDate(dueDate: string, daysBefore: number): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || !Number.isInteger(daysBefore) || daysBefore < 0 || daysBefore > 30) return null
  const date = new Date(`${dueDate}T12:00:00Z`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== dueDate) return null
  date.setUTCDate(date.getUTCDate() - daysBefore)
  return date.toISOString().slice(0, 10)
}
