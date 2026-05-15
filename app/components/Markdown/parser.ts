// Anoqi — minimal markdown parser for chat assistant replies.
//
// Scope: # / ## / ### headings, - and * bullets, 1. ordered, paragraphs,
// **bold**, _italic_, and [Sn] citation tokens. Adjacent [Sn][Sm] merge into
// one Citation block. Unclosed inline markers fall back to literal text so
// partial-stream input renders without crashing.

export type Inline =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; children: Inline[] }
  | { kind: 'italic'; children: Inline[] }
  | { kind: 'citation'; labels: string[] }

export type Block =
  | { kind: 'heading'; level: 1 | 2 | 3; inline: Inline[] }
  | { kind: 'paragraph'; inline: Inline[] }
  | { kind: 'bulletList'; items: Inline[][] }
  | { kind: 'orderedList'; items: Inline[][] }

const HEADING = /^(#{1,3})\s+(.*)$/
const BULLET = /^[-*]\s+/
const ORDERED = /^\d+\.\s+/
const CITATION_ONE = /^\[(S\d+)\]/

export function parse(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === '') {
      i += 1
      continue
    }

    const heading = line.match(HEADING)
    if (heading) {
      const level = heading[1].length as 1 | 2 | 3
      blocks.push({ kind: 'heading', level, inline: parseInline(heading[2]) })
      i += 1
      continue
    }

    if (BULLET.test(line)) {
      const items: Inline[][] = []
      while (i < lines.length && BULLET.test(lines[i])) {
        items.push(parseInline(lines[i].replace(BULLET, '')))
        i += 1
      }
      blocks.push({ kind: 'bulletList', items })
      continue
    }

    if (ORDERED.test(line)) {
      const items: Inline[][] = []
      while (i < lines.length && ORDERED.test(lines[i])) {
        items.push(parseInline(lines[i].replace(ORDERED, '')))
        i += 1
      }
      blocks.push({ kind: 'orderedList', items })
      continue
    }

    // Paragraph — consume until blank line or block boundary.
    const buffer: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !HEADING.test(lines[i]) &&
      !BULLET.test(lines[i]) &&
      !ORDERED.test(lines[i])
    ) {
      buffer.push(lines[i])
      i += 1
    }
    blocks.push({ kind: 'paragraph', inline: parseInline(buffer.join(' ')) })
  }

  return blocks
}

// Inline parser. Single forward pass; tracks ** and _ openers. Unclosed
// markers render as literal text. Citation runs of [S1][S3]... merge.
function parseInline(src: string): Inline[] {
  const out: Inline[] = []
  let i = 0
  let buf = ''

  const flush = () => {
    if (buf.length > 0) {
      out.push({ kind: 'text', text: buf })
      buf = ''
    }
  }

  while (i < src.length) {
    // **bold** — only consume if a closing ** exists in the remainder.
    if (src.startsWith('**', i)) {
      const close = src.indexOf('**', i + 2)
      if (close > i + 2) {
        flush()
        const inner = src.slice(i + 2, close)
        out.push({ kind: 'bold', children: parseInline(inner) })
        i = close + 2
        continue
      }
    }

    // _italic_ — only when balanced and at a word boundary on each side.
    if (src[i] === '_' && isItalicBoundary(src, i)) {
      const close = findItalicClose(src, i + 1)
      if (close !== -1) {
        flush()
        const inner = src.slice(i + 1, close)
        out.push({ kind: 'italic', children: parseInline(inner) })
        i = close + 1
        continue
      }
    }

    // [Sn] citation token — also merges adjacent [Sm][Sk]...
    if (src[i] === '[') {
      const run = consumeCitationRun(src, i)
      if (run.length > 0) {
        flush()
        out.push({ kind: 'citation', labels: run.labels })
        i += run.length
        continue
      }
    }

    buf += src[i]
    i += 1
  }

  flush()
  return out
}

// _italic_ only when _ sits at a word boundary on both sides — avoids
// eating snake_case identifiers in body copy.
function isItalicBoundary(src: string, i: number): boolean {
  const prev = src[i - 1]
  return prev === undefined || /\s|[(,.;:!?]/.test(prev)
}

function findItalicClose(src: string, start: number): number {
  for (let j = start; j < src.length; j += 1) {
    if (src[j] === '_') {
      const next = src[j + 1]
      if (next === undefined || /\s|[),.;:!?]/.test(next)) return j
    }
  }
  return -1
}

// Consume one or more adjacent [Sn] tokens. Returns total char count and the
// collected labels. length === 0 means no match at this position.
function consumeCitationRun(
  src: string,
  start: number,
): { length: number; labels: string[] } {
  const labels: string[] = []
  let cursor = start
  while (cursor < src.length && src[cursor] === '[') {
    const match = src.slice(cursor).match(CITATION_ONE)
    if (!match) break
    labels.push(match[1])
    cursor += match[0].length
  }
  return { length: cursor - start, labels }
}
