import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Badge, type BadgeStatus } from './Badge'

type PathwayHeaderProps = {
  pathwayKey: string
  version: string
  title: string
  description?: string | null
  status: BadgeStatus
}

export function PathwayHeader({
  pathwayKey,
  version,
  title,
  description,
  status,
}: PathwayHeaderProps) {
  return (
    <header
      className="pb-6 mb-8"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm font-medium transition-colors"
        style={{ color: 'var(--text-secondary)' }}
      >
        <ChevronLeft strokeWidth={1.5} size={18} style={{ color: 'var(--text-secondary)' }} />
        Tous les parcours
      </Link>

      <div className="mt-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p
            className="font-mono text-xs uppercase tracking-[0.14em]"
            style={{ color: 'var(--teal-700)' }}
          >
            {pathwayKey} · v{version}
          </p>
          <h1
            className="mt-2 text-3xl tracking-tight"
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--text-primary)',
              fontWeight: 800,
              lineHeight: 1.1,
            }}
          >
            {title}
          </h1>
          {description && (
            <p
              className="mt-3 text-sm leading-relaxed max-w-2xl"
              style={{ color: 'var(--text-secondary)' }}
            >
              {description}
            </p>
          )}
        </div>
        <Badge status={status} />
      </div>
    </header>
  )
}

export default PathwayHeader
