import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'

type CardVariant = 'quiet' | 'lifted'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant
  children: ReactNode
}

const VARIANT_STYLE: Record<CardVariant, CSSProperties> = {
  quiet: {
    backgroundColor: 'var(--rose-50)',
    border: '1px solid var(--sage-200)',
    boxShadow: 'none',
  },
  lifted: {
    backgroundColor: 'var(--rose-100)',
    border: '1px solid transparent',
    boxShadow: 'var(--shadow-md)',
  },
}

export function Card({
  variant = 'quiet',
  className = '',
  style,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      style={{ ...VARIANT_STYLE[variant], ...style }}
      className={`rounded-xl ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}

export default Card
