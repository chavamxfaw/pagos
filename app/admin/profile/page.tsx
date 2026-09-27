import { redirect } from 'next/navigation'
import { getUserSettings } from '@/lib/user-settings'
import { saveDisplayName, saveNotificationSettings } from '@/actions/user-settings'
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
    <div className="mx-auto max-w-4xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <div className="mb-8">
        <p className="text-sm font-medium text-primary">Configuración</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Mi perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">Acceso y nombre visible</p>
      </div>

      <div className="space-y-6">
        {/* Identity card */}
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border bg-primary/5 px-5 py-6">
            <div className="flex items-center gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg font-semibold text-primary">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="break-words text-xl font-semibold text-foreground">{displayName}</p>
                <p className="break-all text-sm text-muted-foreground">{email}</p>
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
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-6 py-5">
            <h2 className="text-lg font-semibold text-foreground">Nombre visible en notificaciones</h2>
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
            <Button type="submit" className="mt-4 min-h-11 bg-primary text-primary-foreground hover:bg-primary/90">
              Guardar nombre
            </Button>
          </form>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-6 py-5">
            <h2 className="text-lg font-semibold text-foreground">Notificaciones</h2>
          </div>
          <form action={saveNotificationSettings} className="grid gap-5 p-6">
            <div className="grid min-w-0 gap-2">
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
              <label className="flex items-start gap-3 rounded-lg border border-border bg-white p-4">
                <input
                  type="checkbox"
                  name="notify_stripe_email"
                  defaultChecked={settings.notify_stripe_email}
                  className="mt-1 size-4 rounded border-input accent-primary"
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Mail className="size-4 text-primary" />
                    Correo por pagos Stripe
                  </span>
                  <span className="mt-1 block break-all text-xs text-muted-foreground">{email}</span>
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-lg border border-border bg-white p-4">
                <input
                  type="checkbox"
                  name="notify_stripe_whatsapp"
                  defaultChecked={settings.notify_stripe_whatsapp}
                  className="mt-1 size-4 rounded border-input accent-primary"
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <MessageCircle className="size-4 text-primary" />
                    WhatsApp por pagos Stripe
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">Requiere teléfono y Twilio activo.</span>
                </span>
              </label>
            </div>

            <Button type="submit" className="min-h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto">
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
    <div className="rounded-lg border border-border bg-muted/40 p-4">
      <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
        {icon}
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}
