import { redirect } from 'next/navigation'
import { getUserSettings, saveDisplayName, saveNotificationSettings } from '@/actions/user-settings'
import { requireAdmin } from '@/lib/auth/admin'
import { Mail, MessageCircle, ShieldCheck, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default async function ProfilePage() {
  let user
  try {
    user = await requireAdmin()
  } catch {
    redirect('/login')
  }

  const email = user.email ?? ''
  const settings = await getUserSettings(user.id, email)
  const displayName = settings.display_name || email
  const initials = displayName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() || email[0]?.toUpperCase()

  async function handleSave(formData: FormData) {
    'use server'
    const name = formData.get('display_name') as string
    await saveDisplayName(name)
  }

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6C5CE7]">Configuración</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#1A1F36]">Mi perfil</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Acceso y nombre visible</p>
      </div>

      <div className="space-y-6">
        {/* Identity card */}
        <div className="overflow-hidden rounded-3xl border border-[#E3E8F0] bg-white/90 shadow-[0_10px_30px_rgba(26,31,54,0.025)]">
          <div className="bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] px-6 py-8">
            <div className="flex items-center gap-4">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-white/18 text-xl font-bold text-white ring-1 ring-white/25">
                {initials}
              </div>
              <div>
                <p className="text-xl font-bold text-white">{displayName}</p>
                <p className="text-sm text-white/70">{email}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-3">
            <ProfileItem icon={<UserRound className="size-5" />} label="Nombre visible" value={displayName} />
            <ProfileItem icon={<Mail className="size-5" />} label="Correo" value={email} />
            <ProfileItem icon={<ShieldCheck className="size-5" />} label="Acceso" value="Administrador" />
          </div>
        </div>

        {/* Display name form */}
        <div className="overflow-hidden rounded-3xl border border-[#E3E8F0] bg-white/90 shadow-[0_10px_30px_rgba(26,31,54,0.025)]">
          <div className="border-b border-[#E6EAF0] px-6 py-5">
            <h2 className="text-lg font-bold text-[#1A1F36]">Nombre visible en notificaciones</h2>
          </div>
          <form action={handleSave} className="p-6">
            <div className="space-y-2">
              <Label htmlFor="display_name">Nombre visible</Label>
              <Input
                id="display_name"
                name="display_name"
                defaultValue={displayName}
                placeholder="Salvador Cervantes"
                className="max-w-sm"
                required
              />
            </div>
            <Button type="submit" className="mt-4 bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] text-white hover:opacity-90">
              Guardar nombre
            </Button>
          </form>
        </div>

        <div className="overflow-hidden rounded-3xl border border-[#E3E8F0] bg-white/90 shadow-[0_10px_30px_rgba(26,31,54,0.025)]">
          <div className="border-b border-[#E6EAF0] px-6 py-5">
            <h2 className="text-lg font-bold text-[#1A1F36]">Notificaciones</h2>
          </div>
          <form action={saveNotificationSettings} className="grid gap-5 p-6">
            <div className="grid gap-2">
              <Label htmlFor="admin_phone">WhatsApp del administrador</Label>
              <Input
                id="admin_phone"
                name="admin_phone"
                type="tel"
                defaultValue={settings.admin_phone ?? ''}
                placeholder="+52 81 0000 0000"
                className="max-w-sm"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-start gap-3 rounded-2xl border border-[#E6EAF0] bg-white p-4">
                <input
                  type="checkbox"
                  name="notify_stripe_email"
                  defaultChecked={settings.notify_stripe_email}
                  className="mt-1 size-4 rounded border-[#D8DEE8] accent-[#6C5CE7]"
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-semibold text-[#1A1F36]">
                    <Mail className="size-4 text-[#6C5CE7]" />
                    Correo por pagos Stripe
                  </span>
                  <span className="mt-1 block text-xs text-[#6B7280]">{email}</span>
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-2xl border border-[#E6EAF0] bg-white p-4">
                <input
                  type="checkbox"
                  name="notify_stripe_whatsapp"
                  defaultChecked={settings.notify_stripe_whatsapp}
                  className="mt-1 size-4 rounded border-[#D8DEE8] accent-[#6C5CE7]"
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-semibold text-[#1A1F36]">
                    <MessageCircle className="size-4 text-[#6C5CE7]" />
                    WhatsApp por pagos Stripe
                  </span>
                  <span className="mt-1 block text-xs text-[#6B7280]">Requiere teléfono y Twilio activo.</span>
                </span>
              </label>
            </div>

            <Button type="submit" className="w-full bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] text-white hover:opacity-90 sm:w-auto">
              Guardar notificaciones
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

function ProfileItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#E6EAF0] bg-[#F8FAFF] p-4">
      <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-white text-[#6C5CE7] shadow-sm">
        {icon}
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-[#1A1F36]">{value}</p>
    </div>
  )
}
