// Anoqi — Icon wrapper over lucide-react-native.
//
// Sage default color, 1.5px stroke, 20px default size. Imports are explicit
// per-icon (not `import * as Lucide`) so the web bundle only ships the icons
// the app actually uses. Adding a new icon = add it to the import list AND the
// iconMap below; TypeScript will then unlock `name="NewIcon"` callers via the
// `IconName = keyof typeof iconMap` constraint.

import React from 'react'
import {
  Activity,
  AlertCircle,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Bookmark,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  House,
  MessageCircle,
  Paperclip,
  Pill,
  Plus,
  Scan,
  ShieldCheck,
  Sparkles,
  Sprout,
  Stethoscope,
  Sunset,
  Syringe,
  Trash2,
  UploadCloud,
  User,
} from 'lucide-react-native'

import { useTheme } from '../theme'

const iconMap = {
  Activity,
  AlertCircle,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Bookmark,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  House,
  MessageCircle,
  Paperclip,
  Pill,
  Plus,
  Scan,
  ShieldCheck,
  Sparkles,
  Sprout,
  Stethoscope,
  Sunset,
  Syringe,
  Trash2,
  UploadCloud,
  User,
} as const

export type IconName = keyof typeof iconMap

type Props = {
  name: IconName
  size?: number
  color?: string
  strokeWidth?: number
}

export function Icon({ name, size = 20, color, strokeWidth = 1.5 }: Props) {
  const theme = useTheme()
  const LucideIcon = iconMap[name]
  return (
    <LucideIcon
      size={size}
      color={color ?? theme.colors.text.secondary}
      strokeWidth={strokeWidth}
    />
  )
}
