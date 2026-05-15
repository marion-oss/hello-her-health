// Anoqi — SegmentedControl. Used on the Account screen for signup/login/anon.
//
// Sliding Cotton Rose pill behind the selected segment.

import React, { useEffect, useRef, useState } from 'react'
import { Animated, LayoutRectangle, Pressable, View } from 'react-native'

import { useTheme } from '../theme'
import { Text } from './Text'

type Option<V extends string> = { value: V; label: string }

type Props<V extends string> = {
  value: V
  onChange: (next: V) => void
  options: Option<V>[]
}

export function SegmentedControl<V extends string>({ value, onChange, options }: Props<V>) {
  const theme = useTheme()
  const [layouts, setLayouts] = useState<Record<string, LayoutRectangle>>({})
  const indicatorX = useRef(new Animated.Value(0)).current
  const indicatorW = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const rect = layouts[value]
    if (!rect) return
    Animated.parallel([
      Animated.timing(indicatorX, {
        toValue: rect.x,
        duration: theme.duration.slow,
        easing: theme.easing.outQuart,
        useNativeDriver: false,
      }),
      Animated.timing(indicatorW, {
        toValue: rect.width,
        duration: theme.duration.slow,
        easing: theme.easing.outQuart,
        useNativeDriver: false,
      }),
    ]).start()
  }, [value, layouts, indicatorX, indicatorW, theme])

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: theme.colors.bg.surface,
        borderRadius: theme.radii.pill,
        borderWidth: 1,
        borderColor: theme.colors.border.subtle,
        padding: 4,
        position: 'relative',
      }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: 4,
          bottom: 4,
          left: indicatorX,
          width: indicatorW,
          backgroundColor: theme.colors.bg.surfaceWarm,
          borderRadius: theme.radii.pill,
        }}
      />
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            onLayout={(e) =>
              setLayouts((prev) => ({ ...prev, [opt.value]: e.nativeEvent.layout }))
            }
            style={{
              flex: 1,
              paddingVertical: theme.spacing[3],
              paddingHorizontal: theme.spacing[3],
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: theme.radii.pill,
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text
              variant="bodyMed"
              style={{
                color: active ? theme.colors.text.primary : theme.colors.text.secondary,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
