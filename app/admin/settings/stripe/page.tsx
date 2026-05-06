import Link from 'next/link'
import { StripeSettingsForm } from '@/components/admin/StripeSettingsForm'
import { getStripeSettings } from '@/lib/stripe/config'

export default async function StripeSettingsPage() {
  const settings = await getStripeSettings()

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      <div className="mb-6">
        <Link href="/admin/profile" className="text-sm text-[#6B7280] transition-colors hover:text-[#1A1F36]">
          ← Perfil
        </Link>
      </div>

      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6C5CE7]">Configuración</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#1A1F36]">Stripe</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Define cómo se cobran pagos con tarjeta desde los links públicos de órdenes.
        </p>
      </div>

      <StripeSettingsForm settings={settings} />
    </div>
  )
}
