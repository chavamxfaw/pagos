'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Cierra sesión tras 2 horas de inactividad
const TIMEOUT_MS = 2 * 60 * 60 * 1000

const EVENTS = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click']

export function SessionTimeout() {
  const router = useRouter()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function resetTimer() {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.replace('/login')
        router.refresh()
      }, TIMEOUT_MS)
    }

    resetTimer()
    EVENTS.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))

    return () => {
      if (timer.current) clearTimeout(timer.current)
      EVENTS.forEach(e => window.removeEventListener(e, resetTimer))
    }
  }, [router])

  return null
}
