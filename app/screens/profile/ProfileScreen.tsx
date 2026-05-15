// Anoqi — ProfileScreen (minimal).
//
// One control for now: language toggle (FR / EN). Reads + writes through
// OnboardingContext so the rest of the app picks it up immediately.

import React from 'react'
import { Platform, Pressable, SafeAreaView, StatusBar, View } from 'react-native'

import { useOnboarding, type Language } from '../../context/OnboardingContext'
import { hover, palette, useTheme } from '../../theme'
import { LiquidEmber, Text, Wordmark } from '../../components'

const COPY = {
  fr: {
    eyebrow: 'PROFIL',
    title: 'Toi.',
    sub: "Réglages, rien d'autre pour l'instant.",
    langLabel: 'Langue',
    langDetail: "Anoqi t'écrira et te lira dans la langue choisie.",
  },
  en: {
    eyebrow: 'PROFILE',
    title: 'You.',
    sub: 'Settings — nothing else for now.',
    langLabel: 'Language',
    langDetail: 'Anoqi will write to you and read you in the language you pick.',
  },
} as const

export function ProfileScreen() {
  const theme = useTheme()
  const { language, setLanguage } = useOnboarding()
  const copy = COPY[language]

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.canvas }}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.bg.canvas} />

      {/* Header — small wordmark on the left for orientation. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.spacing[6],
          paddingTop: theme.spacing[3],
          paddingBottom: theme.spacing[2],
        }}
      >
        <Wordmark size={20} />
      </View>

      <View
        style={{
          flex: 1,
          paddingHorizontal: theme.spacing[6],
          paddingTop: theme.spacing[8],
          paddingBottom: theme.spacing[24],
        }}
      >
        <Text variant="eyebrow" style={{ color: 'rgba(255, 245, 238, 0.5)', marginBottom: 8 }}>
          {copy.eyebrow}
        </Text>
        <Text variant="h1Italic" style={{ color: palette.warmWhite[100] }}>
          {copy.title}
        </Text>
        <Text
          variant="bodyLight"
          style={{
            color: 'rgba(255, 245, 238, 0.65)',
            marginTop: theme.spacing[3],
            marginBottom: theme.spacing[8],
            maxWidth: 480,
          }}
        >
          {copy.sub}
        </Text>

        {/* Language card */}
        <View
          style={{
            borderRadius: 24,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <LiquidEmber intensity={0.8} blur={48} borderRadius={24} fuchsia={false} />

          <View
            style={[
              {
                backgroundColor: 'rgba(255, 245, 238, 0.05)',
                borderWidth: 1,
                borderColor: 'rgba(255, 245, 238, 0.09)',
                borderRadius: 24,
                padding: theme.spacing[6],
              },
              Platform.OS === 'web'
                ? ({
                    backdropFilter: 'blur(20px) saturate(140%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(140%)',
                  } as any)
                : null,
            ]}
          >
            <Text variant="eyebrow" style={{ color: palette.ember[400], marginBottom: 10 }}>
              {copy.langLabel.toUpperCase()}
            </Text>
            <Text
              variant="bodyLight"
              style={{
                color: 'rgba(255, 245, 238, 0.65)',
                marginBottom: theme.spacing[5],
                lineHeight: 22,
              }}
            >
              {copy.langDetail}
            </Text>

            <View
              style={{
                flexDirection: 'row',
                gap: 10,
              }}
            >
              <LangPill label="Français" active={language === 'fr'} onPress={() => setLanguage('fr')} />
              <LangPill label="English"   active={language === 'en'} onPress={() => setLanguage('en')} />
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}

function LangPill({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ hovered }: any) => [
        {
          flex: 1,
          paddingVertical: 14,
          borderRadius: 999,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          backgroundColor: active
            ? 'rgba(255, 4, 114, 0.22)'
            : 'rgba(255, 245, 238, 0.05)',
          borderWidth: 1,
          borderColor: active
            ? 'rgba(255, 4, 114, 0.45)'
            : 'rgba(255, 245, 238, 0.10)',
        },
        hover.transition,
        hovered && hover.lift,
        hovered && active && {
          borderColor: 'rgba(255, 4, 114, 0.65)',
          backgroundColor: 'rgba(255, 4, 114, 0.28)',
        },
        hovered && active && hover.glow('rgba(255, 4, 114, 0.45)'),
        hovered && !active && {
          backgroundColor: 'rgba(255, 245, 238, 0.10)',
          borderColor: 'rgba(255, 245, 238, 0.22)',
        },
      ]}
    >
      {active ? (
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            backgroundColor: palette.fuchsia[500],
          }}
        />
      ) : null}
      <Text variant="bodyMed" style={{ color: palette.warmWhite[100] }}>
        {label}
      </Text>
    </Pressable>
  )
}
