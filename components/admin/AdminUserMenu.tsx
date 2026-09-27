'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, LogOut, UserRound } from 'lucide-react'

export function AdminUserMenu({
  email,
  displayName,
  initials,
}: {
  email: string
  displayName: string
  initials: string
}) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  async function handleLogout() {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-full border border-transparent px-1 py-1 transition-colors hover:border-border hover:bg-muted"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white ">
          {initials}
        </span>
        <span className="hidden min-w-0 text-left md:block">
          <span className="block max-w-36 truncate text-sm font-semibold text-foreground">{displayName}</span>
        </span>
        <ChevronDown className="hidden size-4 text-muted-foreground md:block" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-xl border border-border bg-white shadow-[0_18px_45px_rgba(26,31,54,0.14)]"
        >
          <div className="border-b border-border bg-muted px-4 py-4">
            <p className="text-sm font-semibold text-foreground">{displayName}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{email}</p>
          </div>
          <div className="p-2">
            <Link
              href="/admin/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              role="menuitem"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-secondary text-primary">
                <UserRound className="size-4" />
              </span>
              Mi perfil
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[#EF4444] transition-colors hover:bg-[#FEF2F2]"
              role="menuitem"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-[#FEF2F2] text-[#EF4444]">
                <LogOut className="size-4" />
              </span>
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
