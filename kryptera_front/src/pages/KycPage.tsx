import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/context/AuthContext'
import { kycStatusLabel } from '@/lib/kyc'
import Layout, { PageHeader } from '@/components/layout/Layout'
import Card, { CardContent } from '@/components/ui/card'
import Input from '@/components/ui/input'
import Button from '@/components/ui/button'
import { Alert } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { UploadBusyOverlay } from '@/components/ui/upload-busy-overlay'
import { KYC_DOC_ACCEPT, submitKyc } from '@/services/api'

const COUNTRY_OPTIONS = [
  { value: 'ZM', label: 'Zambia' },
  { value: 'RU', label: 'Russia' },
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'OTHER', label: 'Other' },
]

export default function KycPage() {
  const { user, accessToken, refreshProfile } = useAuth()
  const [legalName, setLegalName] = useState(user?.kycLegalName ?? user?.fullName ?? '')
  const [idNumber, setIdNumber] = useState(user?.kycIdNumber ?? '')
  const [country, setCountry] = useState(user?.kycCountry ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const status = user?.kycStatus ?? 'not_submitted'
  const canSubmit = status === 'not_submitted' || status === 'rejected'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!accessToken) {
      setError('Please sign in to continue.')
      return
    }
    if (!file) {
      setError('Please upload your ID document.')
      return
    }
    setBusy(true)
    try {
      const res = await submitKyc(accessToken, {
        legalName: legalName.trim(),
        idNumber: idNumber.trim(),
        country: country.trim(),
        file,
      })
      if (res.error) {
        setError(res.error.message)
        return
      }
      await refreshProfile()
      toast.success('Verification submitted. We will review your documents shortly.')
      setFile(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Layout maxWidth={520}>
      <PageHeader
        title="Identity verification"
        subtitle="Verify your identity before sending money. Review usually takes one business day."
      />

      {status === 'verified' ? (
        <Card elevated>
          <CardContent className="space-y-4 pt-5">
            <Alert type="success" message="Your identity is verified. You can send transfers." />
            <Button type="button" asChild fullWidth={false}>
              <Link to={ROUTES.home}>Back to Send</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {status === 'pending' ? (
        <Card elevated>
          <CardContent className="space-y-3 pt-5">
            <Alert
              type="info"
              message={`Your documents are under review (${kycStatusLabel(status)}).`}
            />
            {user?.kycLegalName ? (
              <dl className="space-y-2 text-sm text-muted-foreground">
                <div>
                  <dt className="font-medium text-foreground">Legal name</dt>
                  <dd>{user.kycLegalName}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">ID number</dt>
                  <dd>{user.kycIdNumber ?? '—'}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Country</dt>
                  <dd>{user.kycCountry ?? '—'}</dd>
                </div>
              </dl>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {canSubmit ? (
        <Card elevated>
          <CardContent className="pt-5">
            {status === 'rejected' && user?.kycRejectionReason ? (
              <div className="mb-4">
                <Alert type="error" message={user.kycRejectionReason} />
              </div>
            ) : null}

            <form className="relative space-y-4" onSubmit={handleSubmit} id="kyc-form">
              <UploadBusyOverlay busy={busy} label="Uploading documents…" />
              <div className="space-y-2">
                <Label htmlFor="kyc-legal-name">Legal name (as on ID)</Label>
                <Input
                  id="kyc-legal-name"
                  value={legalName}
                  onChange={e => setLegalName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kyc-id-number">ID / passport number</Label>
                <Input
                  id="kyc-id-number"
                  value={idNumber}
                  onChange={e => setIdNumber(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kyc-country">Country of ID</Label>
                <select
                  id="kyc-country"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  required
                >
                  <option value="">Select country</option>
                  {COUNTRY_OPTIONS.map(c => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="kyc-doc">ID document (JPEG, PNG, WEBP, or PDF, max 10MB)</Label>
                <Input
                  id="kyc-doc"
                  type="file"
                  accept={KYC_DOC_ACCEPT}
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                  required
                />
              </div>
              {error ? <Alert type="error" message={error} onClose={() => setError(null)} /> : null}
              <Button type="submit" loading={busy} disabled={busy} className="w-full">
                Submit for verification
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </Layout>
  )
}
