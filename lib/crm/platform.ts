import 'server-only'
import { requireAdmin } from '@/lib/auth/admin'

export async function requirePlatformOwner() {
  const user = await requireAdmin()
  const owner = process.env.PLATFORM_OWNER_USER_ID?.trim()
  if (!owner) throw new Error('Configura la cuenta maestra para administrar la plataforma.')
  if (user.id !== owner) throw new Error('No autorizado.')
  return user
}
