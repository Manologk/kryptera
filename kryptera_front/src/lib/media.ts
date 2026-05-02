/**
 * Helpers for backend media (POP / receipt) URLs.
 */

const IMAGE_RX = /\.(jpe?g|png|gif|webp)(\?.*)?$/i

export const mediaHref = (path: string): string => {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return path.startsWith('/') ? path : `/${path}`
}

export const isImagePath = (path: string | undefined): boolean => {
  if (!path) return false
  return IMAGE_RX.test(path)
}

export const filenameFromPath = (path: string | undefined): string => {
  if (!path) return ''
  const cleaned = path.split('?')[0]
  const parts = cleaned.split('/').filter(Boolean)
  return parts[parts.length - 1] ?? cleaned
}
