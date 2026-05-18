// LiquidTabBar — floating bottom navigation in the iridescent register.
//
// A single frosted glass pill sits just above the home indicator, with the
// LiquidEmber layer breathing underneath. Each tab is a press target with a
// Lucide icon + small label; the active tab gets a pulsing fuchsia dot and a
// brighter icon. No labels live below the icons — the dot is the indicator.
//
// Drop in as React Navigation's `tabBar` render prop.

import React, { useEffect } from 'react'
import { Platform, Pressable, View, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

import { hover, palette, useTheme } from '../theme'
import { Icon, type IconName } from './Icon'
import { LiquidEmber } from './LiquidEmber'
import { Text } from './Text'

const ROUTE_META: Record<string, { icon: IconName; labelFr: string; labelEn: string }> = {
  Home:      { icon: 'House',    labelFr: "Aujourd'hui", labelEn: 'Today'     },
  Chat:      { icon: 'Sparkles', labelFr: 'Anoqi',       labelEn: 'Anoqi'     },
  Documents: { icon: 'FileText', labelFr: 'Documents',   labelEn: 'Documents' },
  Profile:   { icon: 'User',     labelFr: 'Profil',      labelEn: 'Profile'   },
}

const webBackdrop = Platform.OS === 'web'
  ? ({
      backdropFilter: 'blur(22px) saturate(140%)',
      WebkitBackdropFilter: 'blur(22px) saturate(140%)',
    } as unknown as ViewStyle)
  : null

export function LiquidTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const theme = useTheme()

  // Hide the bar when the *focused* screen opts out via
  // `tabBarStyle: { display: 'none' }`. Chat uses this for its immersive
  // mode so the input bar can dock at the screen edge.
  const focusedRoute = state.routes[state.index]
  const focusedOpts = descriptors[focusedRoute.key].options
  const tabBarStyleObj = focusedOpts.tabBarStyle as { display?: string } | undefined
  if (tabBarStyleObj?.display === 'none') return null

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: insets.bottom + 14,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          borderRadius: 36,
          overflow: 'hidden',
          // Ember tinted shadow so the floating pill reads as warm, not
          // hovering in nothing.
          ...(Platform.OS === 'web'
            ? ({ boxShadow: '0 18px 40px -12px rgba(196,128,106,0.35), 0 6px 18px -6px rgba(0,0,0,0.55)' } as any)
            : {
                shadowColor: palette.ember[700],
                shadowOpacity: 0.5,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 12 },
              }),
        }}
      >
        {/* Slow ember liquid under the glass */}
        <LiquidEmber intensity={0.85} blur={28} borderRadius={36} fuchsia={true} />

        <View
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 8,
              paddingVertical: 8,
              gap: 4,
              backgroundColor: 'rgba(255, 245, 238, 0.06)',
              borderWidth: 1,
              borderColor: 'rgba(255, 245, 238, 0.12)',
              borderRadius: 36,
            },
            webBackdrop,
          ]}
        >
          {state.routes.map((route, index) => {
            const isFocused = state.index === index
            const meta = ROUTE_META[route.name] ?? { icon: 'House' as IconName, labelFr: route.name, labelEn: route.name }

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              })
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name as never)
              }
            }

            return (
              <TabButton
                key={route.key}
                icon={meta.icon}
                label={meta.labelEn}
                focused={isFocused}
                onPress={onPress}
              />
            )
          })}
        </View>
      </View>
    </View>
  )
}

function TabButton({
  icon,
  label,
  focused,
  onPress,
}: {
  icon: IconName
  label: string
  focused: boolean
  onPress: () => void
}) {
  // Press-down feedback
  const scale = useSharedValue(1)
  const ease = Easing.bezier(0.22, 1, 0.36, 1)

  // Pulsing dot on the active tab — same 4s rhythm as the brand wordmark.
  const pulse = useSharedValue(0)
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.bezier(0.45, 0, 0.55, 1) }),
      -1,
      true,
    )
  }, [pulse])

  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  const dotStyle = useAnimatedStyle(() => ({
    opacity: focused ? 0.95 - 0.4 * pulse.value : 0,
    transform: [{ scale: focused ? 1 - 0.18 * pulse.value : 0.6 }],
  }))

  const iconColor = focused
    ? palette.warmWhite[100]
    : 'rgba(255, 245, 238, 0.45)'

  return (
    <Animated.View style={scaleStyle}>
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={label}
        onPress={onPress}
        onPressIn={() => { scale.value = withTiming(0.94, { duration: 100, easing: ease }) }}
        onPressOut={() => { scale.value = withTiming(1, { duration: 200, easing: ease }) }}
        hitSlop={6}
        style={({ hovered }: any) => [
          {
            paddingHorizontal: 18,
            paddingVertical: 12,
            borderRadius: 999,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: focused ? 'rgba(255, 245, 238, 0.08)' : 'transparent',
            borderWidth: focused ? 1 : 0,
            borderColor: 'rgba(255, 245, 238, 0.10)',
          },
          hover.transition,
          hovered && !focused && {
            backgroundColor: 'rgba(255, 245, 238, 0.04)',
          },
        ]}
      >
        <Icon name={icon} size={22} color={iconColor} strokeWidth={focused ? 1.8 : 1.6} />
        {/* Indicator dot — only animates when focused; sits below the icon. */}
        <Animated.View
          style={[
            {
              width: 5,
              height: 5,
              borderRadius: 999,
              backgroundColor: palette.fuchsia[500],
              marginTop: 5,
              ...(Platform.OS === 'web'
                ? ({ boxShadow: '0 0 12px rgba(255, 4, 114, 0.6)' } as any)
                : {
                    shadowColor: palette.fuchsia[500],
                    shadowOpacity: 0.6,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 0 },
                  }),
            },
            dotStyle,
          ]}
        />
      </Pressable>
    </Animated.View>
  )
}
