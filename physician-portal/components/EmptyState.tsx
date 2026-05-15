import { Card } from './Card'
import { PeonyBloom } from './PeonyBloom'

type EmptyStateProps = {
  title: string
  body: string
}

export function EmptyState({ title, body }: EmptyStateProps) {
  return (
    <Card
      variant="quiet"
      className="flex flex-col items-center justify-center px-8 py-14 text-center"
    >
      <PeonyBloom className="h-24 w-auto opacity-90" />
      <h3
        className="mt-4 text-lg tracking-tight"
        style={{
          fontFamily: 'var(--font-display)',
          color: 'var(--text-primary)',
          fontWeight: 800,
        }}
      >
        {title}
      </h3>
      <p
        className="mt-2 max-w-sm text-sm leading-relaxed"
        style={{ color: 'var(--text-secondary)' }}
      >
        {body}
      </p>
    </Card>
  )
}

export default EmptyState
