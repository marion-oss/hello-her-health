// Anoqi — Icon wrapper over lucide-react-native.
//
// Sage default color, 1.5px stroke, 20px default size. Type the icon prop so
// callers see autocomplete for every Lucide name without importing the icon
// module per screen.

import React from 'react'
import * as Lucide from 'lucide-react-native'

import { useTheme } from '../theme'

export type IconName = keyof typeof Lucide

type Props = {
  name: IconName
  size?: number
  color?: string
  strokeWidth?: number
}

export function Icon({ name, size = 20, color, strokeWidth = 1.5 }: Props) {
  const theme = useTheme()
  const LucideIcon = Lucide[name] as React.ComponentType<{
    size?: number
    color?: string
    strokeWidth?: number
  }>
  return (
    <LucideIcon
      size={size}
      color={color ?? theme.colors.text.secondary}
      strokeWidth={strokeWidth}
    />
  )
}
