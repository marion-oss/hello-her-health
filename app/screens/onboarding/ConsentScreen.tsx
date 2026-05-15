// Anoqi — ConsentScreen.
//
// Editorial intro explaining WHY consent is asked (it's core to the product,
// not a hurdle). Three rows with sage-bordered checkboxes (peony check when
// active). Optional row gets a small teal "Optionnel" pill.

import React, { useState } from 'react'
import { Linking, Pressable, SafeAreaView, ScrollView, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/native'

import { useOnboarding } from '../../context/OnboardingContext'
import { useTheme } from '../../theme'
import {
  Button,
  Checkbox,
  Pill,
  ProgressBar,
  Text,
} from '../../components'

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
    subtitle:
      "Anoqi traite des sujets sensibles. Voici comment tes données restent à toi — et ce qui change si tu choisis d'aider la recherche.",
    step: 'Étape 2 sur 3',
    termsLabel: "J'accepte les ",
    termsLink: "Conditions d'utilisation",
    termsAnd: ' et la ',
    privacyLink: 'Politique de confidentialité',
    healthLabel:
      'J\'accepte que mes questions de santé soient traitées pour me fournir des réponses.',
    healthNote: 'Tes données restent sur ton appareil. Jamais liées à ton nom.',
    researchLabel:
      "Aide à personnaliser tes recommandations et soutiens la recherche en santé féminine avec des partenaires accrédités.",
    researchNote: 'Tout ce qui t\'identifie est retiré avant tout partage.',
    learnMore: 'En savoir plus',
    optional: 'Optionnel',
    cta: 'Accepter et continuer',
    ctaDisabled: 'Coche les deux requis pour continuer',
  },
  en: {
    title: 'Before we start',
    subtitle:
      "Anoqi handles sensitive topics. Here's how your data stays yours — and what changes if you choose to help research.",
    step: 'Step 2 of 3',
    termsLabel: 'I agree to the ',
    termsLink: 'Terms of Service',
    termsAnd: ' and ',
    privacyLink: 'Privacy Policy',
    healthLabel:
      'I agree to my health questions being processed to provide answers.',
    healthNote: 'Your data stays on your device. Never tied to your name.',
    researchLabel:
      "Help personalise your recommendations and support women's health research with vetted partners.",
    researchNote: 'Everything that identifies you is removed before any sharing.',
    learnMore: 'Learn more',
    optional: 'Optional',
    cta: 'Accept & continue',
    ctaDisabled: 'Check both required to continue',
  },
} as const

export function ConsentScreen() {
  const navigation = useNavigation<any>()
  const { language } = useOnboarding()
  const theme = useTheme()
  const copy = COPY[language]

  const [consent, setConsent] = useState<ConsentState>({
    terms: false,
    health: false,
    research: false,
  })

  const canProceed = consent.terms && consent.health

  function toggle(key: keyof ConsentState) {
    setConsent((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleContinue() {
    if (!canProceed) return
    await AsyncStorage.setItem('anoqi_chat_consent_accepted', 'true')
    navigation.navigate('Account')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.canvas }}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: theme.spacing[6],
          paddingTop: theme.spacing[5],
          paddingBottom: theme.spacing[6],
        }}
      >
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
          <ProgressBar progress={2 / 3} />
        </View>

        <Text variant="h1" tone="primary" style={{ marginBottom: theme.spacing[3] }}>
          {copy.title}
        </Text>
        <Text variant="bodyLg" tone="secondary" style={{ marginBottom: theme.spacing[8] }}>
          {copy.subtitle}
        </Text>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ gap: theme.spacing[5] }}
          showsVerticalScrollIndicator={false}
        >
          {/* Terms + Privacy */}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consent.terms }}
            onPress={() => toggle('terms')}
            style={{ flexDirection: 'row', gap: theme.spacing[4] }}
          >
            <View style={{ marginTop: 2 }}>
              <Checkbox
                checked={consent.terms}
                onChange={() => toggle('terms')}
                accessibilityLabel="Accept terms and privacy"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="body" tone="primary">
                {copy.termsLabel}
                <Text
                  variant="body"
                  tone="accent"
                  style={{ textDecorationLine: 'underline' }}
                  onPress={() => Linking.openURL(TERMS_URL)}
                >
                  {copy.termsLink}
                </Text>
                {copy.termsAnd}
                <Text
                  variant="body"
                  tone="accent"
                  style={{ textDecorationLine: 'underline' }}
                  onPress={() => Linking.openURL(PRIVACY_URL)}
                >
                  {copy.privacyLink}
                </Text>
              </Text>
            </View>
          </Pressable>

          {/* Health data */}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consent.health }}
            onPress={() => toggle('health')}
            style={{ flexDirection: 'row', gap: theme.spacing[4] }}
          >
            <View style={{ marginTop: 2 }}>
              <Checkbox
                checked={consent.health}
                onChange={() => toggle('health')}
                accessibilityLabel="Accept health data processing"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="body" tone="primary">
                {copy.healthLabel}
              </Text>
              <Text variant="caption" tone="tertiary" style={{ marginTop: theme.spacing[2] }}>
                {copy.healthNote}
              </Text>
            </View>
          </Pressable>

          {/* Research (optional) */}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consent.research }}
            onPress={() => toggle('research')}
            style={{ flexDirection: 'row', gap: theme.spacing[4] }}
          >
            <View style={{ marginTop: 2 }}>
              <Checkbox
                checked={consent.research}
                onChange={() => toggle('research')}
                accessibilityLabel="Contribute to women's health research"
              />
            </View>
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: theme.spacing[2],
                  gap: theme.spacing[2],
                }}
              >
                <Pill label={copy.optional} tone="teal" />
              </View>
              <Text variant="body" tone="primary">
                {copy.researchLabel}
              </Text>
              <Text variant="caption" tone="tertiary" style={{ marginTop: theme.spacing[2] }}>
                {copy.researchNote}{' '}
                <Text variant="caption" tone="accent" style={{ textDecorationLine: 'underline' }}>
                  {copy.learnMore} →
                </Text>
              </Text>
            </View>
          </Pressable>
        </ScrollView>

        <View style={{ paddingTop: theme.spacing[5] }}>
          <Button
            label={canProceed ? copy.cta : copy.ctaDisabled}
            size="lg"
            fullWidth
            disabled={!canProceed}
            onPress={handleContinue}
          />
        </View>
      </View>
    </SafeAreaView>
  )
}
