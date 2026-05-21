// Anoqi — ConsentScreen.
//
// Editorial intro explaining WHY consent is asked (it's core to the product,
// not a hurdle). Three rows with checkboxes. Optional row prefixes the
// label with a fuchsia-semibold "(Optionnel)" marker.

import React, { useState } from 'react'
import { Linking, Pressable, SafeAreaView, ScrollView, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/native'

import { useOnboarding } from '../../context/OnboardingContext'
import { hover, useTheme } from '../../theme'
import {
  Bloom,
  Button,
  Checkbox,
  ProgressBar,
  Text,
} from '../../components'
import {
  CONSENT_COPY,
  CONSENT_PRIVACY_URL,
  CONSENT_TERMS_URL,
} from './consent.copy'

type ConsentState = {
  terms: boolean
  health: boolean
  research: boolean
}

export function ConsentScreen() {
  const navigation = useNavigation<any>()
  const { language } = useOnboarding()
  const theme = useTheme()
  const copy = CONSENT_COPY[language]

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
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <Bloom intensity={0.5} />
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
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
          {/* Terms + Privacy — required */}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consent.terms }}
            onPress={() => toggle('terms')}
            style={({ hovered }: any) => [
              {
                flexDirection: 'row',
                gap: theme.spacing[4],
                padding: theme.spacing[3],
                marginHorizontal: -theme.spacing[3],
                borderRadius: theme.radii.md,
              },
              hover.transition,
              hovered && { backgroundColor: 'rgba(255, 245, 238, 0.03)' },
            ]}
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
                  onPress={() => Linking.openURL(CONSENT_TERMS_URL)}
                >
                  {copy.termsLink}
                </Text>
                {copy.termsAnd}
                <Text
                  variant="body"
                  tone="accent"
                  style={{ textDecorationLine: 'underline' }}
                  onPress={() => Linking.openURL(CONSENT_PRIVACY_URL)}
                >
                  {copy.privacyLink}
                </Text>
              </Text>
            </View>
          </Pressable>

          {/* Research — optional. Placed above the (required) health row so
              it stays above the fold on mobile; users were missing it
              entirely when it was the third row. The optional marker is
              an inline fuchsia-bold token (replacing the previous teal
              pill) so it reads as an attribute of the label rather than
              a separate ornament. */}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consent.research }}
            onPress={() => toggle('research')}
            style={({ hovered }: any) => [
              {
                flexDirection: 'row',
                gap: theme.spacing[4],
                padding: theme.spacing[3],
                marginHorizontal: -theme.spacing[3],
                borderRadius: theme.radii.md,
              },
              hover.transition,
              hovered && { backgroundColor: 'rgba(255, 245, 238, 0.03)' },
            ]}
          >
            <View style={{ marginTop: 2 }}>
              <Checkbox
                checked={consent.research}
                onChange={() => toggle('research')}
                accessibilityLabel="Contribute to women's health research"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="body" tone="primary">
                <Text variant="body" tone="accent" style={{ fontWeight: '600' }}>
                  ({copy.optional}){' '}
                </Text>
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

          {/* Health data — required */}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consent.health }}
            onPress={() => toggle('health')}
            style={({ hovered }: any) => [
              {
                flexDirection: 'row',
                gap: theme.spacing[4],
                padding: theme.spacing[3],
                marginHorizontal: -theme.spacing[3],
                borderRadius: theme.radii.md,
              },
              hover.transition,
              hovered && { backgroundColor: 'rgba(255, 245, 238, 0.03)' },
            ]}
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
    </View>
  )
}
