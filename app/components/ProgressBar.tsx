// Anoqi — ProgressBar. Sage track, peony fill. Replaces onboarding dot row.

import React, { useEffect, useRef } from 'react'
import { Animated, View } from 'react-native'

import { useTheme } from '../theme'

type Props = {
  /** 0..1 */
  progress: number
  height?: number
}

export function ProgressBar({ progress, height = 4 }: Props) {
  const theme = useTheme()
  const anim = useRef(new Animated.Value(progress)).current

  useEffect(() => {
    Animated.timing(anim, {
      toValue: progress,
      duration: theme.duration.slow,
      easing: theme.easing.outQuart,
      useNativeDriver: false,
    }).start()
  }, [progress, anim, theme])

  const width = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  })

  return (
    <View
      style={{
        height,
        backgroundColor: theme.colors.bg.surfaceMuted,
        borderRadius: theme.radii.pill,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={{
          width,
          height: '100%',
          backgroundColor: theme.colors.accent.primary,
          borderRadius: theme.radii.pill,
        }}
      />
    </View>
  )
}
