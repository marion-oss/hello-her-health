// Anoqi — WelcomeScreen (iridescent register).
//
// Void canvas, a faint breathing-form in the lower-right, a frosted glass
// hero card centered with italic Cormorant Garamond setting:
//   "Mieux informée. / Mieux entendue."
//
// Beneath the glass card, a slow-moving LiquidEmber layer breathes warm ember
// (and a single fuchsia bloom) so the card feels alive without ever pulling
// the eye. CTA is a glass pill with a pulsing fuchsia dot — that one dot is
// the brand's only fully-saturated mark on the screen.
//
// One layout serves both mobile and desktop; the glass card centres itself
// and the SafeAreaView caps the top/bottom on native. On web the screen
// escapes the 60% appShell column via `position: 'fixed'` so the ambient
// background extends edge to edge.

import React, { useEffect } from 'react'
import {
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  View,
  useWindowDimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation } from '@react-navigation/native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

import { useOnboarding, type Language } from '../../context/OnboardingContext'
import { hover, useTheme, palette } from '../../theme'
import { BreathingForm, LiquidEmber, Text, Wordmark } from '../../components'

const COPY = {
  fr: {
    trustEyebrow: 'Precision · Biology-first · Privé',
    headline: ['Mieux informée.', 'Mieux entendue.'],
    descriptor:
      "Anoqi est ta compagne santé — pour comprendre tes symptômes, préparer tes consultations, et naviguer le système médical en confiance.",
    pillars: [
      { n: '01', label: 'Sources médicales',     detail: 'NHS · HAS · NICE'    },
      { n: '02', label: 'Étudié sur les femmes', detail: ''                    },
      { n: '03', label: 'Anonyme',               detail: 'Jamais lié à ton nom' },
    ],
    cta: 'Commencer',
    login: "J'ai déjà un compte",
  },
  en: {
    trustEyebrow: 'Precision · Biology-first · Private',
    headline: ['Better informed.', 'Better heard.'],
    descriptor:
      'Anoqi is your health companion — helping you understand your symptoms, prepare for appointments, and navigate the medical system with confidence.',
    pillars: [
      { n: '01', label: 'Medical sources',  detail: 'NHS · HAS · NICE'        },
      { n: '02', label: 'Studied on women', detail: ''                        },
      { n: '03', label: 'Anonymous',        detail: 'Never linked to your name' },
    ],
    cta: 'Get started',
    login: 'I already have an account',
  },
} as const

type Copy = (typeof COPY)['fr']

export function WelcomeScreen() {
  const navigation = useNavigation<any>()
  const { language, setLanguage } = useOnboarding()
  const { width } = useWindowDimensions()

  const copy = COPY[language]
  const isDesktop = Platform.OS === 'web' && width >= 900

  const goObjective = () => navigation.navigate('Objective')
  const goLogin = () => navigation.navigate('Account', { mode: 'login' })

  // On web, escape the 60% appShell column so the ambient backdrop fills
  // the whole viewport. Native sits inside its normal flex root.
  const escapeShell = Platform.OS === 'web'
    ? ({
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      } as any)
    : { flex: 1 }

  return (
    <View style={[escapeShell, { backgroundColor: palette.void[500] }]}>
      <StatusBar barStyle="light-content" backgroundColor={palette.void[500]} />

      {/* Breathing form — the brand's signature visual. On desktop web,
          sits in the right void area, outside the centred glass card so
          both stay visible. On mobile/native, fills the canvas centred
          behind everything. */}
      <View
        pointerEvents="none"
        style={
          isDesktop
            ? {
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                width: 810,
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ translateX: 80 }],
              }
            : {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ translateX: 80 }],
              }
        }
      >
        <BreathingForm size={isDesktop ? 765 : 1440} />
      </View>

      {/* A faint corner glow opposite the breathing form so the canvas is
          never quite empty. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: -160,
          top: -120,
          width: 480,
          height: 480,
        }}
      >
        <LinearGradient
          colors={[
            'rgba(196, 128, 106, 0.32)',
            'rgba(196, 128, 106, 0)',
          ]}
          locations={[0, 1]}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
          style={{
            flex: 1,
            borderRadius: 9999,
            ...(Platform.OS === 'web' ? ({ filter: 'blur(60px)' } as any) : null),
          }}
        />
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            paddingHorizontal: isDesktop ? 96 : 24,
            paddingTop: isDesktop ? 32 : 18,
            paddingBottom: isDesktop ? 48 : 28,
          }}
        >
          {/* Header — wordmark + lang toggle */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: isDesktop ? 32 : 24,
            }}
          >
            <Wordmark size={isDesktop ? 28 : 22} />
            <LangToggle language={language} onChange={setLanguage} />
          </View>

          {/* Hero glass card — centred, holds all the copy + CTA. */}
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: '100%',
                maxWidth: isDesktop ? 720 : 480,
                borderRadius: 28,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {/* Slow ember motion under the glass */}
              <LiquidEmber intensity={1.15} blur={56} borderRadius={28} />

              {/* The glass surface */}
              <View
                style={[
                  {
                    backgroundColor: 'rgba(255, 245, 238, 0.05)',
                    borderWidth: 1,
                    borderColor: 'rgba(255, 245, 238, 0.10)',
                    borderRadius: 28,
                    padding: isDesktop ? 56 : 32,
                  },
                  Platform.OS === 'web'
                    ? ({
                        backdropFilter: 'blur(22px) saturate(140%)',
                        WebkitBackdropFilter: 'blur(22px) saturate(140%)',
                      } as any)
                    : null,
                ]}
              >
                <Text
                  variant="eyebrow"
                  style={{
                    color: 'rgba(255, 245, 238, 0.55)',
                    marginBottom: isDesktop ? 32 : 24,
                  }}
                >
                  {copy.trustEyebrow}
                </Text>

                <Text
                  variant={isDesktop ? 'display' : 'h1Italic'}
                  style={{
                    color: palette.warmWhite[100],
                    marginBottom: 4,
                  }}
                >
                  {copy.headline[0]}
                </Text>
                <Text
                  variant={isDesktop ? 'display' : 'h1Italic'}
                  style={{
                    color: palette.ember[400],
                    marginBottom: isDesktop ? 28 : 22,
                  }}
                >
                  {copy.headline[1]}
                </Text>

                <Text
                  variant="bodyLight"
                  style={{
                    color: 'rgba(255, 245, 238, 0.7)',
                    maxWidth: 480,
                    marginBottom: isDesktop ? 36 : 28,
                  }}
                >
                  {copy.descriptor}
                </Text>

                {/* Three trust pillars — single row, no numbered eyebrows.
                    Each column gets a hairline divider and the detail line
                    is rendered only when present. */}
                <View
                  style={{
                    flexDirection: 'row',
                    gap: isDesktop ? 24 : 14,
                    marginBottom: isDesktop ? 40 : 28,
                  }}
                >
                  {copy.pillars.map((p) => (
                    <View
                      key={p.n}
                      style={{
                        flex: 1,
                        paddingTop: 14,
                        borderTopWidth: 1,
                        borderTopColor: 'rgba(255, 245, 238, 0.10)',
                      }}
                    >
                      <Text
                        variant={isDesktop ? 'labelLg' : 'label'}
                        style={{
                          color: palette.warmWhite[100],
                          marginBottom: p.detail ? 2 : 0,
                        }}
                      >
                        {p.label}
                      </Text>
                      {p.detail ? (
                        <Text
                          variant="caption"
                          style={{ color: 'rgba(255, 245, 238, 0.5)' }}
                        >
                          {p.detail}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>

                <GlassCTA label={copy.cta} onPress={goObjective} />

                <Pressable
                  onPress={goLogin}
                  style={({ hovered }: any) => [
                    {
                      marginTop: isDesktop ? 22 : 18,
                      alignSelf: 'center',
                    },
                    hover.transition,
                    hovered && hover.lift,
                  ]}
                >
                  {({ hovered }: any) => (
                    <Text
                      variant="label"
                      style={{
                        color: hovered
                          ? palette.warmWhite[100]
                          : 'rgba(255, 245, 238, 0.6)',
                        textDecorationLine: 'underline',
                        textDecorationColor: palette.fuchsia[500],
                      }}
                    >
                      {copy.login}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  )
}

// ─── Small parts ────────────────────────────────────────────────────────────

function LangToggle({
  language,
  onChange,
}: {
  language: Language
  onChange: (l: Language) => void
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Pressable
        onPress={() => onChange('fr')}
        style={({ hovered }: any) => [hover.transition, hovered && hover.lift]}
      >
        {({ hovered }: any) => (
          <Text
            variant="eyebrow"
            style={{
              color:
                language === 'fr'
                  ? palette.warmWhite[100]
                  : hovered
                    ? 'rgba(255,245,238,0.85)'
                    : 'rgba(255,245,238,0.4)',
            }}
          >
            FR
          </Text>
        )}
      </Pressable>
      <Text
        variant="eyebrow"
        style={{ color: 'rgba(255,245,238,0.3)' }}
      >
        ·
      </Text>
      <Pressable
        onPress={() => onChange('en')}
        style={({ hovered }: any) => [hover.transition, hovered && hover.lift]}
      >
        {({ hovered }: any) => (
          <Text
            variant="eyebrow"
            style={{
              color:
                language === 'en'
                  ? palette.warmWhite[100]
                  : hovered
                    ? 'rgba(255,245,238,0.85)'
                    : 'rgba(255,245,238,0.4)',
            }}
          >
            EN
          </Text>
        )}
      </Pressable>
    </View>
  )
}

function GlassCTA({ label, onPress }: { label: string; onPress: () => void }) {
  // Press-down feedback
  const scale = useSharedValue(1)
  const ease = Easing.bezier(0.22, 1, 0.36, 1)

  // Logo-style pulsing dot for the CTA
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
    opacity: 0.95 - 0.35 * pulse.value,
    transform: [{ scale: 1 - 0.18 * pulse.value }],
  }))

  return (
    <Animated.View style={scaleStyle}>
      <Pressable
        onPressIn={() => {
          scale.value = withTiming(0.97, { duration: 100, easing: ease })
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 200, easing: ease })
        }}
        onPress={onPress}
        style={({ hovered }: any) => [
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 22,
            paddingVertical: 18,
            borderRadius: 999,
            backgroundColor: 'rgba(255, 245, 238, 0.08)',
            borderWidth: 1,
            borderColor: 'rgba(255, 245, 238, 0.18)',
          },
          Platform.OS === 'web'
            ? ({
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
              } as any)
            : null,
          hover.transition,
          hovered && hover.lift,
          hovered && {
            backgroundColor: 'rgba(255, 245, 238, 0.12)',
            borderColor: 'rgba(255, 245, 238, 0.30)',
          },
          hovered && hover.glow('rgba(255, 4, 114, 0.35)'),
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Animated.View
            style={[
              {
                width: 10,
                height: 10,
                borderRadius: 999,
                backgroundColor: palette.fuchsia[500],
                ...(Platform.OS === 'web'
                  ? ({
                      boxShadow: '0 0 18px rgba(255, 4, 114, 0.55)',
                    } as any)
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
          <Text
            variant="bodyMed"
            style={{ color: palette.warmWhite[100], letterSpacing: 0.2 }}
          >
            {label}
          </Text>
        </View>
        <Text
          style={{
            fontFamily: 'Inter-Regular',
            fontSize: 18,
            color: palette.warmWhite[100],
            opacity: 0.7,
          }}
        >
          →
        </Text>
      </Pressable>
    </Animated.View>
  )
}
