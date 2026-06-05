import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type UploadBusyOverlayProps = {
  busy: boolean
  label?: string
  className?: string
}

export function UploadBusyOverlay({
  busy,
  label = 'Uploading…',
  className,
}: UploadBusyOverlayProps) {
  if (!busy) return null

  return (
    <div
      className={cn(
        'absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-[inherit] bg-background/85 backdrop-blur-[1px]',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="h-8 w-8 animate-spin text-[#163300]" aria-hidden />
      <p className="text-sm font-medium text-[#163300]">{label}</p>
    </div>
  )
}
