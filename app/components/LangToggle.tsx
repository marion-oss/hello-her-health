// Anoqi — LangToggle.
//
// "FR · EN" toggle pulled from the v2.2 spec. Reads + writes directly to
// OnboardingContext so consumers don't have to wire props each time.
// Visible position: top-right of every main tab header (Home, Chat,
// Documents, Profile) and the onboarding Welcome screen.

import React from 'react'
import { Pressable, View } from 'react-native'

import { useOnboarding } from '../context/OnboardingContext'
import { useTheme } from '../theme'
import { Text } from './Text'

export function LangToggle() {
  const { language, setLanguage } = useOnboarding()
  const theme = useTheme()

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Pressable onPress={() => setLanguage('fr')} hitSlop={8}>
        <Text
          variant="eyebrow"
          style={{
            color:
              language === 'fr'
                ? theme.colors.text.primary
                : theme.colors.text.tertiary,
          }}
        >
          FR
        </Text>
      </Pressable>
      <Text variant="eyebrow" style={{ color: theme.colors.text.tertiary }}>
        ·
      </Text>
      <Pressable onPress={() => setLanguage('en')} hitSlop={8}>
        <Text
          variant="eyebrow"
          style={{
            color:
              language === 'en'
                ? theme.colors.text.primary
                : theme.colors.text.tertiary,
          }}
        >
          EN
        </Text>
      </Pressable>
    </View>
  )
}
