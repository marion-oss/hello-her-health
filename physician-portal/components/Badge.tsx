import type { CSSProperties } from 'react'

export type BadgeStatus = 'draft' | 'in_review' | 'approved' | 'live' | 'archived'

const LABELS: Record<BadgeStatus, string> = {
  draft: 'Brouillon',
  in_review: 'En revue',
  approved: 'Approuvé',
  live: 'En production',
  archived: 'Archivé',
}

const TOKEN_PREFIX: Record<BadgeStatus, string> = {
  draft: '--status-draft',
  in_review: '--status-in-review',
  approved: '--status-approved',
  live: '--status-live',
  archived: '--status-archived',
}

type BadgeProps = {
  status: BadgeStatus
  className?: string
}

export function Badge({ status, className = '' }: BadgeProps) {
  const prefix = TOKEN_PREFIX[status]
  const style = {
    backgroundColor: `var(${prefix}-bg)`,
    color: `var(${prefix}-text)`,
    '--tw-ring-color': `var(${prefix}-ring)`,
    boxShadow: `inset 0 0 0 1px var(${prefix}-ring)`,
  } as CSSProperties

  return (
    <span
      style={style}
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
    >
      {LABELS[status]}
    </span>
  )
}

export default Badge
