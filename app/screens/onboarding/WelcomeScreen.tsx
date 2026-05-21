// Anoqi — WelcomeScreen.
//
// White canvas, one apricot radial bloom bleeding off the top-right corner,
// one pulsing fuchsia dot inside it. Two-tone headline: top half Void, bottom
// half Fuchsia. Petal-tinted pills, fuchsia primary CTA, Sand-outlined
// secondary. See BRAND.md for the canonical spec.

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
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg'

import { useOnboarding, type Language } from '../../context/OnboardingContext'
import { useTheme, palette } from '../../theme'
import { Text } from '../../components'

// ─── COPY ──────────────────────────────────────────────────────────────────
//
// The headline is rendered as four lines on mobile (each word on its own
// line, two void + two fuchsia). On desktop the headline naturally wraps
// into the two-tone split.
const COPY = {
  fr: {
    eyebrow: 'Pour la santé des femmes',
    headlineTop:    ['Mieux', 'informée.'],
    headlineBottom: ['Mieux', 'entendue.'],
    subtitle:
      'Comprendre votre corps, préparer vos consultations, naviguer en confiance.',
    pills: [
      'Sources validées — NHS, HAS, NICE',
      'Études menées sur les femmes',
      'Jamais lié à votre identité',
    ],
    cta:   'Commencer →',
    login: "J'ai déjà un compte",
  },
  en: {
    eyebrow: 'For women’s health',
    headlineTop:    ['Better', 'informed.'],
    headlineBottom: ['Better', 'heard.'],
    subtitle:
      'Understand your body, prepare for appointments, navigate with confidence.',
    pills: [
      'Validated sources — NHS, HAS, NICE',
      'Research conducted on women',
      'Never linked to your identity',
    ],
    cta:   'Get started →',
    login: 'I already have an account',
  },
} as const

export function WelcomeScreen() {
  const navigation = useNavigation<any>()
  const { language, setLanguage } = useOnboarding()
  const { width } = useWindowDimensions()
  const theme = useTheme()
  const copy = COPY[language]

  // Compact phones bring the bloom in closer; desktop / iPad scales up.
  const isCompact = width < 480
  const bloomSize = isCompact ? 360 : 480

  const goObjective = () => navigation.navigate('Objective')
  const goLogin = () => navigation.navigate('Account', { mode: 'login' })

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg.canvas }}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.bg.canvas} />

      {/* ── Apricot bloom (decoration). Single radial gradient bleeding off
            the top-right corner. Inside it, a single fuchsia dot — the only
            saturated mark on the screen, pulsing on a 4s heartbeat. ──── */}
      <Bloom size={bloomSize} />

      <SafeAreaView style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            paddingHorizontal: isCompact ? 26 : 40,
            paddingTop: isCompact ? 24 : 32,
            paddingBottom: isCompact ? 26 : 40,
            maxWidth: 640,
            alignSelf: 'center',
            width: '100%',
          }}
        >
          {/* Header — wordmark left, language toggle right */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'auto',
            }}
          >
            <BrandWordmark size={isCompact ? 20 : 24} />
            <LangToggle language={language} onChange={setLanguage} />
          </View>

          {/* Eyebrow */}
          <Text
            variant="eyebrow"
            style={{
              color: palette.fuchsia[500],
              opacity: 0.85,
              marginTop: isCompact ? 12 : 28,
              marginBottom: isCompact ? 10 : 14,
            }}
          >
            {copy.eyebrow.toUpperCase()}
          </Text>

          {/* Two-tone headline. Top half Void, bottom half Fuchsia.
              Each "word" is its own line on compact viewports so the rhythm
              reads vertically; on wider screens it flows naturally. */}
          <View style={{ marginBottom: isCompact ? 18 : 24 }}>
            {copy.headlineTop.map((word) => (
              <Text
                key={`top-${word}`}
                variant="h1"
                style={{ color: theme.colors.text.primary, lineHeight: isCompact ? 42 : 48 }}
              >
                {word}
              </Text>
            ))}
            {copy.headlineBottom.map((word) => (
              <Text
                key={`bot-${word}`}
                variant="h1"
                style={{ color: palette.fuchsia[500], lineHeight: isCompact ? 42 : 48 }}
              >
                {word}
              </Text>
            ))}
          </View>

          {/* Subtitle */}
          <Text
            variant="body"
            style={{
              color: theme.colors.text.secondary,
              maxWidth: 360,
              marginBottom: isCompact ? 24 : 32,
            }}
          >
            {copy.subtitle}
          </Text>

          {/* Trust pills — Petal background, fuchsia pip */}
          <View style={{ gap: 8, marginBottom: isCompact ? 26 : 40 }}>
            {copy.pills.map((pill) => (
              <View
                key={pill}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: palette.petal[100],
                  borderRadius: 40,
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                }}
              >
                <View
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 999,
                    backgroundColor: palette.fuchsia[500],
                    opacity: 0.75,
                  }}
                />
                <Text variant="caption" style={{ color: theme.colors.text.primary }}>
                  {pill}
                </Text>
              </View>
            ))}
          </View>

          {/* Primary CTA — fuchsia fill, white text, Bricolage 500. */}
          <PrimaryButton label={copy.cta} onPress={goObjective} />

          {/* Secondary CTA — white fill, Sand outline, neutral. Hierarchy
              comes from colour, not weight. */}
          <SecondaryButton label={copy.login} onPress={goLogin} />
        </View>
      </SafeAreaView>
    </View>
  )
}

// ─── BLOOM (the form) ─────────────────────────────────────────────────────
//
// Single apricot radial gradient bleeding off the top-right corner; a single
// fuchsia dot inside it, pulsing on the same 4-second curve as the wordmark
// dot. Replaces v1.0's six-element BreathingForm + LiquidEmber + PeonyBloom
// composition. See BRAND.md §4.
function Bloom({ size }: { size: number }) {
  const t = useSharedValue(0)

  useEffect(() => {
    // Same curve and period as the wordmark dot — they breathe together.
    t.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.bezier(0.45, 0, 0.55, 1) }),
      -1,
      true,
    )
  }, [t])

  // 0% frame: opacity 0.92, scale 1. 50% frame: opacity 0.35, scale 0.62.
  const dotStyle = useAnimatedStyle(() => ({
    opacity: 0.92 - 0.57 * t.value,
    transform: [{ scale: 1 - 0.38 * t.value }],
  }))

  // The bloom geometry mirrors the mockup HTML at 300-unit canvas width.
  // Dot anchor is roughly 76% from left, 14% from top of the bloom box.
  const dotX = size * 0.76
  const dotY = size * 0.21

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: size,
        height: size,
      }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id="apricot" cx="72%" cy="10%" r="55%" fx="72%" fy="10%">
            <Stop offset="0%"   stopColor={palette.apricot[400]} stopOpacity={0.7} />
            <Stop offset="35%"  stopColor={palette.apricot[400]} stopOpacity={0.38} />
            <Stop offset="70%"  stopColor={palette.apricot[400]} stopOpacity={0.10} />
            <Stop offset="100%" stopColor={palette.apricot[400]} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={size} height={size} fill="url(#apricot)" />
      </Svg>

      {/* The dot sits as a separate animated View on top of the SVG so we can
          use Reanimated transforms (Svg circles via Reanimated are tricky on
          web). The dot is small (~6.5 / 300 = 2.2% of canvas), with a
          radial-glow shadow to suggest the Gaussian-blur in the mockup. */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: dotX - 6.5,
            top:  dotY - 6.5,
            width: 13,
            height: 13,
            borderRadius: 999,
            backgroundColor: palette.fuchsia[500],
            ...(Platform.OS === 'web'
              ? ({ boxShadow: '0 0 16px rgba(255, 4, 114, 0.55)' } as any)
              : {
                  shadowColor: palette.fuchsia[500],
                  shadowOpacity: 0.55,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 0 },
                }),
          },
          dotStyle,
        ]}
      />
    </View>
  )
}

// ─── BRAND WORDMARK ───────────────────────────────────────────────────────
//
// Inlined here (rather than reusing app/components/Wordmark.tsx) because the
// v1.0 Wordmark is Inter Light and the v2.0 spec calls for Bricolage 800.
// Once Wordmark.tsx itself is migrated (separate PR), this can be deleted
// and the import restored.
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

// ─── LANG TOGGLE ──────────────────────────────────────────────────────────
function LangToggle({
  language,
  onChange,
}: {
  language: Language
  onChange: (l: Language) => void
}) {
  const theme = useTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Pressable onPress={() => onChange('fr')} hitSlop={8}>
        <Text
          variant="eyebrow"
          style={{
            color:
              language === 'fr'
                ? theme.colors.text.primary
                : theme.colors.text.tertiary,
          }}
        >
          FR
        </Text>
      </Pressable>
      <Text variant="eyebrow" style={{ color: theme.colors.text.tertiary }}>
        ·
      </Text>
      <Pressable onPress={() => onChange('en')} hitSlop={8}>
        <Text
          variant="eyebrow"
          style={{
            color:
              language === 'en'
                ? theme.colors.text.primary
                : theme.colors.text.tertiary,
          }}
        >
          EN
        </Text>
      </Pressable>
    </View>
  )
}

// ─── PRIMARY BUTTON ───────────────────────────────────────────────────────
//
// Fuchsia fill, white text, Bricolage 500. Press = scale(0.97)/160ms per
// the Emil rule (BRAND.md §7.3).
function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  const scale = useSharedValue(1)
  const ease  = Easing.bezier(0.22, 1, 0.36, 1)
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <Animated.View style={scaleStyle}>
      <Pressable
        onPressIn={() => { scale.value = withTiming(0.97, { duration: 100, easing: ease }) }}
        onPressOut={() => { scale.value = withTiming(1,    { duration: 200, easing: ease }) }}
        onPress={onPress}
        style={({ hovered }: any) => [
          {
            backgroundColor: palette.fuchsia[500],
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 10,
          },
          Platform.OS === 'web' && hovered
            ? ({ boxShadow: '0 8px 24px rgba(255, 4, 114, 0.35)' } as any)
            : null,
        ]}
      >
        <Text
          style={{
            fontFamily: 'BricolageGrotesque-Medium',
            fontSize: 14,
            letterSpacing: 0.28,
            color: '#ffffff',
          }}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  )
}

// ─── SECONDARY BUTTON ─────────────────────────────────────────────────────
//
// White fill, Void text, 1.5px Sand outline. NOT pink — hierarchy comes
// from the colour contrast with the primary button. Two pink buttons
// compete; one fuchsia + one neutral is the right pair.
function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  const scale = useSharedValue(1)
  const ease  = Easing.bezier(0.22, 1, 0.36, 1)
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <Animated.View style={scaleStyle}>
      <Pressable
        onPressIn={() => { scale.value = withTiming(0.97, { duration: 100, easing: ease }) }}
        onPressOut={() => { scale.value = withTiming(1,    { duration: 200, easing: ease }) }}
        onPress={onPress}
        style={{
          backgroundColor: '#ffffff',
          borderWidth: 1.5,
          borderColor: palette.sand[300],
          borderRadius: 14,
          paddingVertical: 14,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            fontFamily: 'Inter-Regular',
            fontSize: 12,
            color: palette.void[500],
          }}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  )
}
