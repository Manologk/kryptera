import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ADMIN_PAGE_SIZE } from '@/constants'
import { PAYMENT_OPTIONS } from '@/constants/transferPlaceholders'
import { adminTransactionDetail } from '@/constants/routes'
import { useAuth } from '@/context/AuthContext'
import { adminKeys } from '@/features/admin/queryKeys'
import { recipientDisplay } from '@/features/admin/transactionLabels'
import { downloadTransactionRecordText } from '@/features/transaction/transactionDownload'
import {
  RecipientStackedCell,
  SortChevrons,
  TxRowActions,
  TxTableCheckbox,
} from '@/features/transaction/TransactionTableUi'
import { formatMoneyAmount } from '@/features/transaction/utils'
import { getAdminTransactions } from '@/services/api'
import type { Transaction } from '@/types'
import Button from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import Card, { CardContent, CardHeader } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type TxTab = 'all' | 'awaiting_confirmation' | 'completed'

type SortKey = 'recipient' | 'amount' | 'createdAt'

function paymentLabel(id: string | undefined): string {
  if (!id) return '—'
  return PAYMENT_OPTIONS.find(o => o.id === id)?.title ?? id
}

function formatListDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function AdminTransactionsPage() {
  const { accessToken } = useAuth()
  const [tab, setTab] = useState<TxTab>('all')
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selected, setSelected] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    setPage(1)
    if (tab === 'awaiting_confirmation') {
      setSortKey('createdAt')
      setSortDir('asc')
    }
  }, [tab])

  const statusForApi = tab === 'all' ? undefined : tab === 'awaiting_confirmation' ? 'awaiting_confirmation' : 'completed'

  const filterKey = useMemo(
    () => ({
      tab,
      search: '',
      user: '',
      created_after: '',
      created_before: '',
      ordering: tab === 'awaiting_confirmation' ? 'created_at' : '',
      status: statusForApi ?? '',
    }),
    [tab, statusForApi],
  )

  const listQuery = useQuery({
    queryKey: adminKeys.transactions(page, filterKey),
    enabled: !!accessToken,
    queryFn: async () => {
      const res = await getAdminTransactions(accessToken!, {
        page,
        status: statusForApi,
        ordering: tab === 'awaiting_confirmation' ? 'created_at' : undefined,
      })
      if (res.error) throw new Error(res.error.message)
      if (!res.data) throw new Error('No data')
      return res.data
    },
  })

  const rows = listQuery.data?.results ?? []

  const sortedRows = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    const list = [...rows]
    const primaryDate = (tx: Transaction) =>
      tab === 'awaiting_confirmation' ? tx.updatedAt : tx.createdAt
    list.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'createdAt') {
        cmp = new Date(primaryDate(a)).getTime() - new Date(primaryDate(b)).getTime()
      } else if (sortKey === 'recipient') {
        cmp = recipientDisplay(a).localeCompare(recipientDisplay(b))
      } else {
        cmp = a.inputAmount - b.inputAmount
      }
      return cmp * dir
    })
    return list
  }, [rows, sortKey, sortDir, tab])

  useEffect(() => {
    const ids = new Set(sortedRows.map(t => t.id))
    setSelected(prev => {
      const next = new Set<string>()
      prev.forEach(id => {
        if (ids.has(id)) next.add(id)
      })
      return next
    })
  }, [sortedRows])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'createdAt' ? 'desc' : 'asc')
    }
  }

  const submittedOrCreatedAt = (tx: Transaction) =>
    tab === 'awaiting_confirmation' ? tx.updatedAt : tx.createdAt

  const allSelected = sortedRows.length > 0 && sortedRows.every(t => selected.has(t.id))
  const someSelected = sortedRows.some(t => selected.has(t.id)) && !allSelected

  const handleHeaderCheckbox = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(sortedRows.map(t => t.id)))
  }

  const toggleRow = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (!accessToken) {
    return <p className="text-sm text-muted-foreground">Sign in as admin.</p>
  }

  const totalPages = listQuery.data ? Math.max(1, Math.ceil(listQuery.data.count / ADMIN_PAGE_SIZE)) : 1

  const tabBtn = (id: TxTab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={cn(
        'min-h-[44px] flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        tab === id ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-muted',
      )}
    >
      {label}
    </button>
  )

  const sortableThClass =
    'cursor-pointer select-none px-3 text-left align-middle text-[11px] font-semibold uppercase tracking-[0.06em] text-[#888] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

  const handleHeaderKeyDown = (key: SortKey) => (e: KeyboardEvent<HTMLTableCellElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggleSort(key)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Transactions</h2>
        <p className="text-sm text-muted-foreground">Review transfers by status. End users keep read-only activity views.</p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-muted/30 p-1">
        {tabBtn('all', 'All')}
        {tabBtn('awaiting_confirmation', 'Awaiting confirmation')}
        {tabBtn('completed', 'Completed')}
      </div>

      {tab === 'awaiting_confirmation' ? (
        <p className="text-xs text-muted-foreground">
          Transfers where the client has uploaded proof of payment and is waiting on admin confirmation.
        </p>
      ) : null}

      <Card>
        <CardHeader title="Results" subtitle={`${listQuery.data?.count ?? '—'} total`} />
        <CardContent>
          {listQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : listQuery.isError ? (
            <p className="text-sm text-destructive">{(listQuery.error as Error).message}</p>
          ) : sortedRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions in this view.</p>
          ) : (
            <div className="overflow-hidden rounded-[14px] border border-[#EBEBEB] bg-white">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] border-collapse">
                  <thead className="border-b border-[#EBEBEB] bg-[#F7F7F5]">
                    <tr className="h-10">
                      <th scope="col" className="w-12 px-2 text-center align-middle">
                        <div className="flex justify-center">
                          <TxTableCheckbox
                            checked={allSelected}
                            indeterminate={someSelected}
                            ariaLabel="Select all transactions"
                            onPress={handleHeaderCheckbox}
                          />
                        </div>
                      </th>
                      <th
                        scope="col"
                        tabIndex={0}
                        className={sortableThClass}
                        onClick={() => toggleSort('recipient')}
                        onKeyDown={handleHeaderKeyDown('recipient')}
                      >
                        <span className="inline-flex items-center gap-1">
                          Recipient
                          {sortKey === 'recipient' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                        </span>
                      </th>
                      <th
                        scope="col"
                        tabIndex={0}
                        className={sortableThClass}
                        onClick={() => toggleSort('amount')}
                        onKeyDown={handleHeaderKeyDown('amount')}
                      >
                        <span className="inline-flex items-center gap-1">
                          Amount
                          <SortChevrons active={sortKey === 'amount'} />
                        </span>
                      </th>
                      <th scope="col" className="px-3 text-left align-middle text-[11px] font-semibold uppercase tracking-[0.06em] text-[#888]">
                        Method
                      </th>
                      <th
                        scope="col"
                        tabIndex={0}
                        className={sortableThClass}
                        onClick={() => toggleSort('createdAt')}
                        onKeyDown={handleHeaderKeyDown('createdAt')}
                      >
                        <span className="inline-flex items-center gap-1">
                          Date
                          <SortChevrons active={sortKey === 'createdAt'} />
                        </span>
                      </th>
                      <th scope="col" className="px-3 text-left align-middle text-[11px] font-semibold uppercase tracking-[0.06em] text-[#888]">
                        Status
                      </th>
                      <th scope="col" className="w-[72px] px-0 align-middle" aria-hidden />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.map(tx => {
                      const isSel = selected.has(tx.id)
                      return (
                        <tr
                          key={tx.id}
                          className={cn(
                            'min-h-[64px] border-b border-[#EBEBEB] transition-colors duration-150',
                            isSel ? 'bg-[#F0FAF5] hover:bg-[#F0FAF5]' : 'bg-white hover:bg-[#F7F7F5]',
                          )}
                        >
                          <td className="w-12 px-2 text-center align-middle">
                            <div className="flex min-h-[64px] items-center justify-center">
                              <TxTableCheckbox
                                checked={isSel}
                                ariaLabel="Select transaction"
                                onCheckedChange={() => toggleRow(tx.id)}
                              />
                            </div>
                          </td>
                          <td className="px-3 align-middle">
                            <RecipientStackedCell tx={tx} includeReference />
                          </td>
                          <td className="px-3 align-middle">
                            <span className="text-[14px] font-medium leading-snug text-[#163300]">
                              {formatMoneyAmount(tx.inputAmount, tx.inputCurrency)}
                              <span className="mx-1 text-[#888]">→</span>
                              {formatMoneyAmount(tx.resultAmount, tx.resultCurrency)}
                            </span>
                          </td>
                          <td className="px-3 align-middle text-[13px] font-normal text-[#888]">
                            {paymentLabel(tx.paymentMethod)}
                          </td>
                          <td className="whitespace-nowrap px-3 align-middle text-[13px] font-normal text-[#888]">
                            {formatListDate(submittedOrCreatedAt(tx))}
                          </td>
                          <td className="px-3 align-middle">
                            <StatusBadge status={tx.status} />
                          </td>
                          <td className="w-[72px] px-0 align-middle">
                            <TxRowActions
                              detailHref={adminTransactionDetail(tx.id)}
                              onDownloadRecord={() => downloadTransactionRecordText(tx)}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {listQuery.data != null && totalPages > 1 ? (
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth={false}
                  className="min-w-[120px]"
                  disabled={page <= 1 || listQuery.isFetching}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth={false}
                  className="min-w-[120px]"
                  disabled={page >= totalPages || listQuery.isFetching}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
