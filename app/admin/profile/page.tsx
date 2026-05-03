import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Mail, ShieldCheck, UserRound } from 'lucide-react'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const email = user.email ?? ''
  const displayName = email.split('@')[0].split(/[._-]/).filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join(' ')
  const initials = displayName.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() || email[0]?.toUpperCase()

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[#1A1F36]">Mi perfil</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Datos de acceso del administrador.</p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white bg-white shadow-[0_18px_45px_rgba(26,31,54,0.08)] ring-1 ring-[#E6EAF0]/80">
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
          <ProfileItem icon={<UserRound className="size-5" />} label="Nombre" value={displayName} />
          <ProfileItem icon={<Mail className="size-5" />} label="Correo" value={email} />
          <ProfileItem icon={<ShieldCheck className="size-5" />} label="Acceso" value="Administrador" />
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
