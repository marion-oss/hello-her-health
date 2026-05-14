// Anoqi — HomeScreen.
//
// Greeting hero, Cotton Rose focus pill, full-bleed Cotton Rose hero CTA
// (not a card), editorial summary/document lists with hairline dividers,
// one Insight card with sage hairline TOP (not a side-stripe — banned).

import React, { useEffect, useMemo, useState } from 'react'
import { Pressable, SafeAreaView, ScrollView, StatusBar, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/native'

import { useOnboarding, type HealthObjective } from '../../context/OnboardingContext'
import { listDocuments } from '../../lib/documentStore'
import { useTheme } from '../../theme'
import {
  Button,
  Icon,
  type IconName,
  SectionTitle,
  Text,
} from '../../components'

const CHAT_INTENT_KEY = 'anoqi_chat_intent'

const COPY = {
  fr: {
    greetingMorning:   'Bonjour',
    greetingAfternoon: 'Bon après-midi',
    greetingEvening:   'Bonsoir',
    subhead:           "Pose-moi une question — j'écoute.",
    focusAreaLabel:    'Ton focus',
    changeFocus:       'Changer',
    heroEyebrow:       'Conversation',
    heroTitle:         "Qu'est-ce qui te préoccupe aujourd'hui ?",
    heroBody:          'Pose ta question. Sans détour.',
    heroCta:           'Parler à Anoqi',
    summariesTitle:    'Tes résumés',
    summariesEmpty:    'Tes résumés apparaîtront ici après quelques échanges.',
    documentsTitle:    'Tes documents',
    documentsUnit:     'document',
    documentsView:     'Voir',
    insightEyebrow:    'Insight du jour',
    insightSourceLbl:  'Source',
  },
  en: {
    greetingMorning:   'Good morning',
    greetingAfternoon: 'Good afternoon',
    greetingEvening:   'Good evening',
    subhead:           "Ask me anything — I'm listening.",
    focusAreaLabel:    'Your focus',
    changeFocus:       'Change',
    heroEyebrow:       'Conversation',
    heroTitle:         "What's on your mind today?",
    heroBody:          'Ask directly. No detours.',
    heroCta:           'Talk to Anoqi',
    summariesTitle:    'Your summaries',
    summariesEmpty:    'Your summaries will appear here after a few exchanges.',
    documentsTitle:    'Your documents',
    documentsUnit:     'document',
    documentsView:     'View',
    insightEyebrow:    "Today's insight",
    insightSourceLbl:  'Source',
  },
} as const

const OBJECTIVE_LABELS: Record<HealthObjective, { fr: string; en: string; icon: IconName }> = {
  symptoms:      { fr: 'Mes symptômes',  en: 'My symptoms',      icon: 'Stethoscope' },
  contraception: { fr: 'Contraception',  en: 'Contraception',    icon: 'Pill' },
  menopause:     { fr: 'Ménopause',      en: 'Menopause',        icon: 'Sunset' },
  fertility:     { fr: 'Fertilité',      en: 'Fertility',        icon: 'Sprout' },
  general:       { fr: 'Santé générale', en: 'General health',   icon: 'MessageCircle' },
}

type Insight = { text: string; source: string }
const INSIGHTS: Record<HealthObjective, { fr: Insight; en: Insight }> = {
  symptoms: {
    en: { text: 'Tracking your symptoms for 2–3 cycles gives your doctor a much clearer picture. Note timing, duration, and intensity.', source: 'NHS' },
    fr: { text: 'Suivre tes symptômes sur 2 à 3 cycles donne à ton médecin une image beaucoup plus claire. Note le moment, la durée et l\'intensité.', source: 'NHS' },
  },
  contraception: {
    en: { text: 'Taking the pill at the same time every day reduces the failure rate to under 1%. A 3-hour window still counts as consistent.', source: 'FSRH' },
    fr: { text: 'Prendre la pilule à la même heure chaque jour réduit le taux d\'échec à moins de 1 %. Une fenêtre de 3 heures reste régulière.', source: 'FSRH' },
  },
  menopause: {
    en: { text: 'Perimenopause can begin up to 10 years before your last period. Changes in cycle length — not hot flashes — are often the first sign.', source: 'BMS' },
    fr: { text: 'La périménopause peut commencer jusqu\'à 10 ans avant tes dernières règles. Les changements de durée du cycle sont souvent le premier signe.', source: 'BMS' },
  },
  fertility: {
    en: { text: 'Your fertile window spans roughly 6 days — the 5 days before ovulation and the day itself. Cycle length alone doesn\'t tell you when.', source: 'NHS' },
    fr: { text: 'Ta fenêtre de fertilité dure environ 6 jours — les 5 jours avant l\'ovulation et le jour J. La durée du cycle seul ne te le dit pas.', source: 'NHS' },
  },
  general: {
    en: { text: 'Hormonal fluctuations across your cycle affect energy, mood, and focus. Understanding your pattern helps you work with it.', source: 'Cochrane' },
    fr: { text: 'Les fluctuations hormonales tout au long du cycle influencent ton énergie, ton humeur, et ta concentration.', source: 'Cochrane' },
  },
}

type Summary = { id: string; topic: string; date: string }
const STUB_SUMMARIES: Summary[] = []

function getGreeting(copy: { greetingMorning: string; greetingAfternoon: string; greetingEvening: string }): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12)  return copy.greetingMorning
  if (hour >= 12 && hour < 18) return copy.greetingAfternoon
  return copy.greetingEvening
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.canvas }}>
      <StatusBar
        barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.bg.canvas}
      />

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
        <Text
          variant="h2Italic"
          style={{ color: theme.colors.text.primary, fontSize: 22, lineHeight: 26 }}
        >
          anoqi
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Settings" hitSlop={10}>
          <Icon name="Settings2" size={20} color={theme.colors.text.tertiary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: theme.spacing[16] }}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting hero */}
        <View
          style={{
            paddingHorizontal: theme.spacing[6],
            paddingTop: theme.spacing[8],
            paddingBottom: theme.spacing[5],
          }}
        >
          <Text variant="h1" tone="primary">
            {greeting}.
          </Text>
          <Text variant="bodyLg" tone="secondary" style={{ marginTop: theme.spacing[3] }}>
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
              backgroundColor: theme.colors.bg.surfaceWarm,
              paddingHorizontal: theme.spacing[4],
              paddingVertical: theme.spacing[2],
              borderRadius: theme.radii.pill,
              gap: theme.spacing[2],
            }}
          >
            <Icon name={objMeta.icon} size={16} color={theme.colors.text.accent} strokeWidth={2} />
            <Text variant="label" tone="accent">
              {objectiveLabel}
            </Text>
            <Icon name="ChevronRight" size={14} color={theme.colors.text.accent} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Hero CTA — full-bleed Cotton Rose strip */}
        <View
          style={{
            backgroundColor: theme.colors.bg.surfaceWarm,
            paddingHorizontal: theme.spacing[6],
            paddingVertical: theme.spacing[10],
            marginVertical: theme.spacing[4],
          }}
        >
          <Text
            variant="eyebrow"
            style={{ color: theme.colors.text.primary, textTransform: 'uppercase' }}
          >
            {copy.heroEyebrow}
          </Text>
          <Text variant="h2" tone="primary" style={{ marginTop: theme.spacing[3] }}>
            {copy.heroTitle}
          </Text>
          <Text variant="bodyLg" tone="secondary" style={{ marginTop: theme.spacing[3] }}>
            {copy.heroBody}
          </Text>
          <View style={{ marginTop: theme.spacing[5], alignSelf: 'flex-start' }}>
            <Button
              label={copy.heroCta}
              size="lg"
              onPress={() => navigation.navigate('Chat')}
              rightAdornment={
                <Icon
                  name="ArrowRight"
                  size={18}
                  color={theme.colors.accent.primaryOnText}
                  strokeWidth={2}
                />
              }
            />
          </View>
        </View>

        {/* Summaries — editorial list */}
        <View style={{ paddingHorizontal: theme.spacing[6], marginTop: theme.spacing[6] }}>
          <SectionTitle label={copy.summariesTitle} />
          {summaries.length === 0 ? (
            <Text variant="body" tone="tertiary" style={{ maxWidth: 420 }}>
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
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: theme.colors.accent.success,
                    marginRight: theme.spacing[3],
                  }}
                />
                <Text variant="bodyMed" tone="primary" style={{ flex: 1 }}>
                  {s.topic}
                </Text>
                <Text variant="caption" tone="tertiary">
                  {s.date}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Documents — same editorial pattern, only shown if non-zero */}
        {documentCount > 0 ? (
          <View style={{ paddingHorizontal: theme.spacing[6], marginTop: theme.spacing[10] }}>
            <SectionTitle
              label={copy.documentsTitle}
              rightSlot={
                <Pressable hitSlop={8} accessibilityRole="button">
                  <Text variant="label" tone="accent">
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
                color={theme.colors.text.secondary}
                strokeWidth={1.6}
              />
              <Text variant="bodyMed" tone="primary" style={{ marginLeft: theme.spacing[3] }}>
                {documentCount} {copy.documentsUnit}
                {documentCount > 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Insight card — top hairline accent (not side-stripe) */}
        <View style={{ paddingHorizontal: theme.spacing[6], marginTop: theme.spacing[10] }}>
          <View
            style={{
              backgroundColor: theme.colors.bg.surfaceMuted,
              borderRadius: theme.radii.lg,
              borderWidth: 1,
              borderColor: theme.colors.border.subtle,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: 1,
                backgroundColor: theme.colors.accent.success,
              }}
            />
            <View style={{ padding: theme.spacing[5] }}>
              <Text
                variant="eyebrow"
                tone="secondary"
                style={{ textTransform: 'uppercase', marginBottom: theme.spacing[3] }}
              >
                {copy.insightEyebrow}
              </Text>
              <Text variant="bodyLg" tone="primary">
                {insight.text}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: theme.spacing[4],
                  gap: theme.spacing[2],
                }}
              >
                <Icon
                  name="BookOpen"
                  size={13}
                  color={theme.colors.text.tertiary}
                  strokeWidth={1.6}
                />
                <Text variant="caption" tone="tertiary">
                  {copy.insightSourceLbl} · {insight.source}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
