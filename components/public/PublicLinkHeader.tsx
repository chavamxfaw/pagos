import Image from 'next/image'
import { ShieldCheck } from 'lucide-react'

export function PublicLinkHeader() {
  return (
    <header className="mb-5 flex items-center justify-between gap-3">
      <div className="flex min-h-12 items-center">
        <Image
          src="/otla-logo.png"
          alt="OTLA"
          width={118}
          height={56}
          className="h-10 w-auto object-contain"
          priority
        />
      </div>

      <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#EAFBF5] px-3 text-xs font-semibold text-[#129B70]">
        <ShieldCheck className="size-3.5" />
        Link seguro
      </span>
    </header>
  )
}
