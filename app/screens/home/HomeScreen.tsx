// Anoqi — HomeScreen (iridescent register).
//
// Void canvas. A glass insight card with LiquidEmber breathing underneath
// carries the day's main message ("Votre œstrogène baisse. C'est votre phase
// lutéale."). Beneath it sits a glass cycle tracker, then editorial lists for
// summaries and documents (kept lightweight — the insight is the moment).
//
// Greeting is set in italic Cormorant Garamond with the user's name in
// Ember; everything else is Inter for precision.

import React, { useEffect, useMemo, useState } from 'react'
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  View,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/native'

import { useOnboarding, type HealthObjective } from '../../context/OnboardingContext'
import { listDocuments } from '../../lib/documentStore'
import { palette, useTheme } from '../../theme'
import {
  Icon,
  type IconName,
  LiquidEmber,
  SectionTitle,
  Text,
  Wordmark,
} from '../../components'

const CHAT_INTENT_KEY = 'anoqi_chat_intent'

const COPY = {
  fr: {
    greetingMorning:   'Bonjour',
    greetingAfternoon: 'Bon après-midi',
    greetingEvening:   'Bonsoir',
    todayLabel:        "Aujourd'hui",
    cycleEyebrow:      'Jour 18 · Lutéale',
    focusAreaLabel:    'Ton focus',
    changeFocus:       'Changer',
    insightEyebrow:    'Votre insight',
    cycleTitle:        'Cycle · 28 jours',
    phase:             'Phase lutéale tardive',
    prepareConsult:    'Préparer une consultation',
    learnMore:         'En savoir plus',
    subhead:           "Pose-moi une question. Sans détour.",
    talkCta:           "Parler à Anoqi",
    summariesTitle:    'Tes résumés',
    summariesEmpty:    "Tes résumés apparaîtront ici après quelques échanges.",
    documentsTitle:    'Tes documents',
    documentsUnit:     'document',
    documentsView:     'Voir',
    insightSourceLbl:  'Source',
    knowledgeEyebrow:  'Savoir du jour',
    knowledgeBody:     'Les fluctuations hormonales tout au long du cycle influencent ton énergie, ton humeur, et ta concentration. Comprendre ton schéma t\'aide à en tirer le meilleur.',
    knowledgeSource:   'Cochrane',
  },
  en: {
    greetingMorning:   'Good morning',
    greetingAfternoon: 'Good afternoon',
    greetingEvening:   'Good evening',
    todayLabel:        'Today',
    cycleEyebrow:      'Day 18 · Luteal',
    focusAreaLabel:    'Your focus',
    changeFocus:       'Change',
    insightEyebrow:    'Your insight',
    cycleTitle:        'Cycle · 28 days',
    phase:             'Late luteal phase',
    prepareConsult:    'Prepare a consultation',
    learnMore:         'Learn more',
    subhead:           "Ask me anything. No detours.",
    talkCta:           "Talk to Anoqi",
    summariesTitle:    'Your summaries',
    summariesEmpty:    "Your summaries will appear here after a few exchanges.",
    documentsTitle:    'Your documents',
    documentsUnit:     'document',
    documentsView:     'View',
    insightSourceLbl:  'Source',
    knowledgeEyebrow:  'Knowledge of the day',
    knowledgeBody:     'Hormonal fluctuations throughout your cycle influence your energy, mood, and concentration. Understanding your pattern helps you make the most of it.',
    knowledgeSource:   'Cochrane',
  },
} as const

const OBJECTIVE_LABELS: Record<HealthObjective, { fr: string; en: string; icon: IconName }> = {
  symptoms:      { fr: 'Mes symptômes',  en: 'My symptoms',      icon: 'Stethoscope' },
  contraception: { fr: 'Contraception',  en: 'Contraception',    icon: 'Pill' },
  menopause:     { fr: 'Ménopause',      en: 'Menopause',        icon: 'Sunset' },
  fertility:     { fr: 'Fertilité',      en: 'Fertility',        icon: 'Sprout' },
  general:       { fr: 'Santé générale', en: 'General health',   icon: 'MessageCircle' },
}

type Insight = { text: string; emphasis?: string; source: string }
const INSIGHTS: Record<HealthObjective, { fr: Insight; en: Insight }> = {
  symptoms: {
    en: { text: 'Tracking your symptoms across 2–3 cycles gives your doctor a much clearer picture.', emphasis: 'much clearer picture', source: 'NHS' },
    fr: { text: 'Suivre tes symptômes sur 2 à 3 cycles donne à ton médecin une image beaucoup plus claire.', emphasis: 'beaucoup plus claire', source: 'NHS' },
  },
  contraception: {
    en: { text: 'Taking the pill at the same time daily drops the failure rate under 1%.', emphasis: 'under 1%', source: 'FSRH' },
    fr: { text: 'Prendre la pilule à la même heure réduit le taux d\'échec à moins de 1 %.', emphasis: 'moins de 1 %', source: 'FSRH' },
  },
  menopause: {
    en: { text: 'Perimenopause can begin up to 10 years before your last period — changes in cycle length are often the first sign.', emphasis: 'first sign', source: 'BMS' },
    fr: { text: 'La périménopause peut commencer 10 ans avant tes dernières règles — les changements de cycle sont souvent le premier signe.', emphasis: 'premier signe', source: 'BMS' },
  },
  fertility: {
    en: { text: 'Your fertile window spans roughly six days — the five before ovulation and the day itself.', emphasis: 'six days', source: 'NHS' },
    fr: { text: 'Ta fenêtre de fertilité dure environ six jours — les cinq avant l\'ovulation et le jour J.', emphasis: 'six jours', source: 'NHS' },
  },
  general: {
    en: { text: 'Your œstrogen drops in the late luteal phase — energy shifts this week are expected, not fatigue.', emphasis: 'not fatigue', source: 'NHS · HAS' },
    fr: { text: "Ton œstrogène baisse — c'est ta phase lutéale, pas de la fatigue.", emphasis: 'pas de la fatigue', source: 'NHS · HAS' },
  },
}

type Summary = { id: string; topic: string; date: string }
const STUB_SUMMARIES: Summary[] = []

function getGreeting(copy: {
  greetingMorning: string
  greetingAfternoon: string
  greetingEvening: string
}): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12)  return copy.greetingMorning
  if (hour >= 12 && hour < 18) return copy.greetingAfternoon
  return copy.greetingEvening
}

// Render an Inter italic-style accent inside a Cormorant body, by splitting
// on the configured emphasis substring.
function renderWithEmphasis(text: string, emphasis: string | undefined) {
  if (!emphasis || !text.includes(emphasis)) {
    return <Text variant="h3Italic" style={{ color: palette.warmWhite[100] }}>{text}</Text>
  }
  const [before, after] = text.split(emphasis)
  return (
    <Text variant="h3Italic" style={{ color: palette.warmWhite[100] }}>
      {before}
      <Text variant="h3" style={{ color: palette.ember[400] }}>{emphasis}</Text>
      {after}
    </Text>
  )
}

export function HomeScreen() {
  const navigation = useNavigation<any>()
  const { language, objective } = useOnboarding()
  const theme = useTheme()
  const copy = COPY[language]

  const greeting = useMemo(() => getGreeting(copy), [copy])
  const objKey = objective ?? 'general'
  const objMeta = OBJECTIVE_LABELS[objKey]
  const objectiveLabel = objMeta[language]
  const insight = INSIGHTS[objKey][language]
  const summaries = STUB_SUMMARIES
  const [documentCount, setDocumentCount] = useState(0)

  useEffect(() => {
    AsyncStorage.getItem(CHAT_INTENT_KEY).then((v) => {
      if (v === 'true') {
        AsyncStorage.removeItem(CHAT_INTENT_KEY)
        navigation.navigate('Chat')
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    listDocuments()
      .then((docs) => setDocumentCount(docs.length))
      .catch((err) => console.warn('Failed to load documents:', err))
  }, [])

  // Simple cycle dot row — fake data, just for the visual; would wire to a
  // real cycle store later.
  const cycleDays = [14, 15, 16, 17, 18, 19, 20, 21, 22]
  const currentDay = 18

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.canvas }}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.bg.canvas} />

      {/* Faint Ember corner glow opposite the breathing form — gives the top
          of the screen warmth without a card chrome */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          right: -120,
          top: -80,
          width: 360,
          height: 360,
          opacity: 0.7,
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(196, 128, 106, 0.32)',
            borderRadius: 9999,
            ...(Platform.OS === 'web' ? ({ filter: 'blur(80px)' } as any) : null),
          }}
        />
      </View>

      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: theme.spacing[6],
          paddingTop: theme.spacing[3],
          paddingBottom: theme.spacing[2],
        }}
      >
        <Wordmark size={20} />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: 'rgba(255, 245, 238, 0.10)',
          }}
        >
          <View
            style={{
              width: 5,
              height: 5,
              borderRadius: 999,
              backgroundColor: palette.ember[400],
            }}
          />
          <Text variant="eyebrow" style={{ color: 'rgba(255, 245, 238, 0.7)' }}>
            {copy.cycleEyebrow}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: theme.spacing[24] }}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View
          style={{
            paddingHorizontal: theme.spacing[6],
            paddingTop: theme.spacing[8],
            paddingBottom: theme.spacing[6],
          }}
        >
          <Text variant="eyebrow" style={{ color: 'rgba(255, 245, 238, 0.5)', marginBottom: 8 }}>
            {copy.todayLabel.toUpperCase()}
          </Text>
          <Text variant="h1Italic" style={{ color: palette.warmWhite[100] }}>
            {greeting},
          </Text>
          <Text variant="h1Italic" style={{ color: palette.ember[400], marginTop: -4 }}>
            Marie.
          </Text>
          <Text
            variant="bodyLight"
            style={{
              color: 'rgba(255, 245, 238, 0.65)',
              marginTop: theme.spacing[3],
              maxWidth: 420,
            }}
          >
            {copy.subhead}
          </Text>

          {/* Focus pill */}
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Objective', { mode: 'change' })}
            style={{
              marginTop: theme.spacing[5],
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(196, 128, 106, 0.12)',
              borderWidth: 1,
              borderColor: 'rgba(196, 128, 106, 0.28)',
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: theme.radii.pill,
              gap: 8,
            }}
          >
            <Icon name={objMeta.icon} size={14} color={palette.ember[300]} strokeWidth={1.8} />
            <Text variant="label" style={{ color: palette.ember[200] }}>
              {objectiveLabel}
            </Text>
            <Icon name="ChevronRight" size={12} color={palette.ember[300]} strokeWidth={1.8} />
          </Pressable>
        </View>

        {/* Insight glass card — main daily moment */}
        <View style={{ paddingHorizontal: theme.spacing[6], marginBottom: theme.spacing[5] }}>
          <View
            style={{
              borderRadius: 24,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <LiquidEmber intensity={1.2} blur={52} borderRadius={24} />

            <View
              style={[
                {
                  backgroundColor: 'rgba(255, 245, 238, 0.05)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 245, 238, 0.09)',
                  borderRadius: 24,
                  padding: theme.spacing[6],
                },
                Platform.OS === 'web'
                  ? ({
                      backdropFilter: 'blur(22px) saturate(140%)',
                      WebkitBackdropFilter: 'blur(22px) saturate(140%)',
                    } as any)
                  : null,
              ]}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: theme.spacing[3],
                }}
              >
                <Text variant="eyebrow" style={{ color: palette.fuchsia[400] }}>
                  {copy.insightEyebrow.toUpperCase()}
                </Text>
                <Text variant="eyebrow" style={{ color: 'rgba(255, 245, 238, 0.4)' }}>
                  {insight.source}
                </Text>
              </View>

              {renderWithEmphasis(insight.text, insight.emphasis)}

              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 8,
                  marginTop: theme.spacing[5],
                }}
              >
                <Pressable
                  onPress={() => navigation.navigate('Chat')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                    borderRadius: 999,
                    backgroundColor: 'rgba(255, 4, 114, 0.22)',
                    borderWidth: 1,
                    borderColor: 'rgba(255, 4, 114, 0.42)',
                  }}
                >
                  <Text variant="label" style={{ color: palette.warmWhite[100] }}>
                    {copy.prepareConsult}
                  </Text>
                  <Icon name="ArrowRight" size={13} color={palette.warmWhite[100]} strokeWidth={2} />
                </Pressable>

                <Pressable
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                    borderRadius: 999,
                    backgroundColor: 'rgba(255, 245, 238, 0.06)',
                    borderWidth: 1,
                    borderColor: 'rgba(255, 245, 238, 0.10)',
                  }}
                >
                  <Text variant="label" style={{ color: palette.warmWhite[100] }}>
                    {copy.learnMore}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* Cycle tracker glass card */}
        <View style={{ paddingHorizontal: theme.spacing[6], marginBottom: theme.spacing[6] }}>
          <View
            style={{
              borderRadius: 22,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <LiquidEmber intensity={0.7} fuchsia={false} blur={48} borderRadius={22} />

            <View
              style={[
                {
                  backgroundColor: 'rgba(255, 245, 238, 0.04)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 245, 238, 0.08)',
                  borderRadius: 22,
                  paddingHorizontal: theme.spacing[6],
                  paddingVertical: theme.spacing[5],
                },
                Platform.OS === 'web'
                  ? ({
                      backdropFilter: 'blur(18px) saturate(140%)',
                      WebkitBackdropFilter: 'blur(18px) saturate(140%)',
                    } as any)
                  : null,
              ]}
            >
              <Text variant="eyebrow" style={{ color: 'rgba(255, 245, 238, 0.5)', marginBottom: 12 }}>
                {copy.cycleTitle.toUpperCase()}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {cycleDays.map((d) => {
                  const isPast = d < currentDay
                  const isNow = d === currentDay
                  return (
                    <View
                      key={d}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 999,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isNow
                          ? palette.fuchsia[500]
                          : isPast
                            ? 'rgba(196, 128, 106, 0.20)'
                            : 'rgba(255, 245, 238, 0.06)',
                      }}
                    >
                      <Text
                        variant="caption"
                        style={{
                          color: isNow
                            ? palette.warmWhite[100]
                            : isPast
                              ? palette.ember[200]
                              : 'rgba(255, 245, 238, 0.4)',
                        }}
                      >
                        {d}
                      </Text>
                    </View>
                  )
                })}
              </View>
              <Text
                variant="h4Italic"
                style={{
                  color: palette.ember[400],
                  marginTop: 14,
                  textAlign: 'center',
                }}
              >
                {copy.phase}
              </Text>
            </View>
          </View>
        </View>

        {/* Summaries — editorial list */}
        <View style={{ paddingHorizontal: theme.spacing[6], marginTop: theme.spacing[6] }}>
          <SectionTitle label={copy.summariesTitle} />
          {summaries.length === 0 ? (
            <Text
              variant="bodyLight"
              style={{ color: 'rgba(255, 245, 238, 0.5)', maxWidth: 420 }}
            >
              {copy.summariesEmpty}
            </Text>
          ) : (
            summaries.map((s, i) => (
              <View
                key={s.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: theme.spacing[3],
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: theme.colors.border.subtle,
                }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 4,
                    backgroundColor: palette.ember[400],
                    marginRight: theme.spacing[3],
                  }}
                />
                <Text variant="bodyMed" style={{ color: palette.warmWhite[100], flex: 1 }}>
                  {s.topic}
                </Text>
                <Text variant="caption" style={{ color: 'rgba(255, 245, 238, 0.5)' }}>
                  {s.date}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Documents */}
        {documentCount > 0 ? (
          <View style={{ paddingHorizontal: theme.spacing[6], marginTop: theme.spacing[10] }}>
            <SectionTitle
              label={copy.documentsTitle}
              rightSlot={
                <Pressable hitSlop={8} accessibilityRole="button">
                  <Text variant="label" style={{ color: palette.fuchsia[400] }}>
                    {copy.documentsView} →
                  </Text>
                </Pressable>
              }
            />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: theme.spacing[3],
              }}
            >
              <Icon
                name="FileText"
                size={18}
                color={palette.ember[300]}
                strokeWidth={1.6}
              />
              <Text variant="bodyMed" style={{ color: palette.warmWhite[100], marginLeft: theme.spacing[3] }}>
                {documentCount} {copy.documentsUnit}
                {documentCount > 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Knowledge of the day — quieter glass card at the foot of the
            scroll. Lower LiquidEmber intensity so it doesn't compete with
            the main insight up top. */}
        <View style={{ paddingHorizontal: theme.spacing[6], marginTop: theme.spacing[10] }}>
          <View
            style={{
              borderRadius: 22,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <LiquidEmber intensity={0.55} fuchsia={false} blur={44} borderRadius={22} />

            <View
              style={[
                {
                  backgroundColor: 'rgba(255, 245, 238, 0.04)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 245, 238, 0.08)',
                  borderRadius: 22,
                  padding: theme.spacing[6],
                },
                Platform.OS === 'web'
                  ? ({
                      backdropFilter: 'blur(18px) saturate(140%)',
                      WebkitBackdropFilter: 'blur(18px) saturate(140%)',
                    } as any)
                  : null,
              ]}
            >
              <Text variant="eyebrow" style={{ color: palette.ember[400], marginBottom: 12 }}>
                {copy.knowledgeEyebrow.toUpperCase()}
              </Text>
              <Text
                variant="h3Italic"
                style={{
                  color: palette.warmWhite[100],
                  lineHeight: 32,
                }}
              >
                {copy.knowledgeBody}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: theme.spacing[4],
                  gap: 8,
                }}
              >
                <View
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 999,
                    backgroundColor: palette.ember[400],
                  }}
                />
                <Text variant="eyebrow" style={{ color: palette.ember[400] }}>
                  {copy.insightSourceLbl} · {copy.knowledgeSource}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
