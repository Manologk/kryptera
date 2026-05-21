import type { ApiError } from '@/types'
import { notifyAuthFailure } from '@/services/authBridge'

/** True when the API rejected or could not use the JWT (access or refresh). */
export function isTokenRelatedError(error: ApiError | undefined): boolean {
  if (!error) return false
  if (error.code === '401') return true

  const msg = error.message.toLowerCase()
  return (
    msg.includes('token') ||
    msg.includes('not valid') ||
    msg.includes('authentication credentials') ||
    msg.includes('credentials were not provided') ||
    msg.includes('token_not_valid')
  )
}

/** Clear session and send the user to login when a token error cannot be recovered. */
export function handleTokenAuthFailure(error: ApiError | undefined): void {
  if (!isTokenRelatedError(error)) return
  notifyAuthFailure()
}
