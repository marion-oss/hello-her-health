/**
 * anoqi — HomeScreen
 *
 * Main dashboard — shown after onboarding is complete or after login.
 *
 * Sections:
 *   • Header: wordmark + settings icon
 *   • Greeting: time-aware "Good morning / afternoon / evening"
 *   • Focus area: "Your focus area" label + tappable objective pill (C › )
 *   • Hero CTA: large fuchsia card → Chat
 *   • Your summaries: horizontal scroll of cards (or soft empty state)
 *   • Your documents: compact row (hidden if nothing uploaded)
 *   • Health insight: sourced tip relevant to objective, coral left border
 *
 * Brand palette:
 *   Neon Fuchsia  #FF0472  · Hot Coral  #FF6B3D
 *   Midnight Navy #000E28  · Warm Cream #FFF3EE
 *   Off White     #FFF8F5  · Candy Pink #FFB0CC
 *
 * Fonts: BricolageGrotesque-ExtraBold (headlines), DMSans-Regular / DMSans-Medium (body)
 */

import React, { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/native'
import { useOnboarding, type HealthObjective, type Language } from '../../context/OnboardingContext'
import { listDocuments } from '../../lib/documentStore'

// Deep-link flag set by the "Let's start chatting →" CTA on the Objective
// screen. We read + clear it on Home mount so the user lands in Chat
// without having to tap the hero card.
const CHAT_INTENT_KEY = 'anoqi_chat_intent'

// ─────────────────────────────────────────────────────────────────────────────
// Copy — all user-facing strings
// ─────────────────────────────────────────────────────────────────────────────

const COPY = {
  fr: {
    greetingMorning:   'Bonjour',
    greetingAfternoon: 'Bonjour',
    greetingEvening:   'Bonsoir',
    focusAreaLabel:    'Ton objectif santé',
    heroTitle:         'Qu\'est-ce qui te préoccupe aujourd\'hui ?',
    summariesTitle:    'Tes résumés',
    summariesEmpty:    'Après quelques échanges, anoqi rédigera un résumé que tu pourras partager avec ton médecin.',
    documentsTitle:    'Tes documents',
    documentsUnit:     'document',
    documentsView:     'Voir →',
    insightTitle:      'Le savoir du jour',
    settings:          'Paramètres',
  },
  en: {
    greetingMorning:   'Good morning',
    greetingAfternoon: 'Good afternoon',
    greetingEvening:   'Good evening',
    focusAreaLabel:    'Your focus area',
    heroTitle:         'What\'s on your mind today?',
    summariesTitle:    'Your summaries',
    summariesEmpty:    'After a few questions, anoqi will write a summary you can share with your doctor.',
    documentsTitle:    'Your documents',
    documentsUnit:     'document',
    documentsView:     'View →',
    insightTitle:      'Today\'s insight',
    settings:          'Settings',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Objective display names — bilingual
// ─────────────────────────────────────────────────────────────────────────────

const OBJECTIVE_LABELS: Record<HealthObjective, { fr: string; en: string }> = {
  symptoms:      { fr: 'Mes symptômes',       en: 'My symptoms'       },
  contraception: { fr: 'Contraception',       en: 'Contraception'     },
  menopause:     { fr: 'Ménopause',           en: 'Menopause'         },
  fertility:     { fr: 'Fertilité',           en: 'Fertility'         },
  general:       { fr: 'Santé générale',      en: 'General health'    },
}

// ─────────────────────────────────────────────────────────────────────────────
// Health insights — one per objective, sourced, bilingual
// ─────────────────────────────────────────────────────────────────────────────

type Insight = { text: string; source: string }

const INSIGHTS: Record<HealthObjective, { fr: Insight; en: Insight }> = {
  symptoms: {
    en: {
      text: 'Tracking your symptoms for 2–3 cycles gives your doctor a much clearer picture. Note timing, duration, and intensity.',
      source: 'NHS',
    },
    fr: {
      text: 'Suivre tes symptômes sur 2 à 3 cycles donne à ton médecin une image beaucoup plus claire. Note le moment, la durée et l\'intensité.',
      source: 'NHS',
    },
  },
  contraception: {
    en: {
      text: 'Taking the pill at the same time every day reduces the failure rate to under 1%. A 3-hour window still counts as consistent.',
      source: 'FSRH',
    },
    fr: {
      text: 'Prendre la pilule à la même heure chaque jour réduit le taux d\'échec à moins de 1 %. Une fenêtre de 3 heures reste considérée comme régulière.',
      source: 'FSRH',
    },
  },
  menopause: {
    en: {
      text: 'Perimenopause can begin up to 10 years before your last period. Changes in cycle length — not hot flashes — are often the first sign.',
      source: 'BMS',
    },
    fr: {
      text: 'La périménopause peut commencer jusqu\'à 10 ans avant tes dernières règles. Les changements de durée du cycle — pas les bouffées de chaleur — sont souvent le premier signe.',
      source: 'BMS',
    },
  },
  fertility: {
    en: {
      text: 'Your fertile window spans roughly 6 days — the 5 days before ovulation and the day itself. Cycle length alone doesn\'t tell you when this is.',
      source: 'NHS',
    },
    fr: {
      text: 'Ta fenêtre de fertilité dure environ 6 jours — les 5 jours avant l\'ovulation et le jour J. La durée du cycle seul ne te dit pas quand c\'est.',
      source: 'NHS',
    },
  },
  general: {
    en: {
      text: 'Hormonal fluctuations across your cycle affect energy, mood, and focus. Understanding your pattern helps you work with it — not against it.',
      source: 'Cochrane',
    },
    fr: {
      text: 'Les fluctuations hormonales tout au long de ton cycle influencent ton énergie, ton humeur et ta concentration. Connaître ton schéma t\'aide à en tirer parti.',
      source: 'Cochrane',
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Stub data — replace with real Supabase queries
// ─────────────────────────────────────────────────────────────────────────────

type Summary = {
  id: string
  topic: string
  date: string   // display string e.g. "10 May"
}

// WIRE DATA — fetch from Supabase summaries table
const STUB_SUMMARIES: Summary[] = []

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getGreeting(copy: typeof COPY['en']): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12)  return copy.greetingMorning
  if (hour >= 12 && hour < 18) return copy.greetingAfternoon
  return copy.greetingEvening
}

// ─────────────────────────────────────────────────────────────────────────────
// HomeScreen
// ─────────────────────────────────────────────────────────────────────────────

export function HomeScreen() {
  const navigation = useNavigation<any>()
  const { language, objective } = useOnboarding()
  const copy = COPY[language]

  const greeting = useMemo(() => getGreeting(copy), [copy])
  const objectiveLabel = objective
    ? OBJECTIVE_LABELS[objective][language]
    : (language === 'fr' ? 'Santé générale' : 'General health')
  const insight = INSIGHTS[objective ?? 'general'][language]

  const summaries: Summary[] = STUB_SUMMARIES
  const [documentCount, setDocumentCount] = useState(0)

  // If the user reached Home from the Objective "Let's start chatting" CTA,
  // deep-link them straight to Chat and clear the flag.
  useEffect(() => {
    AsyncStorage.getItem(CHAT_INTENT_KEY).then(v => {
      if (v === 'true') {
        AsyncStorage.removeItem(CHAT_INTENT_KEY)
        navigation.navigate('Chat')
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    listDocuments()
      .then(docs => setDocumentCount(docs.length))
      .catch(err => console.warn('Failed to load documents:', err))
  }, [])

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF8F5" />

      {/* ── Header ──────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.wordmark}>anoqi</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => { /* navigation.navigate('Settings') */ }}
          accessibilityRole="button"
          accessibilityLabel={copy.settings}
        >
          <Text style={styles.settingsIcon}>⚙</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Greeting ────────────────────────────────────── */}
        <Text style={styles.greeting}>{greeting}</Text>

        {/* ── Focus area ──────────────────────────────────── */}
        <View style={styles.focusArea}>
          <Text style={styles.focusLabel}>{copy.focusAreaLabel}</Text>
          <TouchableOpacity
            style={styles.focusPill}
            onPress={() => navigation.navigate('Objective', { mode: 'change' })}
            accessibilityRole="button"
            accessibilityLabel={objectiveLabel}
          >
            <Text style={styles.focusPillText}>{objectiveLabel}</Text>
            <Text style={styles.focusPillChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── Hero CTA ────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.heroCard}
          onPress={() => navigation.navigate('Chat')}
          accessibilityRole="button"
          accessibilityLabel={copy.heroTitle}
        >
          <Text style={styles.heroTitle}>{copy.heroTitle}</Text>
          <View style={styles.heroArrow}>
            <Text style={styles.heroArrowText}>→</Text>
          </View>
        </TouchableOpacity>

        {/* ── Summaries ───────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{copy.summariesTitle}</Text>

          {summaries.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>{copy.summariesEmpty}</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.summaryScroll}
            >
              {summaries.map(s => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.summaryCard}
                  onPress={() => { /* navigation.navigate('Summary', { id: s.id }) */ }}
                  accessibilityRole="button"
                >
                  <Text style={styles.summaryTopic}>{s.topic}</Text>
                  <Text style={styles.summaryDate}>{s.date}</Text>
                  <View style={styles.summaryTag}>
                    <Text style={styles.summaryTagText}>
                      {language === 'fr' ? 'Prêt pour ton médecin' : 'Ready for your doctor'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── Documents ───────────────────────────────────── */}
        {documentCount > 0 && (
          <View style={styles.section}>
            <View style={styles.documentsRow}>
              <Text style={styles.sectionTitle}>{copy.documentsTitle}</Text>
              <TouchableOpacity
                onPress={() => { /* navigation.navigate('Documents') */ }}
                accessibilityRole="button"
              >
                <Text style={styles.documentsViewLink}>{copy.documentsView}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.documentsCard}>
              <Text style={styles.documentsCount}>
                {documentCount} {copy.documentsUnit}{documentCount > 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        )}

        {/* ── Health insight ──────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{copy.insightTitle}</Text>
          <View style={styles.insightCard}>
            <View style={styles.insightBorder} />
            <View style={styles.insightContent}>
              <Text style={styles.insightText}>{insight.text}</Text>
              <Text style={styles.insightSource}>{insight.source}</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFF8F5',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE8E0',
  },
  wordmark: {
    fontSize: 18,
    fontFamily: 'BricolageGrotesque-ExtraBold',
    color: '#FF0472',
    letterSpacing: -0.5,
  },
  settingsButton: {
    padding: 4,
  },
  settingsIcon: {
    fontSize: 20,
    color: '#BBBBBB',
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 48,
    gap: 28,
  },

  // Greeting
  greeting: {
    fontSize: 34,
    fontFamily: 'BricolageGrotesque-ExtraBold',
    color: '#000E28',
    letterSpacing: -1,
  },

  // Focus area
  focusArea: {
    gap: 6,
    marginTop: -8,
  },
  focusLabel: {
    fontSize: 12,
    fontFamily: 'DMSans-Regular',
    color: '#AAAAAA',
    letterSpacing: 0.3,
  },
  focusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFF3EE',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: '#FFB0CC',
  },
  focusPillText: {
    fontSize: 13,
    fontFamily: 'DMSans-Medium',
    color: '#FF6B3D',
    fontWeight: '600',
  },
  focusPillChevron: {
    fontSize: 15,
    color: '#FF6B3D',
    lineHeight: 19,
  },

  // Hero CTA
  heroCard: {
    backgroundColor: '#FF0472',
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#FF0472',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  heroTitle: {
    fontSize: 20,
    fontFamily: 'BricolageGrotesque-ExtraBold',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    flex: 1,
    lineHeight: 27,
  },
  heroArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    flexShrink: 0,
  },
  heroArrowText: {
    fontSize: 20,
    color: '#FFFFFF',
    lineHeight: 24,
  },

  // Sections
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'DMSans-Medium',
    color: '#AAAAAA',
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  // Summaries — empty state
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EDE5E0',
  },
  emptyCardText: {
    fontSize: 14,
    fontFamily: 'DMSans-Regular',
    color: '#AAAAAA',
    lineHeight: 21,
  },

  // Summaries — horizontal scroll
  summaryScroll: {
    gap: 12,
    paddingRight: 24,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    width: 200,
    borderWidth: 1,
    borderColor: '#EDE5E0',
    gap: 6,
  },
  summaryTopic: {
    fontSize: 15,
    fontFamily: 'DMSans-Medium',
    color: '#000E28',
    fontWeight: '600',
    lineHeight: 21,
  },
  summaryDate: {
    fontSize: 12,
    fontFamily: 'DMSans-Regular',
    color: '#AAAAAA',
  },
  summaryTag: {
    backgroundColor: '#FFF3EE',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  summaryTagText: {
    fontSize: 11,
    fontFamily: 'DMSans-Medium',
    color: '#FF6B3D',
    fontWeight: '600',
  },

  // Documents
  documentsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  documentsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EDE5E0',
  },
  documentsCount: {
    fontSize: 15,
    fontFamily: 'DMSans-Medium',
    color: '#000E28',
    fontWeight: '600',
  },
  documentsViewLink: {
    fontSize: 13,
    fontFamily: 'DMSans-Medium',
    color: '#FF6B3D',
    fontWeight: '600',
  },

  // Insight
  insightCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EDE5E0',
  },
  insightBorder: {
    width: 4,
    backgroundColor: '#FF6B3D',
  },
  insightContent: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  insightText: {
    fontSize: 14,
    fontFamily: 'DMSans-Regular',
    color: '#000E28',
    lineHeight: 22,
  },
  insightSource: {
    fontSize: 12,
    fontFamily: 'DMSans-Medium',
    color: '#FF6B3D',
    fontWeight: '600',
  },
})
