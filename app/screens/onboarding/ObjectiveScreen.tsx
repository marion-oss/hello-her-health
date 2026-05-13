/**
 * anoqi — ObjectiveScreen
 *
 * Step 2 of onboarding.
 * User picks what brings them to Anoqi today.
 * Stored in OnboardingContext; written to DB on account creation.
 * Skippable — defaults to 'general'.
 *
 * Brand palette: Fuchsia #FF0472 | Coral #FF6B3D | Navy #000E28
 *                Cream #FFF3EE | Off White #FFF8F5 | Pink #FFB0CC
 */

import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useOnboarding, type HealthObjective } from '../../context/OnboardingContext'

/**
 * Mounted in two stacks with different behaviour:
 *   • OnboardingNavigator (default) — step 2 of onboarding, has progress dots,
 *     "Continuer" → Consent, optional "Commencer la conversation →" shortcut
 *     skips remaining onboarding (anon mode) and deep-links straight to Chat.
 *   • MainNavigator with mode='change' — topic switcher from Home; "Continuer"
 *     saves the new objective and pops back to Home. No progress dots, no
 *     start-chat shortcut, no skip button.
 */

type ObjectiveOption = {
  id: HealthObjective
  emoji: string
  fr: { label: string; description: string }
  en: { label: string; description: string }
}

const OBJECTIVES: ObjectiveOption[] = [
  {
    id: 'symptoms',
    emoji: '🔍',
    fr: { label: 'Comprendre mes symptômes', description: 'Douleurs, fatigue, cycles irréguliers…' },
    en: { label: 'Understand my symptoms', description: 'Pain, fatigue, irregular cycles…' },
  },
  {
    id: 'contraception',
    emoji: '💊',
    fr: { label: 'Choisir ma contraception', description: 'Comparer les options, comprendre les effets' },
    en: { label: 'Choose my contraception', description: 'Compare options, understand the effects' },
  },
  {
    id: 'menopause',
    emoji: '🌿',
    fr: { label: 'Naviguer la ménopause', description: 'Périménopause, THM, symptômes' },
    en: { label: 'Navigate menopause', description: 'Perimenopause, HRT, symptoms' },
  },
  {
    id: 'fertility',
    emoji: '🌱',
    fr: { label: 'Questions de fertilité', description: 'Cycle, conception, suivi' },
    en: { label: 'Fertility questions', description: 'Cycle, conception, tracking' },
  },
  {
    id: 'general',
    emoji: '💬',
    fr: { label: 'Santé féminine en général', description: 'Tout ce qui concerne ma santé' },
    en: { label: 'General women\'s health', description: 'Anything related to my health' },
  },
]

const COPY = {
  fr: {
    title: 'Qu\'est-ce qui t\'amène ?',
    titleChange: 'Change ton objectif santé',
    subtitle: 'Personnalise ton expérience. Tu pourras changer ça à tout moment.',
    subtitleChange: 'Choisis ton nouvel objectif. Anoqi adaptera ses réponses.',
    cta: 'Continuer',
    ctaChange: 'Enregistrer',
    skip: 'Je ne sais pas encore',
    startChat: 'Commencer la conversation →',
  },
  en: {
    title: 'What brings you here?',
    titleChange: 'Change your focus area',
    subtitle: 'Personalise your experience. You can change this anytime.',
    subtitleChange: 'Pick a new focus. Anoqi will adapt its answers.',
    cta: 'Continue',
    ctaChange: 'Save',
    skip: 'I\'m not sure yet',
    startChat: 'Let\'s start chatting →',
  },
}

const CHAT_INTENT_KEY = 'anoqi_chat_intent'

export function ObjectiveScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const isChangeMode = route.params?.mode === 'change'
  const { language, setObjective, markDone } = useOnboarding()
  const [selected, setSelected] = useState<HealthObjective | null>(null)
  const copy = COPY[language]

  function handleContinue() {
    if (selected) setObjective(selected)
    if (isChangeMode) {
      navigation.goBack()
    } else {
      navigation.navigate('Consent')
    }
  }

  function handleSkip() {
    setObjective('general')
    navigation.navigate('Consent')
  }

  // Onboarding-mode shortcut: pick objective + jump straight to Chat
  // (skips Consent + Account; anon session). Lighter consent gate inside
  // Chat will catch the user before their first message — see ROADMAP.
  async function handleStartChatting() {
    setObjective(selected ?? 'general')
    await AsyncStorage.setItem(CHAT_INTENT_KEY, 'true')
    markDone()
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Progress: step 2 of 3 — hidden when changing objective from Home */}
        {!isChangeMode && (
          <View style={styles.progressRow}>
            <View style={[styles.dot, styles.dotDone]} />
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {isChangeMode ? copy.titleChange : copy.title}
          </Text>
          <Text style={styles.subtitle}>
            {isChangeMode ? copy.subtitleChange : copy.subtitle}
          </Text>
        </View>

        {/* Options */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {OBJECTIVES.map((obj) => {
            const isSelected = selected === obj.id
            const label = obj[language].label
            const description = obj[language].description
            return (
              <TouchableOpacity
                key={obj.id}
                style={[styles.option, isSelected && styles.optionSelected]}
                onPress={() => setSelected(obj.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={label}
              >
                <Text style={styles.optionEmoji}>{obj.emoji}</Text>
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                    {label}
                  </Text>
                  <Text style={styles.optionDescription}>{description}</Text>
                </View>
                {isSelected && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.ctaButton, !selected && styles.ctaButtonDisabled]}
            onPress={handleContinue}
            disabled={!selected}
            accessibilityRole="button"
          >
            <Text style={[styles.ctaText, !selected && styles.ctaTextDisabled]}>
              {isChangeMode ? copy.ctaChange : copy.cta}
            </Text>
          </TouchableOpacity>

          {/* Onboarding-only: shortcut straight to Chat */}
          {!isChangeMode && (
            <TouchableOpacity
              onPress={handleStartChatting}
              style={styles.startChatButton}
              accessibilityRole="button"
            >
              <Text style={styles.startChatText}>{copy.startChat}</Text>
            </TouchableOpacity>
          )}

          {/* Onboarding-only: skip → defaults to 'general' */}
          {!isChangeMode && (
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton} accessibilityRole="button">
              <Text style={styles.skipText}>{copy.skip}</Text>
            </TouchableOpacity>
          )}
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

  // List
  scroll: { flex: 1 },
  scrollContent: { gap: 10, paddingBottom: 16 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#EDE5E0',
    backgroundColor: '#FFFFFF',
    gap: 14,
  },
  optionSelected: {
    borderColor: '#FF6B3D',
    backgroundColor: '#FFF3EE',
  },
  optionEmoji: {
    fontSize: 24,
    width: 36,
    textAlign: 'center',
  },
  optionText: { flex: 1 },
  optionLabel: {
    fontSize: 15,
    fontFamily: 'DMSans-Medium',
    color: '#000E28',
    marginBottom: 2,
  },
  optionLabelSelected: {
    color: '#FF6B3D',
  },
  optionDescription: {
    fontSize: 13,
    fontFamily: 'DMSans-Regular',
    color: '#888888',
    lineHeight: 18,
  },
  checkmark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FF6B3D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'DMSans-Medium',
  },

  // Actions
  actions: { gap: 12, paddingTop: 16 },
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
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 15,
    fontFamily: 'DMSans-Regular',
    color: '#AAAAAA',
  },
  startChatButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  startChatText: {
    fontSize: 15,
    fontFamily: 'DMSans-Medium',
    color: '#FF6B3D',
    fontWeight: '600',
  },
})
