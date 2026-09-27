import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { calendarReadiness } from '../lib/calendar/setup.ts'

const args = process.argv.slice(2)
if (args.length && (args.length !== 2 || args[0] !== '--env-file')) throw new Error('Uso: node scripts/calendar-readiness.mjs [--env-file .env.calendar.local]')
const env = args.length ? parseEnv(readFileSync(args[1], 'utf8')) : process.env
const result = calendarReadiness(env)
console.log(result.ready ? 'Configuración de calendario lista para iniciar OAuth.' : 'Configuración de calendario incompleta:')
for (const issue of result.issues) console.log(`- ${issue}`)
if (result.callback) console.log(`Redirect URI: ${result.callback}`)
console.log('Esta comprobación no conecta Google ni verifica permisos, consentimiento o acceso a la API.')
process.exitCode = result.ready ? 0 : 1
