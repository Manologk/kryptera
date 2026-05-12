import { useState } from 'react'
import { filenameFromPath, isImagePath, mediaHref } from '@/lib/media'
import { downloadTransactionPop } from '@/services/api'
import type { Transaction } from '@/types'
import Button from '@/components/ui/button'
import Card, { CardContent, CardHeader } from '@/components/ui/card'

const isPdfPath = (path: string | undefined): boolean => {
  if (!path) return false
  return filenameFromPath(path).toLowerCase().endsWith('.pdf')
}

export type ProofOfPaymentCardProps = {
  transaction: Transaction
  /** When set, Download uses the API with Bearer auth (fixes cross-origin / no-JWT on plain /media links). */
  accessToken?: string
  /** Shown under the title; defaults to a generic line. */
  subtitle?: string
}

export const ProofOfPaymentCard = ({ transaction, accessToken, subtitle }: ProofOfPaymentCardProps) => {
  const path = transaction.popPath
  if (!path) return null

  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const popUrl = mediaHref(path)
  const popIsImage = isImagePath(path)
  const popIsPdf = isPdfPath(path)
  const popFileName = filenameFromPath(path)

  const handleDownloadClick = async () => {
    if (!accessToken) return
    setDownloadError(null)
    setDownloading(true)
    const res = await downloadTransactionPop(transaction.id, accessToken, popFileName || 'proof-of-payment')
    setDownloading(false)
    if (res.error) {
      setDownloadError(res.error.message)
    }
  }

  return (
    <Card>
      <CardHeader
        title="Your proof of payment"
        subtitle={
          subtitle ??
          'Thumbnail shows your upload when it is an image. Use Download for a copy (including PDF).'
        }
      />
      <CardContent className="pt-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {popIsImage ? (
              <div className="shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                <img
                  src={popUrl}
                  alt="Proof of payment thumbnail"
                  className="h-16 w-16 object-cover sm:h-20 sm:w-20"
                />
              </div>
            ) : (
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-[10px] font-bold uppercase tracking-wide text-muted-foreground sm:h-20 sm:w-20 sm:text-xs"
                aria-hidden
              >
                {popIsPdf ? 'PDF' : 'File'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="m-0 truncate text-sm font-medium text-foreground">
                {popFileName || 'Proof of payment'}
              </p>
              {!popIsImage && popIsPdf ? (
                <p className="mt-1 m-0 text-xs text-muted-foreground">PDF — download to open.</p>
              ) : null}
              {!popIsImage && !popIsPdf ? (
                <p className="mt-1 m-0 text-xs text-muted-foreground">Download to open this file.</p>
              ) : null}
              {downloadError ? (
                <p className="mt-1 m-0 text-xs text-destructive" role="alert">
                  {downloadError}
                </p>
              ) : null}
            </div>
          </div>
          {accessToken ? (
            <Button
              type="button"
              variant="secondary"
              className="w-full shrink-0 sm:w-auto"
              disabled={downloading}
              aria-busy={downloading}
              aria-label={downloading ? 'Downloading proof of payment' : 'Download proof of payment'}
              onClick={() => void handleDownloadClick()}
            >
              {downloading ? 'Downloading…' : 'Download'}
            </Button>
          ) : (
            <Button asChild variant="secondary" type="button" className="w-full shrink-0 sm:w-auto">
              <a href={popUrl} download={popFileName || 'proof-of-payment'} rel="noopener noreferrer">
                Download
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
