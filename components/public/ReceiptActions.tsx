'use client'

import { Copy, Download, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ReceiptActions({
  title,
  text,
}: {
  title: string
  text: string
}) {
  async function copyReceipt() {
    await navigator.clipboard.writeText(`${title}\n\n${text}\n${window.location.href}`)
  }

  async function shareReceipt() {
    if (navigator.share) {
      await navigator.share({
        title,
        text,
        url: window.location.href,
      })
      return
    }

    await copyReceipt()
  }

  return (
    <div className="print:hidden grid gap-2 sm:grid-cols-3">
      <Button
        type="button"
        onClick={() => window.print()}
        className="min-h-11 justify-center bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] text-white shadow-sm hover:brightness-105"
      >
        <Download className="size-4" />
        Descargar PDF
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={copyReceipt}
        className="min-h-11 justify-center border-[#D8DEE8] bg-white text-[#1A1F36] hover:bg-[#F8FAFF]"
      >
        <Copy className="size-4" />
        Copiar recibo
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={shareReceipt}
        className="min-h-11 justify-center border-[#D8DEE8] bg-white text-[#1A1F36] hover:bg-[#F8FAFF]"
      >
        <Share2 className="size-4" />
        Compartir
      </Button>
    </div>
  )
}
