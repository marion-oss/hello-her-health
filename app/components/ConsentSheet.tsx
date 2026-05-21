// Anoqi — ConsentSheet.
//
// Bottom-up modal presenting the same three consents as ConsentScreen
// ("Avant de commencer"). Used on the skip-and-chat path: shown after
// the user sends their first chat message, before any AI response is
// generated. Non-dismissable until the two required boxes are ticked.
//
// Two visual variants driven by viewport width:
//   • Bottom sheet — full viewport width, slides up from the bottom edge.
//     Used on native and on mobile web (vw < 768).
//   • Centered dialog — ~30 % viewport width, no drag handle, tighter
//     spacing. Used on desktop web (vw >= 768).
// Both variants share the same custom Animated.View entrance (translateY
// + fade) which is smoother on mobile web than RN Modal's built-in slide.

import React, { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native'

import { useTheme } from '../theme'
import {
  CONSENT_COPY,
  CONSENT_PRIVACY_URL,
  CONSENT_TERMS_URL,
} from '../screens/onboarding/consent.copy'
import { Button } from './Button'
import { Checkbox } from './Checkbox'
import { Text } from './Text'

// Above this viewport width, switch from full-width bottom sheet to
// centered narrow dialog. Matches typical tablet/desktop breakpoint.
const WEB_DESKTOP_BREAKPOINT = 768
const DIALOG_MIN_WIDTH = 360
const DIALOG_MAX_WIDTH = 480

type ConsentState = {
  terms: boolean
  health: boolean
  research: boolean
}

type Props = {
  visible: boolean
  language: 'fr' | 'en'
  onAccept: (researchOptIn: boolean) => void
}

export function ConsentSheet({ visible, language, onAccept }: Props) {
  const theme = useTheme()
  const copy = CONSENT_COPY[language]
  const { width: vw, height: vh } = useWindowDimensions()
  const isWideWeb = Platform.OS === 'web' && vw >= WEB_DESKTOP_BREAKPOINT

  const [consent, setConsent] = useState<ConsentState>({
    terms: false,
    health: false,
    research: false,
  })

  // On the centered desktop variant a small pop-from-below reads as a
  // dialog. On bottom-sheet variants we slide further so the entrance
  // reads as a real bottom-up sheet.
  const enterDistance = isWideWeb ? 32 : Math.min(vh * 0.5, 480)
  const translateY = useRef(new Animated.Value(enterDistance)).current
  const opacity = useRef(new Animated.Value(0)).current
  // Defer unmount until the exit animation finishes so the sheet doesn't
  // pop out abruptly.
  const [mounted, setMounted] = useState(visible)

  useEffect(() => {
    if (visible) {
      setMounted(true)
      translateY.setValue(enterDistance)
      opacity.setValue(0)
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 460,
          // outQuint — fast start, gentle settle. Reads as smoother than
          // RN Modal's built-in "slide" on mobile web (which feels snappy).
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start()
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: enterDistance,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false)
      })
    }
  }, [visible, enterDistance, translateY, opacity, mounted])

  const canProceed = consent.terms && consent.health

  function toggle(key: keyof ConsentState) {
    setConsent((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function handleAccept() {
    if (!canProceed) return
    onAccept(consent.research)
  }

  if (!mounted) return null

  const dialogWidth = isWideWeb
    ? Math.min(DIALOG_MAX_WIDTH, Math.max(DIALOG_MIN_WIDTH, vw * 0.3))
    : vw

  return (
    <Modal
      transparent
      visible={mounted}
      // Our custom Animated.View drives the entrance — disable RN's so the
      // two don't fight each other (and to keep mobile web smooth).
      animationType="none"
      // No-op: consent is required before any AI response is generated for
      // the user's first message. Hardware back / swipe-down should not let
      // them bypass it.
      onRequestClose={() => {}}
      statusBarTranslucent
    >
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: theme.colors.bg.overlay,
          opacity,
          justifyContent: isWideWeb ? 'center' : 'flex-end',
          alignItems: 'center',
        }}
      >
        <Animated.View
          style={{
            width: dialogWidth,
            backgroundColor: theme.colors.bg.surfaceMuted,
            borderTopLeftRadius: theme.radii.xl,
            borderTopRightRadius: theme.radii.xl,
            borderBottomLeftRadius: isWideWeb ? theme.radii.xl : 0,
            borderBottomRightRadius: isWideWeb ? theme.radii.xl : 0,
            paddingTop: isWideWeb ? theme.spacing[6] : theme.spacing[3],
            paddingHorizontal: isWideWeb ? theme.spacing[6] : theme.spacing[6],
            paddingBottom: isWideWeb ? theme.spacing[6] : theme.spacing[8],
            maxHeight: isWideWeb ? '85%' : '90%',
            transform: [{ translateY }],
            ...(isWideWeb ? theme.shadow('lg') : null),
          }}
        >
          {/* Drag handle: only on the bottom-sheet variant (decorative). */}
          {!isWideWeb ? (
            <View style={{ alignItems: 'center', marginBottom: theme.spacing[5] }}>
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: theme.colors.border.subtle,
                }}
              />
            </View>
          ) : null}

          <Text
            variant={isWideWeb ? 'h2' : 'h1'}
            tone="primary"
            style={{ marginBottom: theme.spacing[2] }}
          >
            {copy.title}
          </Text>
          <Text
            variant={isWideWeb ? 'body' : 'bodyLg'}
            tone="secondary"
            style={{ marginBottom: isWideWeb ? theme.spacing[5] : theme.spacing[6] }}
          >
            {copy.subtitle}
          </Text>

          <ScrollView
            contentContainerStyle={{ gap: isWideWeb ? theme.spacing[4] : theme.spacing[5] }}
            showsVerticalScrollIndicator={false}
          >
            {/* Terms + Privacy (required) */}
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

            {/* Health data (required) */}
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

            {/* Research (optional) — placed last as in ConsentSheet's
                original order; ConsentScreen reordered to row 2 in PR #36
                because the third row sat below the fold on mobile. The
                sheet variant doesn't have the same problem because it
                scrolls fully open. */}
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
          </ScrollView>

          <View style={{ paddingTop: theme.spacing[6] }}>
            <Button
              label={canProceed ? copy.cta : copy.ctaDisabled}
              size="lg"
              fullWidth
              disabled={!canProceed}
              onPress={handleAccept}
            />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  )
}
