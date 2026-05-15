// Anoqi — inline CitationPill.
//
// Renders one or more bundled source labels as a small inline pill that
// flows with the surrounding paragraph (e.g. "Shopify + 2", "Mobiloud").
// Uses Text-with-backgroundColor so the pill baseline-aligns with the
// running body text — required for inline placement inside <Text> trees.

import React from 'react'
import { Linking, Text as RNText } from 'react-native'

import { useTheme } from '../theme'

export type CitationSource = {
  label: string        // 'S1', 'S2', ...
  name: string         // 'NHS', 'NICE', 'Shopify'
  topic?: string
  url?: string
}

type Props = {
  // The full set of labels in this citation group. The first resolves to the
  // displayed name; remaining labels become the "+ N" suffix.
  labels: string[]
  sources: CitationSource[]
}

export function CitationPill({ labels, sources }: Props) {
  const theme = useTheme()

  const resolved = labels
    .map((l) => sources.find((s) => s.label === l))
    .filter((s): s is CitationSource => Boolean(s))

  // No resolvable citation — render nothing. Avoids "[S1]" leaking when
  // the assistant references a label that the FE never received.
  if (resolved.length === 0) return null

  const primary = resolved[0]
  const extra = resolved.length - 1
  const url = primary.url

  return (
    <>
      {' '}
      <RNText
        accessibilityRole={url ? 'link' : undefined}
        onPress={url ? () => Linking.openURL(url) : undefined}
        style={{
          backgroundColor: 'rgba(196, 128, 106, 0.14)',
          color: theme.colors.accent.info,
          fontFamily: 'Inter-Medium',
          fontSize: 11,
          lineHeight: 18,
          letterSpacing: 0.3,
          paddingHorizontal: 6,
          paddingVertical: 1,
          borderRadius: 6,
          overflow: 'hidden',
        }}
      >
        {primary.name}
        {extra > 0 ? ` + ${extra}` : ''}
      </RNText>
    </>
  )
}
