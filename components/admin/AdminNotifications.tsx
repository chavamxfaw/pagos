import Link from 'next/link'
import { AlertTriangle, Bell, CheckCircle2, Info } from 'lucide-react'
import { dismissAdminNotifications } from '@/actions/admin-notifications'
import { getAdminNotifications, type AdminNotification } from '@/lib/admin-notifications'
import { cn } from '@/lib/utils'

export async function AdminNotifications() {
  const notifications = await getAdminNotifications()
  const count = notifications.reduce((sum, item) => sum + (item.count ?? 1), 0)

  return (
    <details className="group relative isolate z-[120] hidden sm:block">
      <summary
        className="relative inline-flex size-10 cursor-pointer list-none items-center justify-center rounded-full border border-[#E6EAF0] bg-white text-[#1A1F36] shadow-sm transition-colors hover:bg-[#F8FAFF] [&::-webkit-details-marker]:hidden"
        aria-label="Notificaciones"
      >
        <Bell className="size-4" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] text-[10px] font-bold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </summary>

      <div className="absolute right-0 top-12 z-[999] w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#E6EAF0] bg-white shadow-[0_24px_60px_rgba(26,31,54,0.14)]">
        <div className="flex items-start justify-between gap-3 border-b border-[#E6EAF0] px-4 py-3">
          <div>
            <p className="text-sm font-bold text-[#1A1F36]">Notificaciones</p>
            <p className="text-xs text-[#6B7280]">
              {count > 0 ? `${count} punto${count === 1 ? '' : 's'} por revisar` : 'Todo al día'}
            </p>
          </div>
          {notifications.length > 0 && (
            <form action={dismissAdminNotifications}>
              <button
                type="submit"
                className="min-h-8 rounded-lg px-2 text-xs font-semibold text-[#4A8BFF] transition-colors hover:bg-[#EEF2FF]"
              >
                Limpiar
              </button>
            </form>
          )}
        </div>

        {notifications.length ? (
          <div className="max-h-[min(70dvh,420px)] overflow-y-auto overscroll-contain p-2">
            {notifications.map((notification) => (
              <NotificationLink key={notification.id} notification={notification} />
            ))}
          </div>
        ) : (
          <div className="px-4 py-8 text-center">
            <CheckCircle2 className="mx-auto mb-2 size-8 text-[#2ED39A]" />
            <p className="text-sm font-semibold text-[#1A1F36]">Sin pendientes importantes</p>
            <p className="mt-1 text-xs text-[#6B7280]">Sin alertas activas.</p>
          </div>
        )}
      </div>
    </details>
  )
}

function NotificationLink({ notification }: { notification: AdminNotification }) {
  const Icon = notification.tone === 'danger' ? AlertTriangle : notification.tone === 'warning' ? Bell : Info

  return (
    <Link
      href={notification.href}
      className="flex gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-[#F8FAFF]"
    >
      <span
        className={cn(
          'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl',
          notification.tone === 'danger' && 'bg-[#EF4444]/10 text-[#EF4444]',
          notification.tone === 'warning' && 'bg-[#F4B740]/10 text-[#B77900]',
          notification.tone === 'info' && 'bg-[#EEF2FF] text-[#4A8BFF]'
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[#1A1F36]">{notification.title}</span>
        <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-[#6B7280]">{notification.description}</span>
      </span>
    </Link>
  )
}
