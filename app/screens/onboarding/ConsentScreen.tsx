/**
 * anoqi — ConsentScreen
 *
 * Step 3 of onboarding — GDPR / informed consent.
 *
 * Required (cannot proceed without):
 *   ✓ Terms of Service
 *   ✓ Privacy Policy
 *   ✓ Health data processing (Art. 9 GDPR — explicit consent required)
 *
 * Optional:
 *   ○ Research participation — anonymised data shared to advance
 *     women's health research (no personal identifiers)
 *
 * On "Accept & continue" → Account screen.
 * Consent flags stored in OnboardingContext for handoff to Supabase.
 *
 * Brand palette: Fuchsia #FF0472 | Coral #FF6B3D | Navy #000E28
 *                Cream #FFF3EE | Off White #FFF8F5 | Pink #FFB0CC
 */

import React, { useState } from 'react' // useState used for ConsentState
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Linking,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/native'
import { useOnboarding } from '../../context/OnboardingContext'

const TERMS_URL   = 'https://anoqi.health/terms'
const PRIVACY_URL = 'https://anoqi.health/privacy'

type ConsentState = {
  terms: boolean
  health: boolean
  research: boolean
}

const COPY = {
  fr: {
    title: 'Avant de commencer',
    subtitle: 'Quelques points importants pour utiliser Anoqi en toute confiance.',
    required: 'Obligatoire',
    optional: 'Optionnel',
    termsLabel: 'J\'accepte les ',
    termsLink: 'Conditions d\'utilisation',
    termsAnd: ' et la ',
    privacyLink: 'Politique de confidentialité',
    healthLabel: 'J\'accepte que mes questions de santé soient traitées pour me fournir des réponses.',
    healthNote: 'Tes données de santé ne sont jamais partagées. Elles restent sur ton appareil.',
    researchLabel: 'Aide à personnaliser tes recommandations et à soutenir la recherche en santé féminine avec des partenaires accrédités. Tes documents originaux restent sur ton téléphone — nous n\'envoyons que des données dont tout ce qui t\'identifie a été retiré.',
    researchNote: 'En savoir plus →',
    cta: 'Accepter et continuer',
    ctaDisabled: 'Accepte les conditions pour continuer',
  },
  en: {
    title: 'Before we start',
    subtitle: 'A few important things so you can use Anoqi with full confidence.',
    required: 'Required',
    optional: 'Optional',
    termsLabel: 'I agree to the ',
    termsLink: 'Terms of Service',
    termsAnd: ' and ',
    privacyLink: 'Privacy Policy',
    healthLabel: 'I agree to my health questions being processed to provide answers.',
    healthNote: 'Your health data is never shared. It stays on your device.',
    researchLabel: 'Help personalise your recommendations and support women\'s health research with vetted partners. Your original documents stay on your phone — we only upload data with everything that identifies you removed.',
    researchNote: 'Learn more →',
    cta: 'Accept & continue',
    ctaDisabled: 'Accept the required terms to continue',
  },
}

type CheckboxProps = {
  checked: boolean
  onToggle: () => void
  accessibilityLabel: string
}

function Checkbox({ checked, onToggle, accessibilityLabel }: CheckboxProps) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      style={[styles.checkbox, checked && styles.checkboxChecked]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {checked && <Text style={styles.checkboxTick}>✓</Text>}
    </TouchableOpacity>
  )
}

export function ConsentScreen() {
  const navigation = useNavigation<any>()
  const { language } = useOnboarding()
  const copy = COPY[language]

  const [consent, setConsent] = useState<ConsentState>({
    terms: false,
    health: false,
    research: false,
  })

  const canProceed = consent.terms && consent.health

  function toggle(key: keyof ConsentState) {
    setConsent(prev => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleContinue() {
    if (!canProceed) return
    // Mirror the chat-consent flag so signed-up users (who go through this
    // formal Consent screen) don't see the lighter anon-mode gate in
    // ChatScreen. The two surfaces are different presentations of the same
    // agreement — see ROADMAP "Consent strategy".
    await AsyncStorage.setItem('anoqi_chat_consent_accepted', 'true')
    // In production: store consent flags in OnboardingContext / Supabase
    navigation.navigate('Account')
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Progress: step 3 of 3 */}
        <View style={styles.progressRow}>
          <View style={[styles.dot, styles.dotDone]} />
          <View style={[styles.dot, styles.dotDone]} />
          <View style={[styles.dot, styles.dotActive]} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >

          {/* ── Required section ──────────────────────────── */}
          <View style={styles.sectionLabel}>
            <View style={styles.sectionPill}>
              <Text style={styles.sectionPillText}>{copy.required}</Text>
            </View>
          </View>

          {/* Terms + Privacy */}
          <TouchableOpacity
            style={[styles.consentRow, consent.terms && styles.consentRowChecked]}
            onPress={() => toggle('terms')}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consent.terms }}
          >
            <Checkbox
              checked={consent.terms}
              onToggle={() => toggle('terms')}
              accessibilityLabel="Accept terms and privacy policy"
            />
            <View style={styles.consentTextWrap}>
              <Text style={styles.consentText}>
                {copy.termsLabel}
                <Text
                  style={styles.consentLink}
                  onPress={() => Linking.openURL(TERMS_URL)}
                >
                  {copy.termsLink}
                </Text>
                {copy.termsAnd}
                <Text
                  style={styles.consentLink}
                  onPress={() => Linking.openURL(PRIVACY_URL)}
                >
                  {copy.privacyLink}
                </Text>
              </Text>
            </View>
          </TouchableOpacity>

          {/* Health data */}
          <TouchableOpacity
            style={[styles.consentRow, consent.health && styles.consentRowChecked]}
            onPress={() => toggle('health')}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consent.health }}
          >
            <Checkbox
              checked={consent.health}
              onToggle={() => toggle('health')}
              accessibilityLabel="Accept health data processing"
            />
            <View style={styles.consentTextWrap}>
              <Text style={styles.consentText}>{copy.healthLabel}</Text>
              <Text style={styles.consentNote}>{copy.healthNote}</Text>
            </View>
          </TouchableOpacity>

          {/* ── Optional section ──────────────────────────── */}
          <View style={[styles.sectionLabel, { marginTop: 20 }]}>
            <View style={[styles.sectionPill, styles.sectionPillOptional]}>
              <Text style={[styles.sectionPillText, styles.sectionPillTextOptional]}>
                {copy.optional}
              </Text>
            </View>
          </View>

          {/* Research */}
          <TouchableOpacity
            style={[styles.consentRow, consent.research && styles.consentRowChecked]}
            onPress={() => toggle('research')}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consent.research }}
          >
            <Checkbox
              checked={consent.research}
              onToggle={() => toggle('research')}
              accessibilityLabel="Contribute to women's health research"
            />
            <View style={styles.consentTextWrap}>
              <Text style={styles.consentText}>{copy.researchLabel}</Text>
              <Text style={styles.consentNote}>{copy.researchNote}</Text>
            </View>
          </TouchableOpacity>

        </ScrollView>

        {/* CTA */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.ctaButton, !canProceed && styles.ctaButtonDisabled]}
            onPress={handleContinue}
            disabled={!canProceed}
            accessibilityRole="button"
          >
            <Text style={[styles.ctaText, !canProceed && styles.ctaTextDisabled]}>
              {canProceed ? copy.cta : copy.ctaDisabled}
            </Text>
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
    marginBottom: 28,
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

  // Scroll
  scrollContent: {
    paddingBottom: 16,
  },

  // Section labels
  sectionLabel: {
    marginBottom: 10,
  },
  sectionPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FF6B3D',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  sectionPillText: {
    fontSize: 11,
    fontFamily: 'DMSans-Medium',
    color: '#FFFFFF',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionPillOptional: {
    backgroundColor: '#E8DDD9',
  },
  sectionPillTextOptional: {
    color: '#888888',
  },

  // Consent rows
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#EDE5E0',
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },
  consentRowChecked: {
    borderColor: '#FF0472',
    backgroundColor: '#FFF3EE',
  },
  consentTextWrap: {
    flex: 1,
    gap: 4,
  },
  consentText: {
    fontSize: 14,
    fontFamily: 'DMSans-Regular',
    color: '#000E28',
    lineHeight: 20,
  },
  consentLink: {
    color: '#FF0472',
    textDecorationLine: 'underline',
  },
  consentNote: {
    fontSize: 12,
    fontFamily: 'DMSans-Regular',
    color: '#888888',
    lineHeight: 18,
  },

  // Checkbox
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E8DDD9',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: {
    borderColor: '#FF0472',
    backgroundColor: '#FF0472',
  },
  checkboxTick: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },

  // Actions
  actions: { paddingTop: 16 },
  ctaButton: {
    backgroundColor: '#FF0472',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaButtonDisabled: {
    backgroundColor: '#E8DDD9',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'BricolageGrotesque-ExtraBold',
    letterSpacing: -0.3,
  },
  ctaTextDisabled: {
    color: '#AAAAAA',
    fontSize: 15,
    fontFamily: 'DMSans-Regular',
  },
})
