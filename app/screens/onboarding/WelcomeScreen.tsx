/**
 * anoqi — WelcomeScreen
 *
 * Step 1 of onboarding.
 * - FR / EN toggle top-right corner (persists across all screens)
 * - Value prop: tagline, body, 3 trust points
 * - "I have a question →" CTA → Objective
 * - "I already have an account" link → Account screen in login mode
 *   (skips the entire onboarding flow for returning users)
 *
 * Brand palette:
 *   Neon Fuchsia  #FF0472
 *   Hot Coral     #FF6B3D
 *   Midnight Navy #000E28
 *   Warm Cream    #FFF3EE
 *   Off White     #FFF8F5
 *   Candy Pink    #FFB0CC
 *
 * Fonts: BricolageGrotesque-ExtraBold (headlines), DMSans-Regular / DMSans-Medium (body)
 * Load both via expo-font before this screen renders.
 */

import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useOnboarding, type Language } from '../../context/OnboardingContext'

const COPY = {
  fr: {
    tagline: 'Mieux informée.\nMieux entendue.',
    body: 'Anoqi est ta compagne santé — elle t\'aide à comprendre tes symptômes, préparer tes consultations et naviguer le système médical en confiance.',
    trust: [
      'Sources médicales validées (NHS, HAS, NICE…)',
      'Recherches menées sur les femmes',
      'Jamais lié à ton nom ou ton identité',
    ],
    cta: "J'ai une question →",
    login: 'J\'ai déjà un compte',
  },
  en: {
    tagline: 'Better informed.\nBetter heard.',
    body: 'Anoqi is your health companion — helping you understand your symptoms, prepare for appointments, and navigate the medical system with confidence.',
    trust: [
      'Validated medical sources (NHS, HAS, NICE…)',
      'Research conducted on women',
      'Never linked to your name or identity',
    ],
    cta: 'I have a question →',
    login: 'I already have an account',
  },
}

export function WelcomeScreen() {
  const navigation = useNavigation<any>()
  const { language, setLanguage } = useOnboarding()
  const copy = COPY[language]

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF8F5" />

      {/* ── Top bar: language toggle ────────────────────── */}
      <View style={styles.topBar}>
        <View style={styles.langToggle}>
          <TouchableOpacity
            onPress={() => setLanguage('fr' as Language)}
            style={[styles.langBtn, language === 'fr' && styles.langBtnActive]}
            accessibilityRole="button"
            accessibilityLabel="Français"
          >
            <Text style={[styles.langText, language === 'fr' && styles.langTextActive]}>
              FR
            </Text>
          </TouchableOpacity>
          <View style={styles.langDivider} />
          <TouchableOpacity
            onPress={() => setLanguage('en' as Language)}
            style={[styles.langBtn, language === 'en' && styles.langBtnActive]}
            accessibilityRole="button"
            accessibilityLabel="English"
          >
            <Text style={[styles.langText, language === 'en' && styles.langTextActive]}>
              EN
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Main content ────────────────────────────────── */}
      <View style={styles.content}>
        <Text style={styles.wordmark}>anoqi</Text>
        <Text style={styles.tagline}>{copy.tagline}</Text>
        <Text style={styles.body}>{copy.body}</Text>

        <View style={styles.trustList}>
          {copy.trust.map((point, i) => (
            <View key={i} style={styles.trustRow}>
              <Text style={styles.trustIcon}>✦</Text>
              <Text style={styles.trustText}>{point}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Actions ─────────────────────────────────────── */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => navigation.navigate('Objective')}
          accessibilityRole="button"
          accessibilityLabel={copy.cta}
        >
          <Text style={styles.ctaText}>{copy.cta}</Text>
        </TouchableOpacity>

        {/* Returning users — skip all 5 onboarding screens */}
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('Account', { mode: 'login' })}
          accessibilityRole="button"
        >
          <Text style={styles.loginText}>{copy.login}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFF8F5',
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 4,
  },
  langToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE8E0',
    borderRadius: 20,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  langBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  langBtnActive: {
    backgroundColor: '#FF6B3D',
  },
  langText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B3D',
    fontFamily: 'DMSans-Medium',
  },
  langTextActive: {
    color: '#FFFFFF',
  },
  langDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#FFB0CC',
    marginHorizontal: 2,
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 20,
    justifyContent: 'center',
  },
  wordmark: {
    fontSize: 18,
    fontFamily: 'BricolageGrotesque-ExtraBold',
    color: '#FF0472',
    letterSpacing: -0.5,
    marginBottom: 20,
  },
  tagline: {
    fontSize: 40,
    fontFamily: 'BricolageGrotesque-ExtraBold',
    color: '#000E28',
    letterSpacing: -1.5,
    lineHeight: 46,
    marginBottom: 20,
  },
  body: {
    fontSize: 15,
    fontFamily: 'DMSans-Regular',
    color: '#4A4A4A',
    lineHeight: 24,
    marginBottom: 32,
  },
  trustList: {
    gap: 12,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  trustIcon: {
    fontSize: 11,
    color: '#FF0472',
    marginTop: 4,
  },
  trustText: {
    fontSize: 14,
    fontFamily: 'DMSans-Regular',
    color: '#000E28',
    lineHeight: 20,
    flex: 1,
  },

  // Actions
  actions: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 12,
  },
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
  loginButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    fontFamily: 'DMSans-Regular',
    color: '#888888',
    textDecorationLine: 'underline',
  },
})
