// Anoqi — SegmentedControl. Used on the Account screen for signup/login/anon.
//
// v2.2 dark-pill register: Plum surface (#2D1A2E) with warm-white labels and
// an apricot-tinted indicator. The dark surface is the v2.2 "deeper warm
// surface" introduced by the Path C mockup, and apricot accents inside a
// dark Plum container are the documented exception to the
// "apricot is decoration only" brand rule.

import React, { useEffect, useRef, useState } from 'react'
import { Animated, LayoutRectangle, Pressable, View } from 'react-native'

import { hover, palette, useTheme } from '../theme'
import { Text } from './Text'

type Option<V extends string> = { value: V; label: string }

type Props<V extends string> = {
  value: V | null
  onChange: (next: V) => void
  options: Option<V>[]
}

export function SegmentedControl<V extends string>({ value, onChange, options }: Props<V>) {
  const theme = useTheme()
  const [layouts, setLayouts] = useState<Record<string, LayoutRectangle>>({})
  const indicatorX = useRef(new Animated.Value(0)).current
  const indicatorW = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const rect = value ? layouts[value] : null
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
        backgroundColor: palette.plum[500],
        borderRadius: theme.radii.pill,
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
          backgroundColor: 'rgba(253, 186, 116, 0.18)',
          borderWidth: 1,
          borderColor: 'rgba(253, 186, 116, 0.28)',
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
            style={({ hovered }: any) => [
              {
                flex: 1,
                paddingVertical: theme.spacing[3],
                paddingHorizontal: theme.spacing[3],
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: theme.radii.pill,
              },
              hover.transition,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            {({ hovered }: any) => (
              <Text
                variant="bodyMed"
                style={{
                  color: active
                    ? palette.plum[50]
                    : hovered
                      ? palette.plum[50]
                      : 'rgba(240, 228, 216, 0.6)',
                }}
              >
                {opt.label}
              </Text>
            )}
          </Pressable>
        )
      })}
    </View>
  )
}
