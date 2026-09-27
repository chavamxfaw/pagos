import { calendarReadiness } from '../lib/calendar/setup.ts'

export function localCalendarEnvironment(optIn, source = {}) {
  const empty = { GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '', CALENDAR_TOKEN_KEY: '' }
  if (!optIn) return empty
  const env = Object.fromEntries(Object.keys(empty).map(name => [name, source[name]?.trim() || '']))
  const readiness = calendarReadiness({ ...env, NEXT_PUBLIC_APP_URL: 'http://localhost:3002' })
  if (!readiness.ready) throw new Error(`OAuth local no habilitado: ${readiness.issues.join('; ')}`)
  return env
}
