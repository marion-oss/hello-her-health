// Anoqi — TypingIndicator. Three sage dots that breathe.

import React, { useEffect, useRef } from 'react'
import { Animated, View } from 'react-native'

import { useTheme } from '../theme'

export function TypingIndicator() {
  const theme = useTheme()
  const a1 = useRef(new Animated.Value(0.4)).current
  const a2 = useRef(new Animated.Value(0.4)).current
  const a3 = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    const breathe = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1,
            duration: 600,
            easing: theme.easing.inOutExpo,
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0.4,
            duration: 600,
            easing: theme.easing.inOutExpo,
            useNativeDriver: true,
          }),
        ]),
      )
    const animations = [
      breathe(a1, 0),
      breathe(a2, 200),
      breathe(a3, 400),
    ]
    animations.forEach((a) => a.start())
    return () => animations.forEach((a) => a.stop())
  }, [a1, a2, a3, theme])

  const dot = (val: Animated.Value) => (
    <Animated.View
      style={{
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.colors.text.secondary,
        opacity: val,
        marginHorizontal: 2,
      }}
    />
  )

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing[2],
        paddingHorizontal: theme.spacing[4],
      }}
    >
      {dot(a1)}
      {dot(a2)}
      {dot(a3)}
    </View>
  )
}
