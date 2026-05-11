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
import { useNavigation } from '@react-navigation/native'
import { useOnboarding, type HealthObjective } from '../../context/OnboardingContext'

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
    subtitle: 'Personnalise ton expérience. Tu pourras changer ça à tout moment.',
    cta: 'Continuer',
    skip: 'Je ne sais pas encore',
  },
  en: {
    title: 'What brings you here?',
    subtitle: 'Personalise your experience. You can change this anytime.',
    cta: 'Continue',
    skip: 'I\'m not sure yet',
  },
}

export function ObjectiveScreen() {
  const navigation = useNavigation<any>()
  const { language, setObjective } = useOnboarding()
  const [selected, setSelected] = useState<HealthObjective | null>(null)
  const copy = COPY[language]

  function handleContinue() {
    if (selected) setObjective(selected)
    navigation.navigate('Consent')
  }

  function handleSkip() {
    setObjective('general')
    navigation.navigate('Consent')
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Progress: step 2 of 3 */}
        <View style={styles.progressRow}>
          <View style={[styles.dot, styles.dotDone]} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>
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
              {copy.cta}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton} accessibilityRole="button">
            <Text style={styles.skipText}>{copy.skip}</Text>
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
})
