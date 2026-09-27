'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function CopyLinkButton({
  path,
  label = 'Copiar link',
}: {
  path: string
  label?: string
}) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  async function handleCopy() {
    const url = `${window.location.origin}${path}`
    setError('')
    try { await navigator.clipboard.writeText(url) } catch {
      setError('No se pudo copiar. Permite el acceso al portapapeles e inténtalo otra vez.')
      return
    }
    setCopied(true)
    toast.success('Link copiado', {
      description: 'Ya puedes compartirlo con el cliente.',
    })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="w-full sm:w-auto"><Button
      type="button"
      variant="outline"
      onClick={handleCopy}
      className="w-full justify-center border-border text-foreground hover:bg-muted hover:text-foreground sm:w-auto"
    >
      {copied ? (
        <>
          <svg className="w-4 h-4 text-emerald-700 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          ¡Copiado!
        </>
      ) : (
        <>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {label}
        </>
      )}
    </Button>{error && <p role="alert" className="mt-2 max-w-xs text-xs text-destructive">{error}</p>}<span className="sr-only" role="status">{copied ? 'Enlace copiado al portapapeles.' : ''}</span></div>
  )
}
