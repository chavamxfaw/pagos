'use client'

import { useState } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function PublicShareActions({
  title,
  text,
  label = 'Compartir resumen',
}: {
  title: string
  text: string
  label?: string
}) {
  const [copied, setCopied] = useState(false)

  async function copySummary() {
    const shareText = `${text}\n${window.location.href}`
    await navigator.clipboard.writeText(shareText)
    setCopied(true)
    toast.success('Resumen copiado')
    window.setTimeout(() => setCopied(false), 1800)
  }

  async function shareSummary() {
    if (navigator.share) {
      await navigator.share({
        title,
        text,
        url: window.location.href,
      })
      toast.success('Resumen compartido')
      return
    }

    await copySummary()
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Button
        type="button"
        onClick={shareSummary}
        className="w-full justify-center bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] font-semibold text-white shadow-sm hover:brightness-105"
      >
        <Share2 className="size-4" />
        {label}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={copySummary}
        className="w-full justify-center border-[#D8DEE8] bg-white text-[#1A1F36] hover:bg-[#F8FAFF]"
      >
        {copied ? <Check className="size-4 text-[#2ED39A]" /> : <Copy className="size-4" />}
        {copied ? 'Copiado' : 'Copiar resumen'}
      </Button>
    </div>
  )
}
