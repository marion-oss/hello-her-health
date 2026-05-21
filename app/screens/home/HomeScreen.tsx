// Anoqi — HomeScreen (v2.2 Bloom register, Plum insight surface).
//
// Layout matches Marion's HomeScreen-v2.2 mockup (Path C, 2026-05-19):
//
//   Header        — anoqi wordmark · Mon profil chip
//   Greeting      — "AUJOURD'HUI" eyebrow · "Bonjour{, Name}." (name in fuchsia
//                   if we have one, otherwise wave emoji)
//   Subhead       — "Pose-moi une question. Sans détour."
//   Primary CTA   — fuchsia "Commencer une conversation →" with speech-bubble
//                   icon, alignment per ac14740 (Marion's spec)
//   Insight card  — Plum (#2D1A2E) surface. Apricot eyebrow + source chip on
//                   top, warm-white body, fuchsia stat extract, divider, two
//                   inner pills (Préparer ma consultation primary fuchsia /
//                   En savoir plus ghost).
//   Mini cards    — Documents · Résumés side-by-side, Petal icon boxes,
//                   fuchsia stroke icons
//   Cycle card    — fuchsia ring + core, "Bientôt disponible"
//   Knowledge     — Petal-tinted card, fuchsia eyebrow "Savoir du jour ·
//                   Cochrane", italic body, fuchsia swipe hint
//
// Apricot-accent text/chips inside the Plum surface are the documented v2.2
// exception to "apricot is decoration only" (BRAND.md §3 update pending).
//
// The Knowledge card body uses italic — matches mockup, and is the second
// place v2.2 carries body italic (the first being the cycle status). The
// no-italic rule from v2.0 is therefore relaxed for v2.2; BRAND.md update
// pending in the v2.2 docs PR.

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
import { supabase } from '../../lib/supabase'
import { useTheme, palette } from '../../theme'
import { Icon, Text } from '../../components'
import { listDocuments, type DocumentIndexEntry } from '../../lib/documentStore'

// ─── COPY ──────────────────────────────────────────────────────────────────
const COPY = {
  fr: {
    greetingMorning:    'Bonjour',
    greetingAfternoon:  'Bon après-midi',
    greetingEvening:    'Bonsoir',
    waveEmoji:          '👋',
    todayEyebrow:       "Aujourd'hui",
    subhead:            'Pose-moi une question. Sans détour.',
    profileChipLabel:   'Mon profil',
    cta:                'Commencer une conversation →',
    insightEyebrow:     'Ton insight',
    insightSource:      'NHS · HAS',
    insightCtaPrimary:  'Préparer ma consultation →',
    insightCtaGhost:    'En savoir plus',
    documentsTitle:     'Documents',
    documentsSub:       'Ordonnances, analyses',
    documentsAdd:       'Ajouter +',
    summariesTitle:     'Résumés',
    summariesEmpty:     "Tes résumés s'enregistreront ici au fil de tes échanges.",
    cycleTitle:         'Cycle',
    cycleSoon:          'Bientôt disponible',
    knowledgeEyebrow:   'Savoir du jour · Cochrane',
    knowledgeBody:
      "Les fluctuations hormonales tout au long du cycle influencent ton énergie, ton humeur, et ta concentration.",
    knowledgeHint:      'Swipe pour découvrir la suite',
  },
  en: {
    greetingMorning:    'Good morning',
    greetingAfternoon:  'Good afternoon',
    greetingEvening:    'Good evening',
    waveEmoji:          '👋',
    todayEyebrow:       'Today',
    subhead:            'Ask me anything. No detours.',
    profileChipLabel:   'My profile',
    cta:                'Start a conversation →',
    insightEyebrow:     'Your insight',
    insightSource:      'NHS · HAS',
    insightCtaPrimary:  'Prepare my appointment →',
    insightCtaGhost:    'Learn more',
    documentsTitle:     'Documents',
    documentsSub:       'Prescriptions, lab results',
    documentsAdd:       'Add +',
    summariesTitle:     'Summaries',
    summariesEmpty:     'Your summaries will appear here as you chat.',
    cycleTitle:         'Cycle',
    cycleSoon:          'Coming soon',
    knowledgeEyebrow:   'Today\'s knowledge · Cochrane',
    knowledgeBody:
      "Hormonal fluctuations throughout the cycle influence your energy, mood, and concentration.",
    knowledgeHint:      'Swipe to discover more',
  },
} as const

// Per-objective insight body. Educational lines today — claim-style content
// (e.g. "Ton œstrogène baisse en phase lutéale — ce n'est pas de la fatigue"
// from the v2.2 mockup) needs physician-reviewed copy; tracked as content
// design work, not in this PR.
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
    fr: "Choisir une contraception, c'est trouver l'équilibre entre efficacité, effets, et ton mode de vie.",
    en: 'Choosing contraception is about balancing effectiveness, side effects, and your lifestyle.',
  },
  fertility: {
    fr: "La fenêtre fertile dure environ 6 jours par cycle — connaître la tienne te donne du pouvoir d'agir.",
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

// Pull a display name from the email's local-part (everything before the @),
// capitalised. Returns null when the user is anonymous or signed up without
// a parseable email — caller falls back to the wave-emoji greeting variant.
function deriveDisplayName(email: string | null | undefined): string | null {
  if (!email) return null
  const local = email.split('@')[0]
  if (!local) return null
  // Strip digits, dots, dashes, underscores, plus addresses (foo+bar@…).
  const word = local.split(/[._+\-0-9]/)[0]
  if (!word || word.length < 2) return null
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

export function HomeScreen() {
  const navigation = useNavigation<any>()
  const { language, objective } = useOnboarding()
  const { width } = useWindowDimensions()
  const theme = useTheme()
  const copy = COPY[language]

  const isCompact = width < 480
  const bloomSize = isCompact ? 320 : 420
  const greeting  = getGreeting(new Date().getHours(), copy)
  const objKey    = (objective ?? 'general') as HealthObjective | 'general'
  const insight   = INSIGHTS[objKey][language]

  const [documents, setDocuments] = useState<DocumentIndexEntry[]>([])
  const [displayName, setDisplayName] = useState<string | null>(null)

  // Refresh the document index whenever the screen regains focus.
  useFocusEffect(
    useCallback(() => {
      listDocuments()
        .then(setDocuments)
        .catch(() => { /* silent — the empty state is fine */ })
    }, []),
  )

  // Read the auth session once to derive the greeting name. Anonymous /
  // logged-out users have no session — they get the emoji greeting.
  useEffect(() => {
    let cancelled = false
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return
        const email = data.session?.user?.email ?? null
        setDisplayName(deriveDisplayName(email))
      })
      .catch(() => { if (!cancelled) setDisplayName(null) })
    return () => { cancelled = true }
  }, [])

  const goChat       = () => navigation.navigate('Chat')
  const goDocuments  = () => navigation.navigate('Documents')
  const goProfile    = () => navigation.navigate('Profile')

  const profileInitial = displayName ? displayName.charAt(0) : 'A'

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg.canvas }}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.bg.canvas} />

      <Bloom size={bloomSize} intensity={0.6} />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: isCompact ? 24 : 40,
            paddingTop: isCompact ? 20 : 28,
            paddingBottom: 120, // clear the bottom tab bar
            maxWidth: 640,
            width: '100%',
            alignSelf: 'center',
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header — wordmark left, profile chip right */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: isCompact ? 18 : 24,
            }}
          >
            <BrandWordmark size={isCompact ? 22 : 26} />
            <ProfileChip
              initial={profileInitial}
              label={copy.profileChipLabel}
              onPress={goProfile}
            />
          </View>

          {/* Greeting block */}
          <Text
            variant="eyebrow"
            style={{
              color: palette.warmGray[300],
              letterSpacing: 1.6,
              marginBottom: 8,
            }}
          >
            {copy.todayEyebrow.toUpperCase()}
          </Text>
          <Text
            style={{
              fontFamily: 'BricolageGrotesque-ExtraBold',
              fontSize: isCompact ? 30 : 36,
              lineHeight: isCompact ? 34 : 40,
              letterSpacing: -0.6,
              color: theme.colors.text.primary,
            }}
          >
            {displayName ? (
              <>
                {greeting},{'\n'}
                <Text
                  style={{
                    fontFamily: 'BricolageGrotesque-ExtraBold',
                    fontSize: isCompact ? 30 : 36,
                    lineHeight: isCompact ? 34 : 40,
                    letterSpacing: -0.6,
                    color: palette.fuchsia[500],
                  }}
                >
                  {displayName}.
                </Text>
              </>
            ) : (
              `${greeting} ${copy.waveEmoji}`
            )}
          </Text>
          <Text
            variant="body"
            style={{
              color: theme.colors.text.secondary,
              marginTop: 8,
              marginBottom: isCompact ? 20 : 24,
            }}
          >
            {copy.subhead}
          </Text>

          {/* Primary CTA — alignment per Marion's spec (commit ac14740). */}
          <PrimaryCTA label={copy.cta} onPress={goChat} />

          {/* Insight card — Plum dark surface with apricot accents */}
          <View style={{ marginTop: 24 }}>
            <InsightCard
              eyebrow={copy.insightEyebrow}
              source={copy.insightSource}
              body={insight}
              ctaPrimary={copy.insightCtaPrimary}
              ctaGhost={copy.insightCtaGhost}
              onPrimaryPress={goChat}
              onGhostPress={goChat}
            />
          </View>

          {/* Mini cards row — Documents + Résumés */}
          <View
            style={{
              flexDirection: 'row',
              gap: 10,
              marginTop: 12,
            }}
          >
            <MiniCard
              iconName="FileText"
              title={copy.documentsTitle}
              sub={copy.documentsSub}
              badge={copy.documentsAdd}
              onPress={goDocuments}
            />
            <MiniCard
              iconName="Sparkles"
              title={copy.summariesTitle}
              sub={copy.summariesEmpty}
            />
          </View>

          {/* Cycle card */}
          <View style={{ marginTop: 12 }}>
            <CycleCard title={copy.cycleTitle} soon={copy.cycleSoon} />
          </View>

          {/* Knowledge of the day */}
          <View style={{ marginTop: 20 }}>
            <KnowledgeCard
              eyebrow={copy.knowledgeEyebrow}
              body={copy.knowledgeBody}
              hint={copy.knowledgeHint}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

// ─── BLOOM ─────────────────────────────────────────────────────────────────
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

// ─── BRAND WORDMARK ────────────────────────────────────────────────────────
// Mirrors WelcomeScreen's inlined BrandWordmark; consolidates when the shared
// Wordmark.tsx migrates to v2.0 (separate PR).
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

// ─── PROFILE CHIP ──────────────────────────────────────────────────────────
function ProfileChip({
  initial,
  label,
  onPress,
}: {
  initial: string
  label:   string
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ hovered, pressed }: any) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: palette.petal[100],
        borderWidth: 1.5,
        borderColor: palette.sand[300],
        paddingVertical: 3,
        paddingLeft: 4,
        paddingRight: 10,
        borderRadius: 999,
        opacity: pressed ? 0.92 : 1,
        ...(Platform.OS === 'web' && hovered
          ? ({ boxShadow: '0 2px 8px rgba(13, 13, 18, 0.06)' } as any)
          : null),
      })}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 999,
          backgroundColor: palette.fuchsia[500],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            fontFamily: 'BricolageGrotesque-ExtraBold',
            fontSize: 9,
            color: '#ffffff',
            lineHeight: 11,
          }}
        >
          {initial.toUpperCase()}
        </Text>
      </View>
      <Text
        style={{
          fontFamily: 'BricolageGrotesque-Medium',
          fontSize: 10,
          color: palette.void[500],
        }}
      >
        {label}
      </Text>
    </Pressable>
  )
}

// ─── PRIMARY CTA ───────────────────────────────────────────────────────────
// Per Marion's alignment spec (commit ac14740):
//   - Single <Pressable>, no Animated wrapper
//   - alignSelf: 'stretch' so it fills the padded parent
//   - radius 16, paddingV 15, paddingH 20
//   - Bricolage Grotesque Bold (700) at 15px
//   - Text lineHeight 20 + includeFontPadding + textAlignVertical
//   - Press feedback: inline transform: scale(0.98)
//   - Hover/press background = palette.fuchsia[600]
function PrimaryCTA({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed, hovered }: any) => ({
        backgroundColor: (hovered || pressed) ? palette.fuchsia[600] : palette.fuchsia[500],
        borderRadius: 16,
        paddingVertical: 15,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        alignSelf: 'stretch',
        transform: pressed ? [{ scale: 0.98 }] : undefined,
        ...(Platform.OS === 'web' && hovered
          ? ({ boxShadow: '0 8px 24px rgba(255, 4, 114, 0.35)' } as any)
          : null),
      })}
    >
      <Icon name="MessageCircle" size={17} color="#ffffff" strokeWidth={2} />
      <Text
        style={{
          fontFamily: 'BricolageGrotesque-Bold',
          fontSize: 15,
          fontWeight: '700',
          color: '#ffffff',
          lineHeight: 20,
          includeFontPadding: false,
          textAlignVertical: 'center',
        } as any}
      >
        {label}
      </Text>
    </Pressable>
  )
}

// ─── INSIGHT CARD ──────────────────────────────────────────────────────────
// Plum dark surface with apricot accent text. Two inner CTAs: a primary
// fuchsia pill and a ghost pill on dark.
function InsightCard({
  eyebrow,
  source,
  body,
  ctaPrimary,
  ctaGhost,
  onPrimaryPress,
  onGhostPress,
}: {
  eyebrow:        string
  source:         string
  body:           string
  ctaPrimary:     string
  ctaGhost:       string
  onPrimaryPress: () => void
  onGhostPress:   () => void
}) {
  return (
    <View
      style={{
        position: 'relative',
        backgroundColor: palette.plum[500],
        borderRadius: 14,
        padding: 20,
        overflow: 'hidden',
      }}
    >
      {/* Apricot glow top-right — decorative */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: 180,
          height: 180,
          borderRadius: 999,
          top: -50,
          right: -40,
          backgroundColor: 'rgba(253, 186, 116, 0.18)',
          ...(Platform.OS === 'web'
            ? ({ filter: 'blur(20px)' } as any)
            : null),
        }}
      />

      {/* Header: eyebrow · source chip */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 14,
          zIndex: 1,
        }}
      >
        <Text
          variant="eyebrow"
          style={{
            color: palette.apricot[400],
            letterSpacing: 1.6,
          }}
        >
          {eyebrow.toUpperCase()}
        </Text>
        <View
          style={{
            backgroundColor: 'rgba(253, 186, 116, 0.15)',
            borderWidth: 1,
            borderColor: 'rgba(253, 186, 116, 0.28)',
            paddingHorizontal: 10,
            paddingVertical: 3,
            borderRadius: 999,
          }}
        >
          <Text
            style={{
              fontFamily: 'Inter-SemiBold',
              fontSize: 10,
              color: palette.apricot[400],
              letterSpacing: 0.5,
            }}
          >
            {source}
          </Text>
        </View>
      </View>

      {/* Body */}
      <Text
        style={{
          fontFamily: 'BricolageGrotesque-Bold',
          fontSize: 16,
          lineHeight: 24,
          color: palette.plum[50],
          marginBottom: 14,
          zIndex: 1,
        }}
      >
        {body}
      </Text>

      {/* Divider */}
      <View
        style={{
          height: 1,
          backgroundColor: 'rgba(253, 186, 116, 0.15)',
          marginBottom: 14,
          zIndex: 1,
        }}
      />

      {/* Inner CTA pills */}
      <View style={{ flexDirection: 'row', gap: 8, zIndex: 1 }}>
        <Pressable
          accessibilityRole="button"
          onPress={onPrimaryPress}
          style={({ pressed, hovered }: any) => ({
            backgroundColor: (hovered || pressed) ? palette.fuchsia[600] : palette.fuchsia[500],
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: (hovered || pressed) ? palette.fuchsia[600] : palette.fuchsia[500],
            paddingHorizontal: 11,
            paddingVertical: 8,
            transform: pressed ? [{ scale: 0.98 }] : undefined,
          })}
        >
          <Text
            style={{
              fontFamily: 'BricolageGrotesque-Medium',
              fontSize: 11,
              color: '#ffffff',
            }}
          >
            {ctaPrimary}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onGhostPress}
          style={({ pressed, hovered }: any) => ({
            backgroundColor: (hovered || pressed)
              ? 'rgba(255, 255, 255, 0.16)'
              : 'rgba(255, 255, 255, 0.10)',
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: 'rgba(255, 255, 255, 0.28)',
            paddingHorizontal: 11,
            paddingVertical: 8,
            transform: pressed ? [{ scale: 0.98 }] : undefined,
          })}
        >
          <Text
            style={{
              fontFamily: 'BricolageGrotesque-Medium',
              fontSize: 11,
              color: '#ffffff',
            }}
          >
            {ctaGhost}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}

// ─── MINI CARD ─────────────────────────────────────────────────────────────
function MiniCard({
  iconName,
  title,
  sub,
  badge,
  onPress,
}: {
  iconName: 'FileText' | 'Sparkles'
  title:    string
  sub:      string
  badge?:   string
  onPress?: () => void
}) {
  const theme = useTheme()
  const inner = (
    <View
      style={{
        flex: 1,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: palette.sand[300],
        borderRadius: 14,
        padding: 16,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          backgroundColor: palette.petal[100],
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 10,
        }}
      >
        <Icon name={iconName} size={17} color={palette.fuchsia[500]} strokeWidth={1.8} />
      </View>
      <Text
        style={{
          fontFamily: 'BricolageGrotesque-Bold',
          fontSize: 13,
          color: theme.colors.text.primary,
          marginBottom: 3,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontFamily: 'Inter-Regular',
          fontSize: 11,
          lineHeight: 16,
          color: palette.warmGray[300],
        }}
      >
        {sub}
      </Text>
      {badge ? (
        <View
          style={{
            alignSelf: 'flex-start',
            marginTop: 8,
            backgroundColor: palette.petal[100],
            borderWidth: 1,
            borderColor: palette.sand[300],
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 999,
          }}
        >
          <Text
            style={{
              fontFamily: 'Inter-SemiBold',
              fontSize: 10,
              color: theme.colors.text.primary,
            }}
          >
            {badge}
          </Text>
        </View>
      ) : null}
    </View>
  )
  if (!onPress) return inner
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{ flex: 1 }}
    >
      {inner}
    </Pressable>
  )
}

// ─── CYCLE CARD ────────────────────────────────────────────────────────────
function CycleCard({ title, soon }: { title: string; soon: string }) {
  const theme = useTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: palette.sand[300],
        borderRadius: 14,
        padding: 16,
      }}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 999,
          borderWidth: 2.5,
          borderColor: palette.fuchsia[500],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 11,
            height: 11,
            borderRadius: 999,
            backgroundColor: palette.fuchsia[500],
          }}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: 'BricolageGrotesque-Bold',
            fontSize: 13,
            color: theme.colors.text.primary,
          }}
        >
          {title}
        </Text>
      </View>
      <Text
        style={{
          fontFamily: 'Inter-Regular',
          fontSize: 10,
          color: palette.warmGray[300],
          fontStyle: 'italic',
        }}
      >
        {soon}
      </Text>
    </View>
  )
}

// ─── KNOWLEDGE CARD ────────────────────────────────────────────────────────
function KnowledgeCard({
  eyebrow,
  body,
  hint,
}: {
  eyebrow: string
  body:    string
  hint:    string
}) {
  const theme = useTheme()
  return (
    <View
      style={{
        backgroundColor: palette.petal[100],
        borderWidth: 1,
        borderColor: palette.sand[300],
        borderRadius: 20,
        padding: 18,
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
        {eyebrow.toUpperCase()}
      </Text>
      <Text
        style={{
          fontFamily: 'Inter-Regular',
          fontSize: 13,
          lineHeight: 22,
          color: theme.colors.text.primary,
          fontStyle: 'italic',
        }}
      >
        {body}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          marginTop: 12,
        }}
      >
        <View
          style={{
            width: 4,
            height: 4,
            borderRadius: 999,
            backgroundColor: palette.fuchsia[500],
          }}
        />
        <Text
          variant="eyebrow"
          style={{
            color: palette.fuchsia[500],
            opacity: 0.8,
            letterSpacing: 1,
          }}
        >
          {hint.toUpperCase()}
        </Text>
      </View>
    </View>
  )
}
