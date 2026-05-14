/**
 * anoqi — HowItWorksScreen
 *
 * Step 3 of onboarding — trust & transparency.
 * 5-row can / can't table:
 *   1. Peer-reviewed sources vs generic internet
 *   2. Women's health research vs one-size-fits-all medicine
 *   3. No data traceability — full control [Privacy policy link]
 *   4. Source cited for every answer vs black box
 *   5. Prepare for your doctor vs replace your doctor
 *
 * Brand palette: Fuchsia #FF0472 | Coral #FF6B3D | Navy #000E28
 *                Cream #FFF3EE | Off White #FFF8F5 | Pink #FFB0CC
 */

import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Linking,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useOnboarding } from '../../context/OnboardingContext'

// Update to the actual hosted privacy policy URL
const PRIVACY_POLICY_URL = 'https://anoqi.health/privacy'

type FeatureRow = {
  can: { fr: string; en: string }
  cannot: { fr: string; en: string }
  privacyLink?: boolean
}

const FEATURES: FeatureRow[] = [
  {
    can: {
      fr: 'Sources validées par des pairs',
      en: 'Peer-reviewed, validated sources',
    },
    cannot: {
      fr: 'Recycler des réponses génériques',
      en: 'Recycle generic internet answers',
    },
  },
  {
    can: {
      fr: 'Recherches sur les femmes — toujours, quand elles existent',
      en: 'Women\'s health research — always, when it exists',
    },
    cannot: {
      fr: 'Une médecine taille unique',
      en: 'Default to medicine built for men',
    },
  },
  {
    can: {
      fr: 'Aucune traçabilité. Contrôle total.',
      en: 'No data traceability. Full control.',
    },
    cannot: {
      fr: 'Partager tes données',
      en: 'Share your data with anyone',
    },
    privacyLink: true,
  },
  {
    can: {
      fr: 'Citer la source de chaque réponse',
      en: 'Show the source behind every answer',
    },
    cannot: {
      fr: 'Travailler comme une boîte noire',
      en: 'Work as a black box',
    },
  },
  {
    can: {
      fr: 'T\'aider à préparer ta consultation',
      en: 'Help you prepare for your doctor',
    },
    cannot: {
      fr: 'Remplacer ton médecin',
      en: 'Replace your doctor',
    },
  },
]

const COPY = {
  fr: {
    title: 'Comment anoqi fonctionne',
    subtitle: 'Informée et entendue — voilà ce que tu mérites.',
    canTitle: '✓ Ce que je fais',
    cannotTitle: '✕ Ce que je ne fais pas',
    privacyLabel: 'Politique de confidentialité →',
    cta: 'Compris, on y va',
  },
  en: {
    title: 'How anoqi works',
    subtitle: 'Informed and heard — that\'s what you deserve.',
    canTitle: '✓ What I do',
    cannotTitle: '✕ What I don\'t',
    privacyLabel: 'Privacy policy →',
    cta: 'Got it, let\'s go',
  },
}

export function HowItWorksScreen() {
  const navigation = useNavigation<any>()
  const { language } = useOnboarding()
  const copy = COPY[language]

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Progress: step 3 of 5 */}
        <View style={styles.progressRow}>
          <View style={[styles.dot, styles.dotDone]} />
          <View style={[styles.dot, styles.dotDone]} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Table header */}
          <View style={styles.tableHeader}>
            <View style={styles.tableHeaderCell}>
              <Text style={styles.tableHeaderCan}>{copy.canTitle}</Text>
            </View>
            <View style={styles.tableDivider} />
            <View style={styles.tableHeaderCell}>
              <Text style={styles.tableHeaderCannot}>{copy.cannotTitle}</Text>
            </View>
          </View>

          {/* Rows */}
          {FEATURES.map((row, i) => (
            <View
              key={i}
              style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}
            >
              {/* Can column */}
              <View style={styles.tableCell}>
                <Text style={styles.tableCellCan}>{row.can[language]}</Text>
                {row.privacyLink && (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
                    accessibilityRole="link"
                    hitSlop={{ top: 8, bottom: 8, left: 0, right: 8 }}
                  >
                    <Text style={styles.privacyLink}>{copy.privacyLabel}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.tableDivider} />
              {/* Cannot column */}
              <View style={styles.tableCell}>
                <Text style={styles.tableCellCannot}>{row.cannot[language]}</Text>
              </View>
            </View>
          ))}

          {/* Sources note */}
          <View style={styles.sourcesNote}>
            <Text style={styles.sourcesNoteText}>
              {language === 'fr'
                ? 'Toutes mes réponses s\'appuient sur des sources médicales validées (NHS, HAS, NICE, Cochrane, FSRH, BMS…).'
                : 'All my answers draw on validated medical sources (NHS, HAS, NICE, Cochrane, FSRH, BMS…).'}
            </Text>
          </View>
        </ScrollView>

        {/* CTA */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => navigation.navigate('Consent')}
            accessibilityRole="button"
            accessibilityLabel={copy.cta}
          >
            <Text style={styles.ctaText}>{copy.cta}</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFF8F5',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
  },

  // Progress
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E8DDD9',
  },
  dotDone: {
    backgroundColor: '#FF6B3D',
  },
  dotActive: {
    backgroundColor: '#FF0472',
    width: 24,
  },

  // Header
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: 'BricolageGrotesque-ExtraBold',
    color: '#000E28',
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'DMSans-Regular',
    color: '#777777',
    lineHeight: 22,
  },

  // Table
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 16 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#FFE8E0',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 4,
  },
  tableHeaderCell: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  tableHeaderCan: {
    fontSize: 13,
    fontFamily: 'DMSans-Medium',
    fontWeight: '700',
    color: '#FF6B3D',
    textAlign: 'center',
  },
  tableHeaderCannot: {
    fontSize: 13,
    fontFamily: 'DMSans-Medium',
    fontWeight: '700',
    color: '#CC3A3A',
    textAlign: 'center',
  },
  tableDivider: {
    width: 1,
    backgroundColor: '#FFB0CC',
  },
  tableRow: {
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 2,
    backgroundColor: '#FFFFFF',
  },
  tableRowAlt: {
    backgroundColor: '#FFF8F5',
  },
  tableCell: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 4,
  },
  tableCellCan: {
    fontSize: 13,
    fontFamily: 'DMSans-Regular',
    color: '#1A4A0A',
    lineHeight: 18,
  },
  tableCellCannot: {
    fontSize: 13,
    fontFamily: 'DMSans-Regular',
    color: '#7A3A3A',
    lineHeight: 18,
  },
  privacyLink: {
    fontSize: 11,
    fontFamily: 'DMSans-Medium',
    color: '#FF0472',
    marginTop: 2,
  },
  sourcesNote: {
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFF3EE',
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B3D',
  },
  sourcesNoteText: {
    fontSize: 12,
    fontFamily: 'DMSans-Regular',
    color: '#666666',
    lineHeight: 18,
  },

  // Actions
  actions: { paddingTop: 16 },
  ctaButton: {
    backgroundColor: '#FF0472',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'BricolageGrotesque-ExtraBold',
    letterSpacing: -0.3,
  },
})
