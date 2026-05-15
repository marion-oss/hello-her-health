// Anoqi — ObjectiveScreen.
//
// Five horizontal rows (not a card grid — banned). Sage progress bar replaces
// dot row. Selected row: Cotton Rose surface, peony icon. Lucide icons per
// objective, no emoji.

import React, { useState } from 'react'
import { Pressable, SafeAreaView, ScrollView, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation, useRoute } from '@react-navigation/native'

import { useOnboarding, type HealthObjective } from '../../context/OnboardingContext'
import { useTheme } from '../../theme'
import {
  BackHeader,
  Button,
  Icon,
  type IconName,
  ProgressBar,
  Text,
} from '../../components'

type ObjectiveOption = {
  id: HealthObjective
  icon: IconName
  fr: { label: string; description: string }
  en: { label: string; description: string }
}

const OBJECTIVES: ObjectiveOption[] = [
  {
    id: 'symptoms',
    icon: 'Stethoscope',
    fr: { label: 'Comprendre mes symptômes', description: 'Douleurs, fatigue, cycles irréguliers…' },
    en: { label: 'Understand my symptoms',  description: 'Pain, fatigue, irregular cycles…' },
  },
  {
    id: 'contraception',
    icon: 'Pill',
    fr: { label: 'Choisir ma contraception', description: 'Comparer les options, comprendre les effets.' },
    en: { label: 'Choose my contraception', description: 'Compare options, understand the effects.' },
  },
  {
    id: 'menopause',
    icon: 'Sunset',
    fr: { label: 'Naviguer la ménopause', description: 'Périménopause, THM, symptômes.' },
    en: { label: 'Navigate menopause',    description: 'Perimenopause, HRT, symptoms.' },
  },
  {
    id: 'fertility',
    icon: 'Sprout',
    fr: { label: 'Questions de fertilité', description: 'Cycle, conception, suivi.' },
    en: { label: 'Fertility questions',    description: 'Cycle, conception, tracking.' },
  },
  {
    id: 'general',
    icon: 'MessageCircle',
    fr: { label: 'Santé féminine en général', description: 'Tout ce qui concerne ma santé.' },
    en: { label: "General women's health",    description: 'Anything about my health.' },
  },
]

const COPY = {
  fr: {
    title: "Qu'est-ce qui t'amène ?",
    titleChange: 'Change ton objectif santé',
    subtitle: 'Personnalise ton expérience. Tu pourras changer ça à tout moment.',
    subtitleChange: 'Anoqi adaptera ses réponses.',
    step: 'Étape 1 sur 3',
    cta: 'Continuer',
    ctaChange: 'Enregistrer',
    skip: 'Je ne sais pas encore',
    startChat: 'Commencer la conversation',
  },
  en: {
    title: 'What brings you here?',
    titleChange: 'Change your focus area',
    subtitle: 'Personalise your experience. You can change this anytime.',
    subtitleChange: 'Anoqi will adapt its answers.',
    step: 'Step 1 of 3',
    cta: 'Continue',
    ctaChange: 'Save',
    skip: "I'm not sure yet",
    startChat: "Let's start chatting",
  },
} as const

const CHAT_INTENT_KEY = 'anoqi_chat_intent'

export function ObjectiveScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const isChangeMode = route.params?.mode === 'change'
  const { language, setObjective, markDone } = useOnboarding()
  const [selected, setSelected] = useState<HealthObjective | null>(null)
  const theme = useTheme()
  const copy = COPY[language]

  function handleContinue() {
    if (selected) setObjective(selected)
    if (isChangeMode) navigation.goBack()
    else navigation.navigate('Consent')
  }

  function handleSkip() {
    setObjective('general')
    navigation.navigate('Consent')
  }

  async function handleStartChatting() {
    setObjective(selected ?? 'general')
    await AsyncStorage.setItem(CHAT_INTENT_KEY, 'true')
    markDone()
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.canvas }}>
      {isChangeMode ? <BackHeader onBack={() => navigation.goBack()} /> : null}

      <View
        style={{
          flex: 1,
          paddingHorizontal: theme.spacing[6],
          paddingTop: isChangeMode ? theme.spacing[2] : theme.spacing[5],
          paddingBottom: theme.spacing[6],
        }}
      >
        {!isChangeMode ? (
          <View style={{ marginBottom: theme.spacing[8] }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: theme.spacing[2],
              }}
            >
              <Text variant="eyebrow" tone="secondary" style={{ textTransform: 'uppercase' }}>
                anoqi
              </Text>
              <Text variant="eyebrow" tone="tertiary" style={{ textTransform: 'uppercase' }}>
                {copy.step}
              </Text>
            </View>
            <ProgressBar progress={1 / 3} />
          </View>
        ) : null}

        <Text variant="h1" tone="primary" style={{ marginBottom: theme.spacing[3] }}>
          {isChangeMode ? copy.titleChange : copy.title}
        </Text>
        <Text variant="bodyLg" tone="secondary" style={{ marginBottom: theme.spacing[6] }}>
          {isChangeMode ? copy.subtitleChange : copy.subtitle}
        </Text>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ gap: theme.spacing[2] }}
          showsVerticalScrollIndicator={false}
        >
          {OBJECTIVES.map((obj) => {
            const isSelected = selected === obj.id
            const copy = obj[language]
            return (
              <Pressable
                key={obj.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={copy.label}
                onPress={() => setSelected(obj.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: theme.spacing[4],
                  paddingHorizontal: theme.spacing[4],
                  borderRadius: theme.radii.lg,
                  backgroundColor: isSelected ? theme.colors.bg.surfaceWarm : 'transparent',
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: isSelected
                      ? theme.colors.accent.primary
                      : theme.colors.accent.successSurface,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: theme.spacing[4],
                  }}
                >
                  <Icon
                    name={obj.icon}
                    size={20}
                    color={isSelected
                      ? theme.colors.accent.primaryOnText
                      : theme.colors.accent.success}
                    strokeWidth={1.8}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="h4" tone="primary" style={{ marginBottom: 2 }}>
                    {copy.label}
                  </Text>
                  <Text variant="body" tone="tertiary">
                    {copy.description}
                  </Text>
                </View>
                {isSelected ? (
                  <Icon
                    name="Check"
                    size={20}
                    color={theme.colors.accent.primary}
                    strokeWidth={2.5}
                  />
                ) : null}
              </Pressable>
            )
          })}
        </ScrollView>

        <View style={{ paddingTop: theme.spacing[5], gap: theme.spacing[3] }}>
          <Button
            label={isChangeMode ? copy.ctaChange : copy.cta}
            size="lg"
            fullWidth
            disabled={!selected}
            onPress={handleContinue}
          />

          {!isChangeMode ? (
            <>
              <Pressable
                accessibilityRole="button"
                onPress={handleStartChatting}
                style={{ alignSelf: 'center', paddingVertical: theme.spacing[2] }}
                hitSlop={10}
              >
                <Text variant="bodyMed" tone="accent">
                  {copy.startChat} →
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={handleSkip}
                style={{ alignSelf: 'center', paddingVertical: theme.spacing[1] }}
                hitSlop={10}
              >
                <Text variant="body" tone="tertiary">
                  {copy.skip}
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  )
}
