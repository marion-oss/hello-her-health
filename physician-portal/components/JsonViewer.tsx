import type { ReactNode } from 'react'

type JsonViewerProps = {
  data: unknown
}

type Token = { type: 'key' | 'string' | 'number' | 'boolean' | 'null' | 'plain'; value: string }

const CLASS: Record<Token['type'], string> = {
  key: 'text-peony-700',
  string: 'text-teal-700',
  number: 'text-peony-700',
  boolean: 'text-peony-700',
  null: 'text-ink-400',
  plain: 'text-ink-900',
}

/**
 * Lightweight regex-based JSON tokenizer.
 * Walks the pretty-printed string and emits typed spans.
 * Not a full JSON parser — just decoration over JSON.stringify output.
 */
function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  // Order matters: key (string followed by colon) before plain string.
  const pattern =
    /("(?:\\.|[^"\\])*")\s*:|("(?:\\.|[^"\\])*")|\b(true|false)\b|\b(null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g

  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(input)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'plain', value: input.slice(lastIndex, match.index) })
    }
    if (match[1] !== undefined) {
      tokens.push({ type: 'key', value: match[1] })
      tokens.push({ type: 'plain', value: ':' })
    } else if (match[2] !== undefined) {
      tokens.push({ type: 'string', value: match[2] })
    } else if (match[3] !== undefined) {
      tokens.push({ type: 'boolean', value: match[3] })
    } else if (match[4] !== undefined) {
      tokens.push({ type: 'null', value: match[4] })
    } else if (match[5] !== undefined) {
      tokens.push({ type: 'number', value: match[5] })
    }
    lastIndex = pattern.lastIndex
  }
  if (lastIndex < input.length) {
    tokens.push({ type: 'plain', value: input.slice(lastIndex) })
  }
  return tokens
}

export function JsonViewer({ data }: JsonViewerProps) {
  const pretty = JSON.stringify(data, null, 2) ?? 'null'
  const tokens = tokenize(pretty)

  const rendered: ReactNode[] = tokens.map((tok, i) => (
    <span key={i} className={CLASS[tok.type]}>
      {tok.value}
    </span>
  ))

  return (
    <pre
      className="font-mono text-xs leading-relaxed overflow-x-auto rounded-lg p-4 text-ink-900"
      style={{
        backgroundColor: 'var(--rose-50)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <code>{rendered}</code>
    </pre>
  )
}

export default JsonViewer
