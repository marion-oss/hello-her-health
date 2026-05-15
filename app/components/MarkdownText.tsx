// Anoqi — tiny inline markdown renderer for chat bubbles.
//
// The BE emits light Markdown — line-start bullets (`*   text`), numbered
// items (`1.  text`), and inline `**bold**`. We don't pull in a full
// markdown lib because the surface area is small, and Bubble passes a
// single `<Text>` subtree we need to compose into.
//
// Streaming note: ChatScreen renders plain text during streaming (so the
// cursor + ghost-layout trick still works) and swaps to MarkdownText once
// `!isStreaming`. Keep this stateless and presentational.

import React from 'react'
import { Text as RNText, type TextStyle, type StyleProp } from 'react-native'

type Props = {
  children:  string
  /** Style applied to the wrapping Text (paragraph defaults). */
  style?:    StyleProp<TextStyle>
  /** Style overlaid on bold spans. Defaults to fontWeight: '700'. */
  boldStyle?: StyleProp<TextStyle>
}

const DEFAULT_BOLD: TextStyle = { fontWeight: '700' }
const BULLET = '• '
// `* ` or `*   ` (one or more spaces) at line start.
const BULLET_RE = /^\s*\*\s+/
// `1.` `12.` etc at line start; capture the number.
const NUMBERED_RE = /^\s*(\d+)\.\s+/
// Inline `**bold**` span. Global so we can use matchAll.
const BOLD_RE = /\*\*([^*]+)\*\*/g

/** Split an inline string into bold/plain runs. */
function splitBold(line: string): Array<{ bold: boolean; text: string }> {
  if (!line.includes('**')) return [{ bold: false, text: line }]
  const parts: Array<{ bold: boolean; text: string }> = []
  let cursor = 0
  for (const m of line.matchAll(BOLD_RE)) {
    const idx = m.index ?? 0
    if (idx > cursor) {
      parts.push({ bold: false, text: line.slice(cursor, idx) })
    }
    parts.push({ bold: true, text: m[1] })
    cursor = idx + m[0].length
  }
  if (cursor < line.length) {
    parts.push({ bold: false, text: line.slice(cursor) })
  }
  return parts
}

export function MarkdownText({ children, style, boldStyle }: Props) {
  const bold = boldStyle ?? DEFAULT_BOLD
  const lines = children.split('\n')

  return (
    <RNText style={style}>
      {lines.map((rawLine, i) => {
        let prefix = ''
        let line = rawLine

        const bulletMatch = line.match(BULLET_RE)
        if (bulletMatch) {
          prefix = BULLET
          line = line.slice(bulletMatch[0].length)
        } else {
          const numMatch = line.match(NUMBERED_RE)
          if (numMatch) {
            prefix = `${numMatch[1]}. `
            line = line.slice(numMatch[0].length)
          }
        }

        const runs = splitBold(line)
        // Keep the explicit newline between lines so RN preserves line
        // breaks inside the single parent Text. Final line gets no newline.
        const isLast = i === lines.length - 1
        return (
          <RNText key={i}>
            {prefix}
            {runs.map((r, j) =>
              r.bold ? (
                <RNText key={j} style={bold}>{r.text}</RNText>
              ) : (
                <RNText key={j}>{r.text}</RNText>
              ),
            )}
            {isLast ? '' : '\n'}
          </RNText>
        )
      })}
    </RNText>
  )
}
