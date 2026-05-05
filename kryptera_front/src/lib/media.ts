/**
 * Helpers for backend media (POP / receipt) URLs.
 */

const IMAGE_RX = /\.(jpe?g|png|gif|webp)(\?.*)?$/i

export const mediaHref = (path: string): string => {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  if (path.startsWith('/media/')) return path
  /** DRF sometimes returns storage-relative paths (e.g. pop/<uuid>/file.jpg) */
  if (!path.startsWith('/')) return `/media/${path.replace(/^\/+/, '')}`
  return path
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
