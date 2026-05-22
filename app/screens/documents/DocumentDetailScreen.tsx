// Anoqi — DocumentDetailScreen.
//
// Opened when the user taps a row in the Documents list. Shows the saved
// (pseudonymised) document: name, type, date, the structured insight blocks
// (lab values / medications) and the cleaned text in full. Delete sits at
// the bottom — destructive, deliberate.

import React, { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  View,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'

import {
  BackHeader,
  Icon,
  type IconName,
  LangToggle,
  Text,
} from '../../components'
import { palette, useTheme } from '../../theme'
import { useOnboarding } from '../../context/OnboardingContext'
import {
  deleteDocument,
  loadDocument,
  type LocalDocument,
} from '../../lib/documentStore'

const TYPE_LABELS: Record<LocalDocument['documentType'], { fr: string; en: string; icon: IconName }> = {
  analyses:       { fr: 'Analyses',     en: 'Lab results',    icon: 'Activity'   },
  ordonnances:    { fr: 'Ordonnance',   en: 'Prescription',   icon: 'Pill'       },
  comptes_rendus: { fr: 'Compte-rendu', en: 'Medical report', icon: 'FileText'   },
  imagerie:       { fr: 'Imagerie',     en: 'Imaging',        icon: 'Scan'       },
  vaccins:        { fr: 'Vaccins',      en: 'Vaccines',       icon: 'Syringe'    },
  antecedents:    { fr: 'Antécédents',  en: 'History',        icon: 'BookOpen'   },
  autre:          { fr: 'Autre',        en: 'Other',          icon: 'FileText'   },
}

const COPY = {
  fr: {
    notFound:        'Document introuvable.',
    cleanedLabel:    'Texte nettoyé',
    labsLabel:       'Valeurs de laboratoire',
    medsLabel:       'Médicaments',
    delete:          'Supprimer le document',
    deletePrompt:    'Supprimer ce document ?',
    deleteCancel:    'Annuler',
    deleteConfirm:   'Supprimer',
    deleteFailure:   'Suppression impossible. Réessaie.',
    flagLow:         'bas',
    flagHigh:        'haut',
    flagCritical:    'critique',
    referenceLabel:  'Référence',
  },
  en: {
    notFound:        'Document not found.',
    cleanedLabel:    'Cleaned text',
    labsLabel:       'Lab values',
    medsLabel:       'Medications',
    delete:          'Delete document',
    deletePrompt:    'Delete this document?',
    deleteCancel:    'Cancel',
    deleteConfirm:   'Delete',
    deleteFailure:   'Could not delete. Try again.',
    flagLow:         'low',
    flagHigh:        'high',
    flagCritical:    'critical',
    referenceLabel:  'Reference',
  },
}

function formatDate(iso: string | null, language: 'fr' | 'en'): string {
  if (!iso) return ''
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-GB', {
    day:   'numeric',
    month: 'long',
    year:  'numeric',
  })
}

export function DocumentDetailScreen() {
  const theme = useTheme()
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { language } = useOnboarding()
  const copy = COPY[language]

  const docId: string | undefined = route.params?.id

  const [doc, setDoc]       = useState<LocalDocument | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!docId) {
      setLoaded(true)
      return
    }
    loadDocument(docId)
      .then(d => { if (!cancelled) { setDoc(d); setLoaded(true) } })
      .catch(err => {
        console.warn('[DocumentDetail] load failed:', err)
        if (!cancelled) setLoaded(true)
      })
    return () => { cancelled = true }
  }, [docId])

  const handleDelete = useCallback(() => {
    if (!doc) return
    Alert.alert(
      copy.deletePrompt,
      undefined,
      [
        { text: copy.deleteCancel, style: 'cancel' },
        {
          text:    copy.deleteConfirm,
          style:   'destructive',
          onPress: async () => {
            try {
              await deleteDocument(doc.id)
              navigation.goBack()
            } catch (err) {
              console.warn('[DocumentDetail] delete failed:', err)
              Alert.alert(copy.deleteFailure)
            }
          },
        },
      ],
    )
  }, [copy, doc, navigation])

  if (!loaded) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.canvas }}>
        <BackHeader showWordmark onBack={() => navigation.goBack()} rightSlot={<LangToggle />} />
      </SafeAreaView>
    )
  }

  if (!doc) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.canvas }}>
        <BackHeader showWordmark onBack={() => navigation.goBack()} rightSlot={<LangToggle />} />
        <View style={{ padding: theme.spacing[6] }}>
          <Text variant="body" tone="secondary">{copy.notFound}</Text>
        </View>
      </SafeAreaView>
    )
  }

  const meta = TYPE_LABELS[doc.documentType] ?? TYPE_LABELS.autre
  const dateLabel = formatDate(doc.documentDate ?? doc.createdAt, language)
  const title = doc.name && doc.name.trim().length > 0 ? doc.name : meta[language]

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.canvas }}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.bg.canvas} />

      <BackHeader showWordmark onBack={() => navigation.goBack()} rightSlot={<LangToggle />} />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing[6],
          paddingTop:        theme.spacing[5],
          paddingBottom:     120,
          gap:               theme.spacing[6],
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header block ─────────────────────────────────────── */}
        <View>
          <Text
            variant="eyebrow"
            style={{ color: palette.fuchsia[500], letterSpacing: 1.6, marginBottom: theme.spacing[2] }}
          >
            {meta[language].toUpperCase()}
          </Text>
          <Text variant="h2" tone="primary">
            {title}
          </Text>
          {!!dateLabel && (
            <Text variant="body" tone="secondary" style={{ marginTop: theme.spacing[2] }}>
              {dateLabel}
            </Text>
          )}
        </View>

        {/* ── Lab values ───────────────────────────────────────── */}
        {doc.labValues && doc.labValues.length > 0 ? (
          <Section title={copy.labsLabel}>
            <View style={{ gap: theme.spacing[2] }}>
              {doc.labValues.map((lv, i) => (
                <View
                  key={`${lv.name}-${i}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'baseline',
                    gap: theme.spacing[2],
                  }}
                >
                  <Text variant="bodyMed" tone="primary" style={{ flex: 1 }}>
                    {lv.name}
                  </Text>
                  <Text variant="bodyMed" style={{ color: flagColor(theme, lv.flag) }}>
                    {lv.value} {lv.unit}
                    {lv.flag ? `  ${flagGlyph(lv.flag)}` : ''}
                  </Text>
                  {lv.referenceRange ? (
                    <Text variant="caption" tone="tertiary">
                      {lv.referenceRange}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          </Section>
        ) : null}

        {/* ── Medications ──────────────────────────────────────── */}
        {doc.medications && doc.medications.length > 0 ? (
          <Section title={copy.medsLabel}>
            <View style={{ gap: theme.spacing[2] }}>
              {doc.medications.map((m, i) => (
                <View key={`${m.name}-${i}`}>
                  <Text variant="bodyMed" tone="primary">{m.name}</Text>
                  <Text variant="caption" tone="tertiary" style={{ marginTop: 2 }}>
                    {[m.dose, m.frequency, m.duration].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              ))}
            </View>
          </Section>
        ) : null}

        {/* ── Cleaned text ─────────────────────────────────────── */}
        <Section title={copy.cleanedLabel}>
          <Text
            variant="body"
            tone="primary"
            style={{ lineHeight: 24 }}
            selectable
          >
            {doc.cleanText}
          </Text>
        </Section>

        {/* ── Delete ───────────────────────────────────────────── */}
        <View style={{ marginTop: theme.spacing[4] }}>
          <Pressable
            onPress={handleDelete}
            accessibilityRole="button"
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: theme.spacing[2],
              paddingVertical: theme.spacing[4],
              borderRadius: theme.radii.pill,
              borderWidth: 1,
              borderColor: theme.colors.text.danger,
              backgroundColor: theme.colors.accent.dangerSurface,
              opacity: pressed ? 0.8 : 1,
              transform: pressed ? [{ scale: 0.985 }] : undefined,
            })}
          >
            <Icon
              name="Trash2"
              size={16}
              color={theme.colors.text.danger}
              strokeWidth={1.6}
            />
            <Text variant="bodyMed" style={{ color: theme.colors.text.danger }}>
              {copy.delete}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

// ─────────────────────────────────────────────────────────────
// Section — eyebrow + glass card body
// ─────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme()
  return (
    <View>
      <Text
        variant="eyebrow"
        style={{
          color: theme.colors.text.tertiary,
          letterSpacing: 1.4,
          marginBottom: theme.spacing[3],
        }}
      >
        {title.toUpperCase()}
      </Text>
      <View
        style={{
          backgroundColor: '#ffffff',
          borderWidth: 1,
          borderColor: palette.sand[300],
          borderRadius: theme.radii.xl,
          padding: theme.spacing[5],
        }}
      >
        {children}
      </View>
    </View>
  )
}

function flagColor(
  theme: ReturnType<typeof useTheme>,
  flag: 'low' | 'high' | 'critical' | null,
): string {
  // Highlight abnormal values in the danger tone; everything else stays
  // primary so the user's eye lands on the flagged rows first.
  if (flag === 'low' || flag === 'high' || flag === 'critical') return theme.colors.text.danger
  return theme.colors.text.primary
}

function flagGlyph(flag: 'low' | 'high' | 'critical' | null): string {
  if (flag === 'high') return '↑'
  if (flag === 'critical') return '!'
  if (flag === 'low') return '↓'
  return ''
}
