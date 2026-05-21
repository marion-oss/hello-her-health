// LiquidTabBar — floating bottom navigation (v2.2 light register).
//
// A single Petal-tinted pill sits just above the home indicator. Each tab is
// a press target with a Lucide icon; the active tab gets a pulsing fuchsia
// dot below the icon (no labels — the dot is the indicator).
//
// Drop in as React Navigation's `tabBar` render prop.

import React, { useEffect } from 'react'
import { Platform, Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

import { hover, palette } from '../theme'
import { Icon, type IconName } from './Icon'

const ROUTE_META: Record<string, { icon: IconName; labelFr: string; labelEn: string }> = {
  Home:      { icon: 'House',    labelFr: "Aujourd'hui", labelEn: 'Today'     },
  Chat:      { icon: 'Sparkles', labelFr: 'Anoqi',       labelEn: 'Anoqi'     },
  Documents: { icon: 'FileText', labelFr: 'Documents',   labelEn: 'Documents' },
  Profile:   { icon: 'User',     labelFr: 'Profil',      labelEn: 'Profile'   },
}

export function LiquidTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()

  // Hide the bar when the *focused* screen opts out via
  // `tabBarStyle: { display: 'none' }`. Chat uses this for immersive mode.
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
          backgroundColor: palette.petal[100],
          borderWidth: 1,
          borderColor: palette.sand[300],
          paddingHorizontal: 8,
          paddingVertical: 8,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          ...(Platform.OS === 'web'
            ? ({ boxShadow: '0 10px 28px -10px rgba(13, 13, 18, 0.18), 0 4px 12px -6px rgba(13, 13, 18, 0.10)' } as any)
            : {
                shadowColor: palette.void[500],
                shadowOpacity: 0.18,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 8 },
              }),
        }}
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
  const scale = useSharedValue(1)
  const ease = Easing.bezier(0.22, 1, 0.36, 1)

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

  const iconColor = focused ? palette.void[500] : palette.warmGray[300]

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
            backgroundColor: focused ? '#ffffff' : 'transparent',
            borderWidth: focused ? 1 : 0,
            borderColor: palette.sand[300],
          },
          hover.transition,
          hovered && !focused && {
            backgroundColor: 'rgba(255, 255, 255, 0.6)',
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
