// Anoqi — ProfileScreen.
//
// One control for now: language toggle (FR / EN). Reads + writes through
// OnboardingContext so the rest of the app picks it up immediately.

import React, { useEffect } from 'react'
import {
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  View,
  useWindowDimensions,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg'

import { useOnboarding } from '../../context/OnboardingContext'
import { palette, useTheme } from '../../theme'
import { Text } from '../../components'

const COPY = {
  fr: {
    eyebrow:    'Profil',
    title:      'Toi.',
    sub:        "Réglages, rien d'autre pour l'instant.",
    langLabel:  'Langue',
    langDetail: "Anoqi t'écrira et te lira dans la langue choisie.",
  },
  en: {
    eyebrow:    'Profile',
    title:      'You.',
    sub:        'Settings — nothing else for now.',
    langLabel:  'Language',
    langDetail: 'Anoqi will write to you and read you in the language you pick.',
  },
} as const

export function ProfileScreen() {
  const navigation = useNavigation<any>()
  const { language, setLanguage } = useOnboarding()
  const theme = useTheme()
  const { width } = useWindowDimensions()
  const copy = COPY[language]

  const isCompact = width < 480
  const bloomSize = isCompact ? 320 : 420

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg.canvas }}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.bg.canvas} />

      <Bloom size={bloomSize} intensity={0.6} />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header — wordmark navigates back to Home tab. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: isCompact ? 24 : 40,
            paddingTop: isCompact ? 20 : 28,
            paddingBottom: 8,
          }}
        >
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Home"
            onPress={() => navigation.navigate('Home')}
            hitSlop={8}
            style={({ pressed, hovered }: any) => ({
              opacity: pressed ? 0.6 : hovered ? 0.85 : 1,
              transform: pressed ? [{ scale: 0.97 }] : undefined,
            })}
          >
            <BrandWordmark size={isCompact ? 22 : 26} />
          </Pressable>
        </View>

        <View
          style={{
            flex: 1,
            paddingHorizontal: isCompact ? 24 : 40,
            paddingTop: isCompact ? 28 : 36,
            paddingBottom: 120, // clear the bottom tab bar
            maxWidth: 640,
            width: '100%',
            alignSelf: 'center',
          }}
        >
          <Text
            variant="eyebrow"
            style={{
              color: palette.fuchsia[500],
              letterSpacing: 1.6,
              marginBottom: 8,
            }}
          >
            {copy.eyebrow.toUpperCase()}
          </Text>
          <Text
            style={{
              fontFamily: 'BricolageGrotesque-ExtraBold',
              fontSize: isCompact ? 36 : 44,
              lineHeight: isCompact ? 40 : 48,
              letterSpacing: -0.8,
              color: theme.colors.text.primary,
            }}
          >
            {copy.title}
          </Text>
          <Text
            variant="body"
            style={{
              color: theme.colors.text.secondary,
              marginTop: 10,
              marginBottom: 28,
              maxWidth: 480,
            }}
          >
            {copy.sub}
          </Text>

          {/* Language card — Petal-tinted, Sand hairline */}
          <View
            style={{
              backgroundColor: palette.petal[100],
              borderWidth: 1,
              borderColor: palette.sand[300],
              borderRadius: 20,
              padding: 20,
            }}
          >
            <Text
              variant="eyebrow"
              style={{
                color: palette.fuchsia[500],
                letterSpacing: 1.4,
                marginBottom: 10,
              }}
            >
              {copy.langLabel.toUpperCase()}
            </Text>
            <Text
              variant="body"
              style={{
                color: theme.colors.text.secondary,
                marginBottom: 18,
                lineHeight: 22,
              }}
            >
              {copy.langDetail}
            </Text>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <LangPill label="Français" active={language === 'fr'} onPress={() => setLanguage('fr')} />
              <LangPill label="English"   active={language === 'en'} onPress={() => setLanguage('en')} />
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  )
}

// ─── LANG PILL ─────────────────────────────────────────────────────────────
// Active = fuchsia fill + white text (mirrors the Insight card's primary
// pill). Inactive = white fill + Sand outline + Void text (mirrors the
// mini-card register).
function LangPill({
  label,
  active,
  onPress,
}: {
  label:   string
  active:  boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed, hovered }: any) => ({
        flex: 1,
        paddingVertical: 14,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        backgroundColor: active
          ? (hovered || pressed) ? palette.fuchsia[600] : palette.fuchsia[500]
          : '#ffffff',
        borderWidth: 1.5,
        borderColor: active
          ? (hovered || pressed) ? palette.fuchsia[600] : palette.fuchsia[500]
          : palette.sand[300],
        transform: pressed ? [{ scale: 0.98 }] : undefined,
        ...(Platform.OS === 'web' && hovered && active
          ? ({ boxShadow: '0 6px 16px rgba(255, 4, 114, 0.25)' } as any)
          : null),
      })}
    >
      {active ? (
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            backgroundColor: '#ffffff',
          }}
        />
      ) : null}
      <Text
        style={{
          fontFamily: 'BricolageGrotesque-Medium',
          fontSize: 14,
          color: active ? '#ffffff' : palette.void[500],
        }}
      >
        {label}
      </Text>
    </Pressable>
  )
}

// ─── BLOOM ─────────────────────────────────────────────────────────────────
// Same reduced-intensity inner-screen pattern as HomeScreen.
function Bloom({ size, intensity }: { size: number; intensity: number }) {
  const t = useSharedValue(0)
  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.bezier(0.45, 0, 0.55, 1) }),
      -1,
      true,
    )
  }, [t])
  const dotStyle = useAnimatedStyle(() => ({
    opacity: (0.92 - 0.57 * t.value) * intensity,
    transform: [{ scale: 1 - 0.38 * t.value }],
  }))

  const dotX  = size * 0.76
  const dotY  = size * 0.21
  const stop0 = Math.max(0, 0.7  * intensity)
  const stop1 = Math.max(0, 0.38 * intensity)
  const stop2 = Math.max(0, 0.10 * intensity)

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, right: 0, width: size, height: size }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id="apricotProfile" cx="72%" cy="10%" r="55%" fx="72%" fy="10%">
            <Stop offset="0%"   stopColor={palette.apricot[400]} stopOpacity={stop0} />
            <Stop offset="35%"  stopColor={palette.apricot[400]} stopOpacity={stop1} />
            <Stop offset="70%"  stopColor={palette.apricot[400]} stopOpacity={stop2} />
            <Stop offset="100%" stopColor={palette.apricot[400]} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={size} height={size} fill="url(#apricotProfile)" />
      </Svg>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: dotX - 5,
            top:  dotY - 5,
            width: 10,
            height: 10,
            borderRadius: 999,
            backgroundColor: palette.fuchsia[500],
            ...(Platform.OS === 'web'
              ? ({ boxShadow: '0 0 14px rgba(255, 4, 114, 0.45)' } as any)
              : {
                  shadowColor: palette.fuchsia[500],
                  shadowOpacity: 0.45,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 0 },
                }),
          },
          dotStyle,
        ]}
      />
    </View>
  )
}

// ─── BRAND WORDMARK ────────────────────────────────────────────────────────
// Mirrors WelcomeScreen / HomeScreen — consolidates when shared Wordmark.tsx
// migrates to v2.0.
function BrandWordmark({ size }: { size: number }) {
  const t = useSharedValue(0)
  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.bezier(0.45, 0, 0.55, 1) }),
      -1,
      true,
    )
  }, [t])

  const dotStyle = useAnimatedStyle(() => ({
    opacity: 0.9 - 0.3 * t.value,
    transform: [{ scale: 1 - 0.18 * t.value }],
  }))

  const dotSize       = Math.max(4, Math.round(size * 0.32))
  const dotMarginTop  = Math.round(size * 0.10)
  const dotMarginLeft = Math.max(2, Math.round(size * 0.06))

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      <Text
        style={{
          fontFamily: 'BricolageGrotesque-ExtraBold',
          fontSize: size,
          letterSpacing: -0.025 * size,
          color: palette.void[500],
          lineHeight: size,
        }}
      >
        anoqi
      </Text>
      <Animated.View
        style={[
          {
            width: dotSize,
            height: dotSize,
            borderRadius: 999,
            backgroundColor: palette.fuchsia[500],
            marginTop: dotMarginTop,
            marginLeft: dotMarginLeft,
          },
          dotStyle,
        ]}
      />
    </View>
  )
}
