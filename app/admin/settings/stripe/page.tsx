import Link from 'next/link'
import { StripeSettingsForm } from '@/components/admin/StripeSettingsForm'
import { getStripeSettings } from '@/lib/stripe/config'

export default async function StripeSettingsPage() {
  const settings = await getStripeSettings()

  return (
    <div className="mx-auto max-w-4xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <div className="mb-6">
        <Link href="/admin/profile" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
          ← Perfil
        </Link>
      </div>

      <div className="mb-8">
        <p className="text-sm font-medium text-primary">Configuración</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Stripe</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Define cómo se cobran pagos con tarjeta desde los links públicos de órdenes.
        </p>
      </div>

      <StripeSettingsForm settings={settings} />
    </div>
  )
}
