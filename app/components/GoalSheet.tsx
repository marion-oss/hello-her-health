// Anoqi — GoalSheet (v2.2 light register).
//
// Bottom-up sheet for switching the active HealthObjective. Mounted from
// Home (the focus pill) and from Chat (the header chip). Light custom
// build over RN's Modal + Animated.Value.
//
// Layout: dim backdrop, sheet pinned to the bottom with a white surface,
// 5 goal rows, "Save" CTA. Selected row gets a Petal tint + fuchsia border
// + fuchsia check.

import React, { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native'

import { useTheme, palette } from '../theme'
import type { HealthObjective, Language } from '../context/OnboardingContext'
import { Icon, type IconName } from './Icon'
import { Text } from './Text'

type Option = {
  id:   HealthObjective
  icon: IconName
  fr: { label: string; description: string }
  en: { label: string; description: string }
}

const OPTIONS: Option[] = [
  {
    id: 'symptoms',
    icon: 'Stethoscope',
    fr: { label: 'Comprendre mes symptômes', description: 'Douleurs, fatigue, cycles irréguliers…' },
    en: { label: 'Understand my symptoms',   description: 'Pain, fatigue, irregular cycles…' },
  },
  {
    id: 'contraception',
    icon: 'Pill',
    fr: { label: 'Choisir ma contraception', description: 'Comparer les options, effets' },
    en: { label: 'Choose my contraception',  description: 'Compare options, side effects' },
  },
  {
    id: 'menopause',
    icon: 'Sunset',
    fr: { label: 'Naviguer la ménopause', description: 'Périménopause, THM, symptômes' },
    en: { label: 'Navigate menopause',    description: 'Perimenopause, HRT, symptoms' },
  },
  {
    id: 'fertility',
    icon: 'Sprout',
    fr: { label: 'Questions de fertilité', description: 'Cycle, conception, suivi' },
    en: { label: 'Fertility questions',    description: 'Cycle, conception, tracking' },
  },
  {
    id: 'general',
    icon: 'MessageCircle',
    fr: { label: 'Santé générale', description: 'Tout ce qui concerne ma santé' },
    en: { label: 'General health', description: 'Anything related to my health' },
  },
]

const COPY = {
  fr: { title: 'Change ton objectif santé', subtitle: 'Anoqi adaptera ses réponses.', cta: 'Enregistrer' },
  en: { title: 'Change your focus area',    subtitle: 'Anoqi will adapt its answers.', cta: 'Save' },
}

type Props = {
  visible:   boolean
  selected:  HealthObjective | null
  language:  Language
  onSelect:  (id: HealthObjective) => void
  onClose:   () => void
}

export function GoalSheet({ visible, selected, language, onSelect, onClose }: Props) {
  const theme = useTheme()
  const { height, width } = useWindowDimensions()
  const copy = COPY[language]

  const isWide = width >= 800
  const sideInset = isWide ? `${(100 - 30) / 2}%` as `${number}%` : 0

  const [draft, setDraft] = useState<HealthObjective | null>(selected)
  useEffect(() => { if (visible) setDraft(selected) }, [visible, selected])

  const progress = useRef(new Animated.Value(0)).current
  const [mounted, setMounted] = useState(visible)

  useEffect(() => {
    if (visible) {
      setMounted(true)
      Animated.timing(progress, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }).start()
    } else if (mounted) {
      Animated.timing(progress, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }).start(({ finished }) => {
        if (finished) setMounted(false)
      })
    }
  }, [visible]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] })
  const backdropOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] })

  function commit() {
    if (draft) onSelect(draft)
    onClose()
  }

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={StyleSheet.absoluteFill}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(13, 13, 18, 0.35)', opacity: backdropOpacity },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>

        <Animated.View
          style={{
            position: 'absolute',
            left: sideInset,
            right: sideInset,
            bottom: 0,
            backgroundColor: '#ffffff',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderBottomLeftRadius: isWide ? 28 : 0,
            borderBottomRightRadius: isWide ? 28 : 0,
            marginBottom: isWide ? 24 : 0,
            borderTopWidth: 1,
            borderColor: palette.sand[300],
            transform: [{ translateY }],
            shadowColor: palette.void[500],
            shadowOpacity: 0.18,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: -8 },
          }}
        >
          <SafeAreaView>
            <View style={{ paddingHorizontal: theme.spacing[6], paddingTop: theme.spacing[4], paddingBottom: theme.spacing[6] }}>
              {/* Drag handle */}
              <View style={{ alignSelf: 'center', width: 44, height: 4, borderRadius: 2, backgroundColor: palette.sand[300], marginBottom: theme.spacing[4] }} />

              <Text variant="h3" tone="primary">{copy.title}</Text>
              <Text variant="body" tone="secondary" style={{ marginTop: theme.spacing[2], marginBottom: theme.spacing[5] }}>
                {copy.subtitle}
              </Text>

              <View style={{ gap: theme.spacing[2] }}>
                {OPTIONS.map((opt) => {
                  const active = draft === opt.id
                  return (
                    <Pressable
                      key={opt.id}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={opt[language].label}
                      onPress={() => setDraft(opt.id)}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: theme.spacing[3],
                        paddingVertical: theme.spacing[3],
                        paddingHorizontal: theme.spacing[4],
                        borderRadius: 18,
                        borderWidth: 1.5,
                        borderColor: active
                          ? palette.fuchsia[500]
                          : palette.sand[300],
                        backgroundColor: active
                          ? palette.petal[100]
                          : pressed
                            ? palette.petal[100]
                            : '#ffffff',
                      })}
                    >
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: active
                            ? palette.petal[200]
                            : palette.petal[100],
                        }}
                      >
                        <Icon
                          name={opt.icon}
                          size={18}
                          color={active ? palette.fuchsia[500] : palette.warmGray[500]}
                          strokeWidth={1.7}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyMed" style={{ color: palette.void[500] }}>
                          {opt[language].label}
                        </Text>
                        <Text variant="label" tone="secondary" style={{ marginTop: 2 }}>
                          {opt[language].description}
                        </Text>
                      </View>
                      {active ? (
                        <Icon name="Check" size={18} color={palette.fuchsia[500]} strokeWidth={2} />
                      ) : null}
                    </Pressable>
                  )
                })}
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={commit}
                disabled={!draft}
                style={({ pressed }) => ({
                  marginTop: theme.spacing[6],
                  alignSelf: 'stretch',
                  paddingVertical: theme.spacing[4],
                  borderRadius: theme.radii.pill,
                  alignItems: 'center',
                  backgroundColor: !draft
                    ? palette.petal[100]
                    : pressed
                      ? palette.fuchsia[600]
                      : palette.fuchsia[500],
                  opacity: !draft ? 0.6 : 1,
                })}
              >
                <Text variant="bodyMed" style={{ color: !draft ? palette.warmGray[300] : '#ffffff' }}>
                  {copy.cta}
                </Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  )
}
