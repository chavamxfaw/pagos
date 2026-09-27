type Environment = Record<string, string | undefined>

/** Configuration readiness only: never returns credentials or implies OAuth consent. */
export function calendarReadiness(env: Environment = process.env) {
  const issues: string[] = []
  if (!env.GOOGLE_CLIENT_ID?.trim()) issues.push('Falta GOOGLE_CLIENT_ID')
  if (!env.GOOGLE_CLIENT_SECRET?.trim()) issues.push('Falta GOOGLE_CLIENT_SECRET')
  const key = env.CALENDAR_TOKEN_KEY?.trim() ?? ''
  if (!/^[A-Za-z0-9+/]{43}=$/.test(key) || Buffer.from(key, 'base64').length !== 32) issues.push('CALENDAR_TOKEN_KEY debe contener 32 bytes en base64')
  let callback: string | null = null
  try {
    const url = new URL(env.NEXT_PUBLIC_APP_URL ?? '')
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.search || url.hash || !['', '/'].includes(url.pathname)) throw new Error('origin')
    callback = `${url.origin}/api/calendar/google/callback`
  } catch { issues.push('NEXT_PUBLIC_APP_URL debe ser el origen HTTPS de la app o un origen HTTP local') }
  return { ready: issues.length === 0, issues, callback }
}
