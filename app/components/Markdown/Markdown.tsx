// Anoqi — Markdown renderer for chat assistant replies.
//
// Maps the small Block tree from parser.ts to themed React Native nodes.
// Inline children (bold, italic, citation) flow inside <Text>; block-level
// nodes (heading, paragraph, list) are <View>s with vertical rhythm tuned
// to the editorial register. Citations resolve from a sources array passed
// in by the caller — labels with no matching source render as nothing.

import React from 'react'
import { View, Text as RNText } from 'react-native'

import { useTheme } from '../../theme'
import { palette } from '../../theme/colors'
import { Text } from '../Text'
import { CitationPill, type CitationSource } from '../CitationPill'
import type { Block, Inline } from './parser'

type Props = {
  blocks: Block[]
  sources?: CitationSource[]
  // Optional inline node appended to the last block — used by the chat
  // screen to anchor the breathing StreamingCursor at the tail of the
  // currently-streaming paragraph.
  trailingCursor?: React.ReactNode
}

export function Markdown({ blocks, sources = [], trailingCursor }: Props) {
  return (
    <View>
      {blocks.map((block, i) => {
        const isLast = i === blocks.length - 1
        const cursor = isLast ? trailingCursor : null
        return (
          <BlockNode
            key={i}
            block={block}
            sources={sources}
            isFirst={i === 0}
            trailingCursor={cursor}
          />
        )
      })}
    </View>
  )
}

function BlockNode({
  block,
  sources,
  isFirst,
  trailingCursor,
}: {
  block: Block
  sources: CitationSource[]
  isFirst: boolean
  trailingCursor?: React.ReactNode
}) {
  const theme = useTheme()

  if (block.kind === 'heading') {
    const variant =
      block.level === 1 ? 'h2' : block.level === 2 ? 'h4' : 'bodyLgBold'
    return (
      <Text
        variant={variant}
        tone="primary"
        style={{
          marginTop: isFirst ? 0 : theme.spacing[5],
          marginBottom: theme.spacing[3],
        }}
      >
        {renderInline(block.inline, sources)}
        {trailingCursor}
      </Text>
    )
  }

  if (block.kind === 'paragraph') {
    return (
      <Text
        variant="bodyLg"
        tone="primary"
        style={{
          marginBottom: theme.spacing[4],
        }}
      >
        {renderInline(block.inline, sources)}
        {trailingCursor}
      </Text>
    )
  }

  if (block.kind === 'bulletList') {
    return (
      <View style={{ marginBottom: theme.spacing[4], gap: theme.spacing[2] }}>
        {block.items.map((item, i) => (
          <View
            key={i}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: theme.spacing[3],
              paddingLeft: theme.spacing[2],
            }}
          >
            <View
              style={{
                width: 5,
                height: 5,
                borderRadius: 3,
                backgroundColor: palette.ember[400],
                marginTop: 10,
              }}
            />
            <Text variant="bodyLg" tone="primary" style={{ flex: 1 }}>
              {renderInline(item, sources)}
              {trailingCursor && i === block.items.length - 1
                ? trailingCursor
                : null}
            </Text>
          </View>
        ))}
      </View>
    )
  }

  // ordered list
  return (
    <View style={{ marginBottom: theme.spacing[4], gap: theme.spacing[2] }}>
      {block.items.map((item, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: theme.spacing[3],
            paddingLeft: theme.spacing[2],
          }}
        >
          <Text
            variant="bodyLg"
            tone="tertiary"
            style={{ minWidth: 18, textAlign: 'right' }}
          >
            {i + 1}.
          </Text>
          <Text variant="bodyLg" tone="primary" style={{ flex: 1 }}>
            {renderInline(item, sources)}
            {trailingCursor && i === block.items.length - 1
              ? trailingCursor
              : null}
          </Text>
        </View>
      ))}
    </View>
  )
}

function renderInline(
  nodes: Inline[],
  sources: CitationSource[],
): React.ReactNode {
  return nodes.map((node, i) => {
    if (node.kind === 'text') {
      return <RNText key={i}>{node.text}</RNText>
    }
    if (node.kind === 'bold') {
      return (
        <RNText
          key={i}
          style={{ fontFamily: 'Inter-SemiBold' }}
        >
          {renderInline(node.children, sources)}
        </RNText>
      )
    }
    if (node.kind === 'italic') {
      return (
        <RNText key={i} style={{ fontStyle: 'italic' }}>
          {renderInline(node.children, sources)}
        </RNText>
      )
    }
    // citation
    return <CitationPill key={i} labels={node.labels} sources={sources} />
  })
}
