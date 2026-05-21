import { ROUTES } from '@/constants/routes'
import type { KycStatus, User } from '@/types'

export function isKycVerified(user: User | null): boolean {
  return user?.kycStatus === 'verified'
}

export function pathRequiresKyc(pathname: string): boolean {
  if (pathname === ROUTES.transfer) return true
  if (pathname.startsWith('/transfer/') && pathname.endsWith('/confirmation')) return true
  return false
}

export function kycBadgeClass(status: KycStatus): string {
  switch (status) {
    case 'verified':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900'
    case 'pending':
      return 'border-amber-200 bg-amber-50 text-amber-900'
    case 'rejected':
      return 'border-destructive/30 bg-destructive/10 text-destructive'
    default:
      return 'border-border bg-muted text-muted-foreground'
  }
}

export function kycStatusLabel(status: KycStatus): string {
  switch (status) {
    case 'not_submitted':
      return 'Not submitted'
    case 'pending':
      return 'Under review'
    case 'verified':
      return 'Verified'
    case 'rejected':
      return 'Rejected'
    default:
      return status
  }
}
