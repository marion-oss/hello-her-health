// Anoqi — WelcomeScreen.
//
// Two layouts.
//   • Desktop (web ≥ 900px) — editorial split. Peony-tinted left panel holds
//     the brand chrome, headline, italic descriptor, trust pillars and CTA;
//     the photograph fills the right half. Mavie's desktop treatment.
//   • Mobile / narrow web — full-bleed photograph with a soft mauve-ink
//     scrim and the same content stack overlaid bottom-left.

import React from 'react'
import {
  Image,
  ImageBackground,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  View,
  useWindowDimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation } from '@react-navigation/native'

import { useOnboarding, type Language } from '../../context/OnboardingContext'
import { useTheme, palette } from '../../theme'
import { Button, Text, Icon } from '../../components'

// Two hero photographs — swap the mobile asset for a landscape/9:16 crop
// when ready; the desktop split panel already uses a portrait-friendly crop.
const HERO_DESKTOP = require('../../../assets/welcome-hero.jpg')
const HERO_MOBILE = require('../../../assets/welcome-hero.jpg')

const COPY = {
  fr: {
    eyebrow: 'Pour la santé des femmes',
    headline: ['Sois écoutée.', 'Sois informée.'],
    descriptor:
      'Anoqi t\'aide à comprendre tes symptômes, préparer tes consultations, et naviguer le système médical en confiance.',
    pillars: [
      'Sources médicales validées (NHS, HAS, NICE…)',
      'Études menées sur les femmes',
      'Jamais lié à ton nom ou à ton identité',
    ],
    cta: 'Commencer',
    login: "J'ai déjà un compte",
  },
  en: {
    eyebrow: 'For women, by design',
    headline: ['Be heard.', 'Be informed.'],
    descriptor:
      'Anoqi helps you understand symptoms, prepare for appointments, and navigate the medical system with confidence.',
    pillars: [
      'Validated medical sources (NHS, HAS, NICE…)',
      'Research conducted on women',
      'Never linked to your name or identity',
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

  if (isDesktop) {
    return (
      <DesktopLayout
        copy={copy}
        language={language}
        setLanguage={setLanguage}
        onCta={goObjective}
        onLogin={goLogin}
      />
    )
  }

  return (
    <MobileLayout
      copy={copy}
      language={language}
      setLanguage={setLanguage}
      onCta={goObjective}
      onLogin={goLogin}
    />
  )
}

// ─── Desktop ────────────────────────────────────────────────────────────────

function DesktopLayout({
  copy,
  language,
  setLanguage,
  onCta,
  onLogin,
}: {
  copy: Copy
  language: Language
  setLanguage: (l: Language) => void
  onCta: () => void
  onLogin: () => void
}) {
  const theme = useTheme()

  // Escape the 60% appShell on web so the split layout occupies the full
  // viewport. position: 'fixed' is a web-only value; the cast keeps RN's
  // type system quiet without affecting native (which never enters this
  // branch).
  const fullViewport = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  } as any

  return (
    <View style={[fullViewport, { flexDirection: 'row' }]}>
      {/* Left — text panel on a peony-tinted wash that echoes the photo's
          background wall and creates one continuous visual field. */}
      <View
        style={{
          flex: 1,
          backgroundColor: palette.peony[100],
          paddingHorizontal: 72,
          paddingTop: 56,
          paddingBottom: 56,
          justifyContent: 'space-between',
          minWidth: 480,
        }}
      >
        {/* Wordmark — anchor top-left */}
        <Text
          variant="h2Italic"
          style={{
            color: palette.peony[700],
            fontSize: 28,
            lineHeight: 32,
          }}
        >
          anoqi
        </Text>

        {/* Headline cluster — sits vertically centered-ish in the middle */}
        <View style={{ maxWidth: 600, marginTop: -40 }}>
          <Text
            variant="eyebrow"
            style={{
              color: palette.teal[700],
              textTransform: 'uppercase',
              marginBottom: theme.spacing[4],
              opacity: 0.95,
            }}
          >
            {copy.eyebrow}
          </Text>

          {copy.headline.map((line, i) => (
            <Text
              key={i}
              variant="display"
              style={{
                color: palette.ink[900],
                fontSize: 68,
                lineHeight: 72,
                letterSpacing: -1.4,
              }}
            >
              {line}
            </Text>
          ))}

          <Text
            variant="displayItalic"
            style={{
              color: palette.peony[700],
              fontSize: 21,
              lineHeight: 30,
              letterSpacing: 0,
              marginTop: theme.spacing[5],
              maxWidth: 540,
            }}
          >
            {copy.descriptor}
          </Text>

          <View
            style={{
              flexDirection: 'row',
              marginTop: theme.spacing[8],
              gap: theme.spacing[6],
              flexWrap: 'wrap',
              maxWidth: 620,
            }}
          >
            {copy.pillars.map((pillar) => (
              <View
                key={pillar}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  flex: 1,
                  minWidth: 170,
                  gap: 8,
                }}
              >
                <Text
                  variant="bodyMed"
                  style={{
                    color: palette.peony[500],
                    fontSize: 16,
                    lineHeight: 22,
                  }}
                >
                  ✦
                </Text>
                <Text
                  variant="caption"
                  style={{
                    color: palette.ink[800],
                    fontSize: 13.5,
                    lineHeight: 19,
                    letterSpacing: 0.1,
                    flex: 1,
                  }}
                >
                  {pillar}
                </Text>
              </View>
            ))}
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: theme.spacing[8],
              gap: theme.spacing[6],
              flexWrap: 'wrap',
            }}
          >
            <Button
              label={copy.cta}
              size="lg"
              onPress={onCta}
              rightAdornment={
                <Icon
                  name="ArrowRight"
                  size={18}
                  color={theme.colors.accent.primaryOnText}
                  strokeWidth={2}
                />
              }
            />
            <Pressable accessibilityRole="link" onPress={onLogin} hitSlop={10}>
              <Text
                variant="bodyMed"
                style={{
                  color: palette.ink[900],
                  textDecorationLine: 'underline',
                }}
              >
                {copy.login}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Bottom spacer — keeps the headline block roughly optical-centered */}
        <View />
      </View>

      {/* Right — photograph fills the panel, language toggle floats top-right
          over a tiny scrim. */}
      <View style={{ flex: 1, position: 'relative', minWidth: 360 }}>
        <ImageBackground
          source={HERO_DESKTOP}
          resizeMode="cover"
          style={{ flex: 1 }}
        />
        <LinearGradient
          colors={['rgba(36, 26, 34, 0.22)', 'rgba(36, 26, 34, 0)']}
          locations={[0, 1]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120 }}
        />
        <View
          style={{
            position: 'absolute',
            top: 56,
            right: 56,
          }}
        >
          <LanguageToggle
            language={language}
            setLanguage={setLanguage}
            tone="dark"
          />
        </View>
      </View>
    </View>
  )
}

// ─── Mobile / narrow web ────────────────────────────────────────────────────

function MobileLayout({
  copy,
  language,
  setLanguage,
  onCta,
  onLogin,
}: {
  copy: Copy
  language: Language
  setLanguage: (l: Language) => void
  onCta: () => void
  onLogin: () => void
}) {
  const theme = useTheme()
  const { height } = useWindowDimensions()
  const isWeb = Platform.OS === 'web'

  // On web, escape the 60% appShell column so the photograph fills the
  // viewport edge to edge — true 100% background.
  const fillViewport = isWeb
    ? ({ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 } as any)
    : { flex: 1 }

  const compact = height < 760
  const displaySize = compact ? 38 : 44
  const displayLine = compact ? 42 : 48

  return (
    <View style={[fillViewport, { backgroundColor: palette.peony[300] }]}>
      <StatusBar barStyle="light-content" backgroundColor={palette.peony[400]} />

      {/* Single full-bleed background photograph at 100% width × 100% height.
          When the mobile-specific asset is supplied, swap HERO_MOBILE above. */}
      <Image
        source={HERO_MOBILE}
        resizeMode="cover"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
        }}
      />

      {/* Bottom scrim — keeps the text block legible without darkening the
          upper portion of the photograph. */}
      <LinearGradient
        colors={[
          'rgba(36, 26, 34, 0)',
          'rgba(36, 26, 34, 0.55)',
          'rgba(36, 26, 34, 0.88)',
        ]}
        locations={[0.55, 0.78, 1]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* Top scrim — keeps the wordmark legible against the bright wall. */}
      <LinearGradient
        colors={['rgba(36, 26, 34, 0.35)', 'rgba(36, 26, 34, 0)']}
        locations={[0, 1]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 130 }}
      />

      {/* Content overlay */}
      <SafeAreaView style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: theme.spacing[5],
            paddingTop: theme.spacing[5],
          }}
        >
          <Text
            variant="h2Italic"
            style={{
              color: theme.colors.bg.canvas,
              fontSize: 24,
              lineHeight: 28,
              textShadowColor: 'rgba(36, 26, 34, 0.3)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 6,
            }}
          >
            anoqi
          </Text>
          <LanguageToggle language={language} setLanguage={setLanguage} tone="light" />
        </View>

        <View style={{ flex: 1 }} />

        <View
          style={{
            paddingHorizontal: theme.spacing[5],
            paddingBottom: theme.spacing[6],
          }}
        >
          <Text
            variant="eyebrow"
            style={{
              color: palette.carnation[200],
              textTransform: 'uppercase',
              marginBottom: theme.spacing[2],
              letterSpacing: 2.2,
              fontSize: 11,
            }}
          >
            {copy.eyebrow}
          </Text>

          {copy.headline.map((line, i) => (
            <Text
              key={i}
              variant="display"
              style={{
                color: '#ffffff',
                fontSize: displaySize,
                lineHeight: displayLine,
                letterSpacing: -0.8,
                textShadowColor: 'rgba(36, 26, 34, 0.45)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 10,
              }}
            >
              {line}
            </Text>
          ))}

          <Text
            variant="displayItalic"
            style={{
              color: '#ffffff',
              fontSize: 15,
              lineHeight: 21,
              letterSpacing: 0,
              marginTop: theme.spacing[3],
              textShadowColor: 'rgba(36, 26, 34, 0.55)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 8,
            }}
          >
            {copy.descriptor}
          </Text>

          <View style={{ marginTop: theme.spacing[4], gap: 4 }}>
            {copy.pillars.map((pillar) => (
              <View
                key={pillar}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                <Text
                  style={{
                    color: palette.carnation[300],
                    fontSize: 13,
                    lineHeight: 18,
                  }}
                >
                  ✦
                </Text>
                <Text
                  style={{
                    color: '#ffffff',
                    fontSize: 12.5,
                    lineHeight: 18,
                    letterSpacing: 0.1,
                    flex: 1,
                    textShadowColor: 'rgba(36, 26, 34, 0.6)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 6,
                  }}
                >
                  {pillar}
                </Text>
              </View>
            ))}
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: theme.spacing[5],
              gap: theme.spacing[4],
              flexWrap: 'wrap',
            }}
          >
            <Button
              label={copy.cta}
              size="md"
              onPress={onCta}
              rightAdornment={
                <Icon
                  name="ArrowRight"
                  size={16}
                  color={theme.colors.accent.primaryOnText}
                  strokeWidth={2}
                />
              }
            />
            <Pressable accessibilityRole="link" onPress={onLogin} hitSlop={10}>
              <Text
                variant="bodyMed"
                style={{
                  color: theme.colors.bg.canvas,
                  textDecorationLine: 'underline',
                  opacity: 0.95,
                  fontSize: 14,
                }}
              >
                {copy.login}
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  )
}

// ─── Language toggle ────────────────────────────────────────────────────────

function LanguageToggle({
  language,
  setLanguage,
  tone,
}: {
  language: Language
  setLanguage: (l: Language) => void
  tone: 'light' | 'dark'
}) {
  const theme = useTheme()

  // "light" tone = cream pill over a photograph (mobile bleed)
  // "dark"  tone = inky pill over the photograph in the desktop right panel
  const isLight = tone === 'light'
  const trackBg = isLight ? 'rgba(253, 252, 252, 0.18)' : 'rgba(253, 252, 252, 0.18)'
  const trackBorder = isLight ? 'rgba(253, 252, 252, 0.28)' : 'rgba(253, 252, 252, 0.32)'
  const dividerColor = isLight ? 'rgba(253, 252, 252, 0.28)' : 'rgba(253, 252, 252, 0.32)'
  const activeBg = 'rgba(253, 252, 252, 0.92)'
  const idleColor = theme.colors.bg.canvas
  const activeColor = theme.colors.text.primary

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: trackBg,
        borderRadius: theme.radii.pill,
        paddingHorizontal: 4,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: trackBorder,
      }}
    >
      {(['fr', 'en'] as Language[]).map((lang, i) => {
        const active = language === lang
        return (
          <React.Fragment key={lang}>
            {i === 1 ? (
              <View
                style={{
                  width: 1,
                  height: 14,
                  backgroundColor: dividerColor,
                  marginHorizontal: 2,
                }}
              />
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={lang === 'fr' ? 'Français' : 'English'}
              onPress={() => setLanguage(lang)}
              style={{
                paddingHorizontal: theme.spacing[3],
                paddingVertical: 6,
                borderRadius: theme.radii.pill,
                backgroundColor: active ? activeBg : 'transparent',
              }}
            >
              <Text
                variant="caption"
                style={{
                  color: active ? activeColor : idleColor,
                  textTransform: 'uppercase',
                }}
              >
                {lang}
              </Text>
            </Pressable>
          </React.Fragment>
        )
      })}
    </View>
  )
}
