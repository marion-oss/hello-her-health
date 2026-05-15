// Anoqi — DocumentsScreen (stub).
//
// "Coming soon" placeholder. Real implementation will list uploaded medical
// documents, summaries, and doctor-ready PDFs; for now this just claims the
// tab slot so the navigation works.

import React from 'react'
import { Platform, SafeAreaView, StatusBar, View } from 'react-native'
import { useIsFocused } from '@react-navigation/native'

import { useOnboarding } from '../../context/OnboardingContext'
import { palette, useTheme } from '../../theme'
import { BreathingForm, Icon, LiquidEmber, Text, Wordmark } from '../../components'

const COPY = {
  fr: {
    eyebrow: 'DOCUMENTS',
    title: 'Bientôt.',
    sub: 'Tu pourras bientôt téléverser tes résultats, garder tes résumés à portée, et préparer chaque consultation en avance.',
    cardEyebrow: 'En cours',
    cardLine: 'Stockage chiffré, jamais lié à ton identité.',
  },
  en: {
    eyebrow: 'DOCUMENTS',
    title: 'Coming soon.',
    sub: 'You will be able to upload your results, keep your summaries close, and prepare each consultation in advance.',
    cardEyebrow: 'In progress',
    cardLine: 'Encrypted storage, never linked to your identity.',
  },
} as const

export function DocumentsScreen() {
  const theme = useTheme()
  const { language } = useOnboarding()
  const copy = COPY[language]
  // Only render the breathing form when this tab is focused — without
  // this guard, the form's `position: fixed` (web) bleeds into other tabs
  // because React Navigation keeps tab screens mounted in parallel.
  const isFocused = useIsFocused()

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.bg.canvas} />

      {/* Breathing form tucked into the bottom-right corner. Sits behind
          content (no zIndex — DOM order places it under later siblings) so
          it never overlaps document cards or buttons. Slight overflow off
          the corner so the form reads as a quiet anchor, not a foreground
          decoration. */}
      {isFocused ? (
        <View
          pointerEvents="none"
          style={
            Platform.OS === 'web'
              ? ({
                  position: 'fixed',
                  right: -40,
                  bottom: -40,
                  width: 585,
                  height: 585,
                  alignItems: 'center',
                  justifyContent: 'center',
                } as any)
              : {
                  position: 'absolute',
                  right: -40,
                  bottom: -40,
                  width: 585,
                  height: 585,
                  alignItems: 'center',
                  justifyContent: 'center',
                }
          }
        >
          <BreathingForm size={585} />
        </View>
      ) : null}

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
            maxWidth: 520,
            lineHeight: 24,
          }}
        >
          {copy.sub}
        </Text>

        {/* Status glass card. Full-width so the description never clips on
            narrow viewports; the text column flexes inside the row. */}
        <View
          style={{
            borderRadius: 22,
            overflow: 'hidden',
            position: 'relative',
            alignSelf: 'stretch',
            maxWidth: 520,
          }}
        >
          <LiquidEmber intensity={0.55} fuchsia={false} blur={40} borderRadius={22} />

          <View
            style={[
              {
                backgroundColor: 'rgba(255, 245, 238, 0.04)',
                borderWidth: 1,
                borderColor: 'rgba(255, 245, 238, 0.08)',
                borderRadius: 22,
                paddingHorizontal: theme.spacing[5],
                paddingVertical: theme.spacing[4],
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              },
              Platform.OS === 'web'
                ? ({
                    backdropFilter: 'blur(18px) saturate(140%)',
                    WebkitBackdropFilter: 'blur(18px) saturate(140%)',
                  } as any)
                : null,
            ]}
          >
            <Icon name="FileText" size={18} color={palette.ember[300]} strokeWidth={1.6} />
            <View style={{ flex: 1 }}>
              <Text variant="eyebrow" style={{ color: palette.ember[400], marginBottom: 2 }}>
                {copy.cardEyebrow.toUpperCase()}
              </Text>
              <Text variant="bodyLight" style={{ color: 'rgba(255, 245, 238, 0.7)' }}>
                {copy.cardLine}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}
