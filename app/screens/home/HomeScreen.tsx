// Anoqi — HomeScreen (v2.0 Bloom register).
//
// White canvas. A low-intensity apricot bloom in the top-right. A prominent
// "Commencer une conversation" fuchsia CTA — the home screen's reason to
// exist is to get the user into chat. Below it: Insight, Documents,
// Summaries, Cycle (coming soon) — in that order, per the v2.1 visual
// review.
//
// This screen wraps itself in <ThemeProvider mode="light"> so it picks up
// the v2.0 tokens while the rest of the app (still on the v1.0 Sanctuary
// dark theme) keeps rendering as it did. When App.tsx flips its default
// mode to "light", the wrapper can come out.
//
// Mockup reference: Marion's home-screen mockup (2026-05-18). Layout
// ordering is from that mockup; visual register is from BRAND.md.

import React, { useCallback, useEffect, useState } from 'react'
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  View,
  useWindowDimensions,
} from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg'

import { useOnboarding, type HealthObjective } from '../../context/OnboardingContext'
import { ThemeProvider, useTheme, palette } from '../../theme'
import { Text } from '../../components'
import { listDocuments, type DocumentIndexEntry } from '../../lib/documentStore'

// ─── COPY ──────────────────────────────────────────────────────────────────
const COPY = {
  fr: {
    greetingMorning:   'Bonjour',
    greetingAfternoon: 'Bon après-midi',
    greetingEvening:   'Bonsoir',
    waveEmoji:         '👋',
    subtitle:          'Prête pour ta consultation ?',
    cta:               'Commencer une conversation →',
    insightEyebrow:    'Ton insight',
    insightSource:     'NHS',
    summariesTitle:    'Mes résumés',
    summariesEmpty:    'Aucun résumé pour l\'instant',
    summariesView:     'Voir →',
    documentsTitle:    'Documents',
    documentsEmpty:    'Ajoute tes ordonnances, analyses…',
    documentsAdd:      'Ajouter →',
    documentsCount:    (n: number) => `${n} document${n > 1 ? 's' : ''} en mémoire`,
    cycleTitle:        'Cycle',
    cycleSoon:         'Bientôt disponible',
  },
  en: {
    greetingMorning:   'Good morning',
    greetingAfternoon: 'Good afternoon',
    greetingEvening:   'Good evening',
    waveEmoji:         '👋',
    subtitle:          'Ready for your consultation?',
    cta:               'Start a conversation →',
    insightEyebrow:    'Your insight',
    insightSource:     'NHS',
    summariesTitle:    'My summaries',
    summariesEmpty:    'No summaries yet',
    summariesView:     'View →',
    documentsTitle:    'Documents',
    documentsEmpty:    'Add prescriptions, lab results…',
    documentsAdd:      'Add →',
    documentsCount:    (n: number) => `${n} document${n > 1 ? 's' : ''} in memory`,
    cycleTitle:        'Cycle',
    cycleSoon:         'Coming soon',
  },
} as const

// Per-objective insight headline — keeps the existing structure simple.
const INSIGHTS: Record<HealthObjective | 'general', { fr: string; en: string }> = {
  symptoms: {
    fr: 'Suivre tes symptômes sur 2 à 3 cycles donne à ton médecin une image beaucoup plus claire.',
    en: 'Tracking your symptoms across 2–3 cycles gives your doctor a much clearer picture.',
  },
  menopause: {
    fr: 'La périménopause peut commencer 10 ans avant tes dernières règles — les changements de cycle sont souvent le premier signe.',
    en: 'Perimenopause can begin up to 10 years before your last period — changes in cycle length are often the first sign.',
  },
  contraception: {
    fr: 'Choisir une contraception, c\'est trouver l\'équilibre entre efficacité, effets, et ton mode de vie.',
    en: 'Choosing contraception is about balancing effectiveness, side effects, and your lifestyle.',
  },
  fertility: {
    fr: 'La fenêtre fertile dure environ 6 jours par cycle — connaître la tienne te donne du pouvoir d\'agir.',
    en: 'Your fertile window is about 6 days per cycle — knowing yours gives you agency.',
  },
  general: {
    fr: 'Les fluctuations hormonales tout au long du cycle influencent ton énergie, ton humeur, et ta concentration.',
    en: 'Hormonal fluctuations throughout your cycle influence your energy, mood, and concentration.',
  },
}

function getGreeting(hour: number, copy: typeof COPY[keyof typeof COPY]): string {
  if (hour < 12) return copy.greetingMorning
  if (hour < 18) return copy.greetingAfternoon
  return copy.greetingEvening
}

// ─── PUBLIC ENTRY ──────────────────────────────────────────────────────────
export function HomeScreen() {
  return (
    <ThemeProvider mode="light">
      <HomeScreenInner />
    </ThemeProvider>
  )
}

// ─── INNER ─────────────────────────────────────────────────────────────────
function HomeScreenInner() {
  const navigation = useNavigation<any>()
  const { language, objective } = useOnboarding()
  const { width } = useWindowDimensions()
  const theme = useTheme()
  const copy = COPY[language]

  const isCompact = width < 480
  const bloomSize = isCompact ? 320 : 420   // ~60% of WelcomeScreen size per BRAND.md §4.3
  const greeting  = getGreeting(new Date().getHours(), copy)
  const objKey    = (objective ?? 'general') as HealthObjective | 'general'
  const insight   = INSIGHTS[objKey][language]

  const [documents, setDocuments] = useState<DocumentIndexEntry[]>([])

  // Refresh the document index whenever the screen regains focus.
  useFocusEffect(
    useCallback(() => {
      listDocuments()
        .then(setDocuments)
        .catch(() => { /* silent — the empty state is fine */ })
    }, []),
  )

  const goChat      = () => navigation.navigate('Chat')
  const goDocuments = () => navigation.navigate('Documents')

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg.canvas }}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.bg.canvas} />

      {/* Apricot bloom — low intensity (~60%) per BRAND.md §4.3 for inner
          screens. Same geometry as the WelcomeScreen, smaller canvas. */}
      <Bloom size={bloomSize} intensity={0.6} />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: isCompact ? 24 : 40,
            paddingTop: isCompact ? 28 : 36,
            paddingBottom: 120, // clear the bottom tab bar
            maxWidth: 640,
            width: '100%',
            alignSelf: 'center',
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Greeting block */}
          <Text
            variant="h1"
            style={{
              color: theme.colors.text.primary,
              fontSize: isCompact ? 32 : 38,
              lineHeight: isCompact ? 36 : 42,
              marginBottom: 8,
            }}
          >
            {greeting} {copy.waveEmoji}
          </Text>
          <Text
            variant="body"
            style={{
              color: theme.colors.text.secondary,
              marginBottom: isCompact ? 24 : 28,
            }}
          >
            {copy.subtitle}
          </Text>

          {/* The hero CTA — get me into chat. */}
          <PrimaryCTA label={copy.cta} onPress={goChat} />

          {/* Insight card — Petal-tinted, fuchsia eyebrow, source tag. */}
          <View style={{ marginTop: 28 }}>
            <Card tone="petal">
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 12,
                }}
              >
                <Text variant="eyebrow" style={{ color: palette.fuchsia[500] }}>
                  {copy.insightEyebrow.toUpperCase()}
                </Text>
                <Text variant="caption" style={{ color: theme.colors.text.secondary }}>
                  {copy.insightSource}
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: 'BricolageGrotesque-Bold',
                  fontSize: 20,
                  lineHeight: 28,
                  letterSpacing: -0.3,
                  color: theme.colors.text.primary,
                }}
              >
                {insight}
              </Text>
            </Card>
          </View>

          {/* Documents card */}
          <View style={{ marginTop: 16 }}>
            <Card>
              <RowHeader
                title={copy.documentsTitle}
                action={documents.length > 0 ? copy.documentsAdd : undefined}
                onAction={goDocuments}
              />
              <Text
                variant="body"
                style={{ color: theme.colors.text.secondary, marginTop: 6 }}
              >
                {documents.length > 0
                  ? copy.documentsCount(documents.length)
                  : copy.documentsEmpty}
              </Text>
            </Card>
          </View>

          {/* Summaries card */}
          <View style={{ marginTop: 16 }}>
            <Card>
              <RowHeader title={copy.summariesTitle} />
              <Text
                variant="body"
                style={{ color: theme.colors.text.secondary, marginTop: 6 }}
              >
                {copy.summariesEmpty}
              </Text>
            </Card>
          </View>

          {/* Cycle — coming soon */}
          <View style={{ marginTop: 16 }}>
            <Card>
              <RowHeader title={copy.cycleTitle} badge={copy.cycleSoon} />
            </Card>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

// ─── BLOOM ─────────────────────────────────────────────────────────────────
//
// Reduced-intensity variant of the WelcomeScreen bloom. The geometry is
// identical (locked in BRAND.md §4.1); only the opacity scale changes.
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
          <RadialGradient id="apricotHome" cx="72%" cy="10%" r="55%" fx="72%" fy="10%">
            <Stop offset="0%"   stopColor={palette.apricot[400]} stopOpacity={stop0} />
            <Stop offset="35%"  stopColor={palette.apricot[400]} stopOpacity={stop1} />
            <Stop offset="70%"  stopColor={palette.apricot[400]} stopOpacity={stop2} />
            <Stop offset="100%" stopColor={palette.apricot[400]} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={size} height={size} fill="url(#apricotHome)" />
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

// ─── PRIMARY CTA ───────────────────────────────────────────────────────────
//
// The hero "Commencer une conversation" button. Fuchsia fill, white text,
// Bricolage 500, radius 14, Emil press rule.
function PrimaryCTA({ label, onPress }: { label: string; onPress: () => void }) {
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
            paddingVertical: 18,
            alignItems: 'center',
            justifyContent: 'center',
          },
          Platform.OS === 'web' && hovered
            ? ({ boxShadow: '0 8px 24px rgba(255, 4, 114, 0.35)' } as any)
            : null,
        ]}
      >
        <Text
          style={{
            fontFamily: 'BricolageGrotesque-Medium',
            fontSize: 15,
            letterSpacing: 0.3,
            color: '#ffffff',
          }}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  )
}

// ─── CARD ──────────────────────────────────────────────────────────────────
//
// Inlined here to avoid coupling to the v1.0 Card component (which still
// uses the dark register). Once Card.tsx itself migrates to v2.0 this can
// be replaced with the shared component.
function Card({
  children,
  tone = 'white',
}: {
  children: React.ReactNode
  tone?: 'white' | 'petal'
}) {
  return (
    <View
      style={{
        backgroundColor: tone === 'petal' ? palette.petal[100] : '#ffffff',
        borderWidth: 1.5,
        borderColor: tone === 'petal' ? 'transparent' : palette.sand[300],
        borderRadius: 14,
        padding: 18,
      }}
    >
      {children}
    </View>
  )
}

function RowHeader({
  title,
  action,
  onAction,
  badge,
}: {
  title:    string
  action?:  string
  onAction?: () => void
  badge?:   string
}) {
  const theme = useTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          fontFamily: 'BricolageGrotesque-Bold',
          fontSize: 16,
          color: theme.colors.text.primary,
          letterSpacing: -0.2,
        }}
      >
        {title}
      </Text>
      {action ? (
        <Pressable hitSlop={8} onPress={onAction}>
          <Text variant="caption" style={{ color: palette.fuchsia[500] }}>
            {action}
          </Text>
        </Pressable>
      ) : null}
      {badge ? (
        <Text
          variant="caption"
          style={{
            color: theme.colors.text.secondary,
            fontStyle: 'italic',
          }}
        >
          {badge}
        </Text>
      ) : null}
    </View>
  )
}
