import { Link } from 'react-router-dom'
import { ChevronsUpDown, Download, MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { recipientDisplay, recipientPhoneLine } from '@/features/admin/transactionLabels'
import { transactionReferenceDisplay } from '@/features/transaction/transactionReference'
import { cn } from '@/lib/utils'
import type { Transaction } from '@/types'

type CheckboxProps = {
  checked: boolean
  ariaLabel: string
  /** When true, shows a dash (header “some selected”) */
  indeterminate?: boolean
  /** Row checkbox: toggle */
  onCheckedChange?: (next: boolean) => void
  /** Header checkbox: select all / clear (overrides onCheckedChange) */
  onPress?: () => void
}

export function TxTableCheckbox({
  checked,
  ariaLabel,
  indeterminate,
  onCheckedChange,
  onPress,
}: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={ariaLabel}
      onClick={() => {
        if (onPress) onPress()
        else if (onCheckedChange) onCheckedChange(!checked)
      }}
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded border-[1.5px] border-[#CACACA] bg-white transition-colors',
        checked && !indeterminate && 'border-[#163300] bg-[#163300]',
        indeterminate && 'border-[#CACACA] bg-white',
      )}
    >
      {indeterminate ? (
        <span className="h-0.5 w-2.5 rounded-sm bg-[#888]" aria-hidden />
      ) : checked ? (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden className="text-white">
          <path
            d="M9 1L3.5 6.5L1 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </button>
  )
}

export function RecipientStackedCell({ tx, includeReference }: { tx: Transaction; includeReference: boolean }) {
  const name = recipientDisplay(tx)
  const phone = recipientPhoneLine(tx)
  const ref = transactionReferenceDisplay(tx)
  return (
    <div className="flex min-w-0 max-w-[280px] flex-col gap-0.5 py-1">
      <span className="text-[14px] font-medium leading-snug text-[#163300]">{name}</span>
      {phone ? <span className="text-[12px] font-normal leading-snug text-[#888]">{phone}</span> : null}
      {includeReference ? <span className="text-[12px] font-normal leading-snug text-[#888]">{ref}</span> : null}
    </div>
  )
}

type ActionsProps = {
  detailHref: string
  onDownloadRecord: () => void
}

export function TxRowActions({ detailHref, onDownloadRecord }: ActionsProps) {
  return (
    <div className="flex w-[72px] shrink-0 items-center justify-center gap-3">
      <button
        type="button"
        className="text-[#888] transition-colors hover:text-[#163300]"
        aria-label="Download transaction record"
        onClick={e => {
          e.stopPropagation()
          onDownloadRecord()
        }}
      >
        <Download className="h-4 w-4" strokeWidth={1.75} />
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="text-[#888] transition-colors hover:text-[#163300]"
            aria-label="More actions"
          >
            <MoreVertical className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[10rem]">
          <DropdownMenuItem asChild>
            <Link to={detailHref} className="cursor-pointer">
              View details
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => {
              onDownloadRecord()
            }}
          >
            Download
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function SortChevrons({ active }: { active: boolean }) {
  return (
    <ChevronsUpDown
      className={cn('h-3 w-3 shrink-0', active ? 'text-[#163300]' : 'text-[#CACACA]')}
      strokeWidth={2}
      aria-hidden
    />
  )
}
