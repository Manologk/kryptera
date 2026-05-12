import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getTransaction } from '@/services/api'
import type { TransactionStatus } from '@/types'

const hasPopPath = (popPath: string | undefined): boolean =>
  Boolean(popPath && String(popPath).trim() !== '')

/** When provided, countdown stops as soon as parent `transaction` reflects POP upload or non-pending status (no refetch needed). */
export type TransactionCountdownSync = {
  status: TransactionStatus
  popPath?: string
}

export const formatSecondsAsHhMmSs = (totalSeconds: number): string => {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export type UseTransactionCountdownResult = {
  secondsRemaining: number | null
  isExpired: boolean
  isLoading: boolean
  loadError: string | null
  formattedRemaining: string | null
}

/** Fetches GET /transactions/:id/, then ticks seconds_remaining until zero or until sync shows POP / non-pending. */
export const useTransactionCountdown = (
  transactionId: string | undefined,
  sync?: TransactionCountdownSync | null,
): UseTransactionCountdownResult => {
  const { accessToken } = useAuth()
  const [display, setDisplay] = useState<number | null>(null)
  const [activeCount, setActiveCount] = useState(false)
  const [isExpired, setIsExpired] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const syncRef = useRef(sync)
  syncRef.current = sync

  const stopCountdownForCompletedPhase = () => {
    setActiveCount(false)
    setDisplay(null)
    setIsExpired(false)
  }

  useEffect(() => {
    if (sync == null) return
    const s = sync
    if (s.status === 'canceled') {
      setActiveCount(false)
      setDisplay(0)
      setIsExpired(true)
      return
    }
    if (s.status !== 'pending' || hasPopPath(s.popPath)) {
      stopCountdownForCompletedPhase()
    }
  }, [sync?.status, sync?.popPath, transactionId])

  useEffect(() => {
    setIsExpired(false)
    setActiveCount(false)
    setDisplay(null)
    setLoadError(null)
    if (!transactionId || !accessToken) {
      setIsLoading(false)
      return
    }
    let cancelled = false
    setIsLoading(true)
    void getTransaction(accessToken, transactionId).then(res => {
      if (cancelled) return
      setIsLoading(false)
      if (res.error || !res.data) {
        setLoadError(res.error?.message ?? 'Could not load transaction')
        return
      }
      const tx = res.data
      const parent = syncRef.current
      const parentDone =
        parent != null && (parent.status !== 'pending' || hasPopPath(parent.popPath))
      const responseDone = tx.status !== 'pending' || hasPopPath(tx.popPath)
      if (parentDone || responseDone) {
        if (parent?.status === 'canceled' || tx.status === 'canceled') {
          setIsExpired(true)
          setDisplay(0)
        } else {
          stopCountdownForCompletedPhase()
        }
        return
      }
      const sr = tx.secondsRemaining
      if (typeof sr === 'number') {
        setDisplay(sr)
        if (sr <= 0) {
          setIsExpired(true)
        } else {
          setActiveCount(true)
        }
      } else {
        setDisplay(null)
      }
    })
    return () => {
      cancelled = true
    }
  }, [transactionId, accessToken])

  useEffect(() => {
    if (!activeCount) return
    const id = window.setInterval(() => {
      setDisplay(prev => {
        const s = syncRef.current
        if (s != null && (s.status !== 'pending' || hasPopPath(s.popPath))) {
          setActiveCount(false)
          return null
        }
        if (prev == null || prev <= 0) return prev
        const n = prev - 1
        if (n <= 0) {
          setActiveCount(false)
          setIsExpired(true)
          return 0
        }
        return n
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [activeCount, transactionId])

  const formattedRemaining =
    display != null && display > 0 ? formatSecondsAsHhMmSs(display) : null

  return {
    secondsRemaining: display,
    isExpired,
    isLoading,
    loadError,
    formattedRemaining,
  }
}
