import { useCallback, useEffect, useState } from 'react'
import { CONTACT_INFO } from '@/constants'
import { cn } from '@/lib/utils'

interface ContactLink {
  icon: string
  label: string
  href: string
  hint: string
  external: boolean
}

const links: ContactLink[] = [
  { icon: '✉', label: 'Email', href: `mailto:${CONTACT_INFO.email}`, hint: CONTACT_INFO.email, external: false },
  { icon: '📞', label: 'Phone', href: `tel:${CONTACT_INFO.phone}`, hint: CONTACT_INFO.phone, external: false },
  {
    icon: '💬',
    label: 'WhatsApp',
    href: `https://wa.me/${CONTACT_INFO.whatsapp}`,
    hint: 'Chat on WhatsApp',
    external: true,
  },
  {
    icon: '✈',
    label: 'Telegram',
    href: `https://t.me/${CONTACT_INFO.telegram.replace(/^@/, '')}`,
    hint: CONTACT_INFO.telegram,
    external: true,
  },
]

export default function ContactWidget() {
  const [open, setOpen] = useState(false)

  const handleClose = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, handleClose])

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Dismiss support panel"
          className="fixed inset-0 z-[65] bg-black/25 backdrop-blur-[1px] animate-in fade-in duration-200 motion-reduce:animate-none lg:bg-black/20"
          onClick={handleClose}
        />
      ) : null}

      <div
        className={cn(
          'pointer-events-none fixed right-4 z-[70] flex flex-col items-end gap-3',
          'max-lg:bottom-[calc(60px+16px+env(safe-area-inset-bottom,0px))]',
          'lg:bottom-6 lg:right-6',
        )}
      >
        <div className="pointer-events-auto flex flex-col items-end gap-3">
          {open ? (
            <div
              id="contact-widget-panel"
              role="dialog"
              aria-label="Support contacts"
              className={cn(
                'w-[min(calc(100vw-32px),260px)] overflow-hidden rounded-[var(--radius-lg)] border border-border',
                'bg-card text-card-foreground shadow-lg',
                'animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 motion-reduce:animate-none',
              )}
            >
              <div className="border-b border-border px-5 py-3">
                <p className="text-sm font-bold tracking-tight">Support</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Available 24/7</p>
              </div>

              <ul className="py-1">
                {links.map(({ icon, label, href, hint, external }, i) => (
                  <li key={label}>
                    <a
                      href={href}
                      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      className={cn(
                        'flex items-center gap-3 px-5 py-2.5 text-sm transition-colors duration-150',
                        'hover:bg-muted/80 active:bg-muted',
                        'animate-in fade-in slide-in-from-bottom-1 motion-reduce:animate-none',
                        'duration-200',
                      )}
                      style={{ animationDelay: `${80 + i * 45}ms` }}
                      onClick={() => setOpen(false)}
                    >
                      <span className="flex w-7 shrink-0 justify-center text-base" aria-hidden>
                        {icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{label}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">{hint}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            aria-controls={open ? 'contact-widget-panel' : undefined}
            id="contact-widget-fab"
            className={cn(
              'pointer-events-auto flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border-0',
              'bg-primary text-primary-foreground shadow-[0_4px_24px_rgba(159,232,112,0.45)]',
              'transition-all duration-300 ease-out motion-reduce:transition-none',
              'hover:scale-105 hover:shadow-[0_6px_28px_rgba(159,232,112,0.55)] active:scale-95',
              open && 'rotate-90 bg-foreground text-background shadow-lg',
            )}
          >
            <span className="text-[22px] leading-none transition-transform duration-300 ease-out" aria-hidden>
              {open ? '×' : '💬'}
            </span>
            <span className="sr-only">{open ? 'Close support' : 'Open support'}</span>
          </button>
        </div>
      </div>
    </>
  )
}
