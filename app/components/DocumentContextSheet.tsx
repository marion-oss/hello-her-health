// Anoqi — DocumentContextSheet.
//
// Bottom-up sheet for picking which uploaded documents Anoqi can see in
// the current chat. Opened from the "N document in context · manage" pill
// in ChatScreen. Multi-select; each toggle persists immediately so the
// pill count and the prompt content stay coherent across reloads.
//
// Mirrors GoalSheet's animation + responsive width so the visual identity
// stays consistent with the goal picker. Multi-select replaces GoalSheet's
// single-select "draft" pattern: there is no Save CTA, only a Done button.

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
import type { Language } from '../context/OnboardingContext'
import type { DocumentIndexEntry } from '../lib/documentStore'
import { Icon, type IconName } from './Icon'
import { Text } from './Text'

const COPY = {
  fr: {
    title:        'Documents en contexte',
    subtitle:     'Choisis ce qu\'Anoqi peut consulter pour répondre.',
    emptyTitle:   'Aucun document.',
    emptyBody:    'Ajoute un compte-rendu ou un résultat pour qu\'Anoqi puisse t\'en parler.',
    add:          'Ajouter un document',
    done:         'Terminé',
    on:           'Activé',
    off:          'Désactivé',
  },
  en: {
    title:        'Documents in context',
    subtitle:     'Pick what Anoqi can read when answering.',
    emptyTitle:   'No documents yet.',
    emptyBody:    'Add a report or result so Anoqi can talk you through it.',
    add:          'Add a document',
    done:         'Done',
    on:           'On',
    off:          'Off',
  },
} as const

const TYPE_LABELS: Record<DocumentIndexEntry['documentType'], { fr: string; en: string; icon: IconName }> = {
  analyses:       { fr: 'Analyses',     en: 'Lab results',    icon: 'Activity'   },
  ordonnances:    { fr: 'Ordonnance',   en: 'Prescription',   icon: 'Pill'       },
  comptes_rendus: { fr: 'Compte-rendu', en: 'Medical report', icon: 'FileText'   },
  imagerie:       { fr: 'Imagerie',     en: 'Imaging',        icon: 'Scan'       },
  vaccins:        { fr: 'Vaccins',      en: 'Vaccines',       icon: 'Syringe'    },
  antecedents:    { fr: 'Antécédents',  en: 'History',        icon: 'BookOpen'   },
  autre:          { fr: 'Autre',        en: 'Other',          icon: 'FileText'   },
}

function formatDate(iso: string | null, language: Language): string {
  if (!iso) return ''
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-GB', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  })
}

type Props = {
  visible:    boolean
  language:   Language
  documents:  DocumentIndexEntry[]
  onToggle:   (id: string, next: boolean) => void
  onAdd:      () => void
  onClose:    () => void
}

export function DocumentContextSheet({
  visible, language, documents, onToggle, onAdd, onClose,
}: Props) {
  const theme = useTheme()
  const { height, width } = useWindowDimensions()
  const copy = COPY[language]

  // Pin to ~30% width on desktop so it reads like a focused mobile sheet.
  // Phones still get edge-to-edge.
  const isWide = width >= 800
  const sideInset = isWide ? `${(100 - 30) / 2}%` as `${number}%` : 0

  // Backdrop + sheet animate together so the dismiss feels coherent.
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

  // Newest first — same order as DocumentsListScreen.
  const sorted = [...documents].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

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
            { backgroundColor: 'rgba(0,0,0,0.55)', opacity: backdropOpacity },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>

        <Animated.View
          style={[
            {
              position: 'absolute',
              left: sideInset,
              right: sideInset,
              bottom: 0,
              maxHeight: height * 0.85,
              backgroundColor: theme.colors.bg.surface,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderBottomLeftRadius: isWide ? 28 : 0,
              borderBottomRightRadius: isWide ? 28 : 0,
              marginBottom: isWide ? 24 : 0,
              borderTopWidth: 1,
              borderColor: 'rgba(255, 245, 238, 0.08)',
              transform: [{ translateY }],
              shadowColor: '#000',
              shadowOpacity: 0.4,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: -8 },
            },
            Platform.OS === 'web'
              ? ({ backdropFilter: 'blur(24px) saturate(140%)', WebkitBackdropFilter: 'blur(24px) saturate(140%)' } as any)
              : null,
          ]}
        >
          <SafeAreaView>
            <View style={{ paddingHorizontal: theme.spacing[6], paddingTop: theme.spacing[4], paddingBottom: theme.spacing[6] }}>
              {/* Drag handle */}
              <View style={{ alignSelf: 'center', width: 44, height: 4, borderRadius: 2, backgroundColor: 'rgba(255, 245, 238, 0.18)', marginBottom: theme.spacing[4] }} />

              <Text variant="h3Italic" tone="primary">{copy.title}</Text>
              <Text variant="body" tone="secondary" style={{ marginTop: theme.spacing[2], marginBottom: theme.spacing[5] }}>
                {copy.subtitle}
              </Text>

              {sorted.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: theme.spacing[6], gap: theme.spacing[3] }}>
                  <View
                    style={{
                      width: 56, height: 56, borderRadius: 28,
                      backgroundColor: 'rgba(255, 245, 238, 0.05)',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Icon name="FileText" size={22} color={palette.warmWhite[300]} strokeWidth={1.5} />
                  </View>
                  <Text variant="bodyMed" tone="primary" align="center">{copy.emptyTitle}</Text>
                  <Text variant="label" tone="secondary" align="center" style={{ maxWidth: 320 }}>
                    {copy.emptyBody}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={onAdd}
                    style={({ pressed }) => ({
                      marginTop: theme.spacing[2],
                      paddingHorizontal: theme.spacing[5],
                      paddingVertical: theme.spacing[3],
                      borderRadius: theme.radii.pill,
                      backgroundColor: pressed ? palette.fuchsia[600] : palette.fuchsia[500],
                    })}
                  >
                    <Text variant="bodyMed" style={{ color: palette.warmWhite[100] }}>{copy.add}</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={{ gap: theme.spacing[2] }}>
                  {sorted.map((entry) => {
                    const meta = TYPE_LABELS[entry.documentType] ?? TYPE_LABELS.autre
                    const date = formatDate(entry.documentDate ?? entry.createdAt, language)
                    const active = entry.inContext
                    const label = entry.name && entry.name.trim().length > 0 ? entry.name : meta[language]
                    return (
                      <Pressable
                        key={entry.id}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: active }}
                        accessibilityLabel={`${label} — ${active ? copy.on : copy.off}`}
                        onPress={() => onToggle(entry.id, !active)}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: theme.spacing[3],
                          paddingVertical: theme.spacing[3],
                          paddingHorizontal: theme.spacing[4],
                          borderRadius: 18,
                          borderWidth: 1,
                          borderColor: active
                            ? 'rgba(196, 128, 106, 0.42)'
                            : 'rgba(255, 245, 238, 0.08)',
                          backgroundColor: active
                            ? 'rgba(196, 128, 106, 0.14)'
                            : pressed
                              ? 'rgba(255, 245, 238, 0.06)'
                              : 'transparent',
                        })}
                      >
                        <View
                          style={{
                            width: 36, height: 36, borderRadius: 18,
                            alignItems: 'center', justifyContent: 'center',
                            backgroundColor: active
                              ? 'rgba(196, 128, 106, 0.22)'
                              : 'rgba(255, 245, 238, 0.05)',
                          }}
                        >
                          <Icon
                            name={meta.icon}
                            size={18}
                            color={active ? palette.ember[200] : palette.warmWhite[200]}
                            strokeWidth={1.7}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            variant="bodyMed"
                            numberOfLines={1}
                            style={{ color: active ? palette.warmWhite[100] : palette.warmWhite[200] }}
                          >
                            {label}
                          </Text>
                          <Text variant="label" tone="secondary" style={{ marginTop: 2 }} numberOfLines={1}>
                            {[meta[language], date].filter(Boolean).join(' · ')}
                          </Text>
                        </View>
                        {/* Right-side checkbox — filled circle with check when on,
                            hollow ring when off. */}
                        <View
                          style={{
                            width: 22, height: 22, borderRadius: 11,
                            alignItems: 'center', justifyContent: 'center',
                            borderWidth: active ? 0 : 1.5,
                            borderColor: 'rgba(255, 245, 238, 0.22)',
                            backgroundColor: active ? palette.ember[300] : 'transparent',
                          }}
                        >
                          {active ? (
                            <Icon name="Check" size={14} color={palette.warmWhite[100]} strokeWidth={2.4} />
                          ) : null}
                        </View>
                      </Pressable>
                    )
                  })}
                </View>
              )}

              <Pressable
                accessibilityRole="button"
                onPress={onClose}
                style={({ pressed }) => ({
                  marginTop: theme.spacing[6],
                  alignSelf: 'stretch',
                  paddingVertical: theme.spacing[4],
                  borderRadius: theme.radii.pill,
                  alignItems: 'center',
                  backgroundColor: pressed ? palette.fuchsia[600] : palette.fuchsia[500],
                })}
              >
                <Text variant="bodyMed" style={{ color: palette.warmWhite[100] }}>
                  {copy.done}
                </Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  )
}
