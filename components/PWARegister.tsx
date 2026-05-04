'use client'

import { useEffect } from 'react'

export function PWARegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    if (process.env.NODE_ENV !== 'production') return

    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Error registrando service worker:', error)
    })
  }, [])

  return null
}
