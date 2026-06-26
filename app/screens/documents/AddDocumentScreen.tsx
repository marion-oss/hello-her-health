// Anoqi — AddDocumentScreen.
//
// Single-stage flow now:
//   1. On mount, take a pending File (set by a drag-and-drop on Documents
//      / Chat) OR open the native file picker.
//   2. Extract text (PDF or plain-text on device — pseudonymisation happens
//      after, also on device).
//   3. Show the redaction preview with [NOM] / [TELEPHONE] / … chips so the
//      user sees what was stripped before saving.
//   4. Save locally + fire-and-forget upload if the user is signed in.

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  StatusBar,
  View,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'

import {
  BackHeader,
  Button,
  Icon,
  LangToggle,
  Text,
} from '../../components'
import { palette, useTheme } from '../../theme'
import { useOnboarding } from '../../context/OnboardingContext'
import {
  loadDocument,
  processText,
  saveDocument,
  uploadDocument,
  type ProcessResult,
} from '../../lib/documentStore'
import { extractTextFromFile, type ImportError } from '../../lib/documentImport'
import { takePendingFile } from '../../lib/pendingFile'
import { supabase } from '../../lib/supabase'

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1)

const COPY = {
  fr: {
    eyebrowImporting: 'IMPORTATION',
    titleImporting:   'Lecture du document…',
    bodyImporting:    'Anoqi extrait le texte sur ton téléphone. Rien n\'est envoyé.',

    eyebrowPreview:  'APERÇU',
    titlePreview:    'Voici ce qu\'anoqi a retiré.',
    bodySingular:    'information personnelle retirée :',
    bodyPlural:      'informations personnelles retirées :',
    bodyNone:        'Rien à retirer — ton document est déjà propre.',
    cleanedLabel:    'Texte nettoyé',
    save:            'Enregistrer',
    cancel:          'Annuler',
    saving:          'Enregistrement…',

    pickAnother:     'Choisir un autre document',
    errorUnsupported:'Format pas encore supporté. Utilise un PDF ou un fichier texte.',
    errorTooLarge:   'Fichier trop volumineux. Maximum 10 Mo.',
    errorEmpty:      'Ce document est vide.',
    errorParse:      'Impossible de lire ce document. Réessaie avec un autre fichier.',
    errorGeneric:    'Impossible d\'enregistrer ce document. Réessaie.',
  },
  en: {
    eyebrowImporting: 'IMPORTING',
    titleImporting:   'Reading the document…',
    bodyImporting:    'Anoqi extracts the text on your phone. Nothing is sent.',

    eyebrowPreview:  'PREVIEW',
    titlePreview:    'Here\'s what Anoqi removed.',
    bodySingular:    'piece of personal information removed:',
    bodyPlural:      'pieces of personal information removed:',
    bodyNone:        'Nothing to remove — your document is already clean.',
    cleanedLabel:    'Cleaned text',
    save:            'Save',
    cancel:          'Cancel',
    saving:          'Saving…',

    pickAnother:     'Choose another document',
    errorUnsupported:'Format not supported yet. Use a PDF or a text file.',
    errorTooLarge:   'File too large. Maximum 10 MB.',
    errorEmpty:      'This document is empty.',
    errorParse:      'Could not read this document. Try another file.',
    errorGeneric:    'Could not save this document. Try again.',
  },
}

const PLACEHOLDER_LABEL: Record<string, { fr: string; en: string }> = {
  '[NOM]':              { fr: 'Nom',         en: 'Name'       },
  '[PRENOM]':           { fr: 'Prénom',      en: 'First name' },
  '[TELEPHONE]':        { fr: 'Téléphone',   en: 'Phone'      },
  '[EMAIL]':            { fr: 'E-mail',      en: 'Email'      },
  '[NIR]':              { fr: 'Sécu',        en: 'SSN'        },
  '[NHS]':              { fr: 'NHS',         en: 'NHS'        },
  '[ADRESSE]':          { fr: 'Adresse',     en: 'Address'    },
  '[CODE_POSTAL]':      { fr: 'Code postal', en: 'Postcode'   },
  '[DATE_NAISSANCE]':   { fr: 'Date naiss.', en: 'Birth date' },
  '[MEDECIN]':          { fr: 'Médecin',     en: 'Doctor'     },
  '[NUM_PRATICIEN]':    { fr: 'RPPS',        en: 'Practitioner #' },
}

const PLACEHOLDER_REGEX =
  /\[(NOM|PRENOM|TELEPHONE|EMAIL|NIR|NHS|ADRESSE|CODE_POSTAL|DATE_NAISSANCE|MEDECIN|NUM_PRATICIEN)\]/g

type Phase = 'importing' | 'preview' | 'error'

export function AddDocumentScreen() {
  const theme = useTheme()
  const navigation = useNavigation<any>()
  const { language } = useOnboarding()
  const copy = COPY[language]

  const [phase,    setPhase]    = useState<Phase>('importing')
  const [filename, setFilename] = useState<string | null>(null)
  const [result,   setResult]   = useState<ProcessResult | null>(null)
  const [error,    setError]    = useState<string | null>(null)
  const [saving,   setSaving]   = useState(false)

  // The HTML file input used on web. We never render it; clicking the
  // "choose another" button programmatically triggers it.
  const webInputRef = useRef<HTMLInputElement | null>(null)

  // Mount: take a pending file if a drop zone handed one off, else
  // immediately open the picker.
  useEffect(() => {
    const pending = takePendingFile()
    if (pending) {
      void handleFile(pending)
    } else {
      void openPicker()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openPicker = async () => {
    if (Platform.OS !== 'web') {
      // Native picker would go here (expo-document-picker). For the
      // current web-first build we just navigate back.
      Alert.alert(copy.errorUnsupported)
      navigation.goBack()
      return
    }

    // Reuse the hidden input if we already created one; otherwise build it.
    let input = webInputRef.current
    if (!input) {
      input = document.createElement('input')
      input.type = 'file'
      input.accept = '.pdf,application/pdf,.txt,.md,text/plain'
      input.style.display = 'none'
      document.body.appendChild(input)
      webInputRef.current = input
    }

    return new Promise<void>((resolve) => {
      const onChange = () => {
        input!.removeEventListener('change', onChange)
        const f = input!.files?.[0]
        // Reset value so picking the same file twice still triggers change.
        input!.value = ''
        if (f) void handleFile(f).then(resolve)
        else {
          // User cancelled — leave the modal.
          navigation.goBack()
          resolve()
        }
      }
      input!.addEventListener('change', onChange)
      input!.click()
    })
  }

  const handleFile = async (file: File) => {
    setFilename(file.name)
    setPhase('importing')
    setError(null)

    try {
      const rawText = await extractTextFromFile(file)
      // Default name = filename minus extension, lightly tidied. The user
      // can rename later (detail screen). We pass it through processText
      // so it lands on LocalDocument before save.
      const niceName = file.name.replace(/\.[^.]+$/, '').replace(/[_\-]+/g, ' ').trim() || null
      const r = processText(rawText, { researchConsent: false, name: niceName })
      setResult(r)
      setPhase('preview')
    } catch (err) {
      const importErr = err as ImportError
      let msg = copy.errorGeneric
      switch (importErr?.kind) {
        case 'unsupported_type':
          msg = copy.errorUnsupported; break
        case 'too_large':
          msg = copy.errorTooLarge; break
        case 'empty':
          msg = copy.errorEmpty; break
        case 'parse_failed':
          msg = copy.errorParse
          console.warn('[AddDocument] parse failed:', importErr.cause)
          break
      }
      setError(msg)
      setPhase('error')
    }
  }

  const handleSave = async () => {
    if (!result || saving) return
    setSaving(true)
    try {
      await saveDocument(result.document)
      void tryUploadInBackground(result.document.id)
      navigation.goBack()
    } catch (err) {
      console.warn('[AddDocument] save failed:', err)
      Alert.alert(copy.errorGeneric)
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.canvas }}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.bg.canvas} />

      <BackHeader
        showWordmark
        onBack={() => navigation.goBack()}
        rightSlot={<LangToggle />}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: theme.spacing[6],
            paddingTop: theme.spacing[5],
            paddingBottom: theme.spacing[6],
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {phase === 'importing' && (
            <ImportingStage copy={copy} filename={filename} />
          )}
          {phase === 'error' && (
            <ErrorStage message={error ?? copy.errorGeneric} />
          )}
          {phase === 'preview' && result && (
            <PreviewStage
              copy={copy}
              language={language}
              result={result}
              filename={filename}
            />
          )}
        </ScrollView>

        <View
          style={{
            paddingHorizontal: theme.spacing[6],
            paddingTop: theme.spacing[3],
            paddingBottom: 100, // clears the floating LiquidTabBar
            borderTopWidth: 1,
            borderTopColor: theme.colors.border.subtle,
            backgroundColor: theme.colors.bg.canvas,
            gap: theme.spacing[2],
          }}
        >
          {phase === 'preview' && result ? (
            <View style={{ flexDirection: 'row', gap: theme.spacing[2] }}>
              <Button
                label={copy.cancel}
                variant="secondary"
                size="lg"
                onPress={() => navigation.goBack()}
                disabled={saving}
              />
              <View style={{ flex: 1 }}>
                <Button
                  label={saving ? copy.saving : copy.save}
                  variant="primary"
                  size="lg"
                  fullWidth
                  onPress={handleSave}
                  disabled={saving}
                  loading={saving}
                />
              </View>
            </View>
          ) : phase === 'error' ? (
            <Button
              label={copy.pickAnother}
              variant="primary"
              size="lg"
              fullWidth
              onPress={() => openPicker()}
            />
          ) : null /* importing: no footer button */}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ─────────────────────────────────────────────────────────────
async function tryUploadInBackground(docId: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return

    const doc = await loadDocument(docId)
    if (!doc) return

    const apiUrl = (process.env.EXPO_PUBLIC_ANOQI_API_URL ?? '').replace(/\/+$/, '')
    if (!apiUrl) return

    await uploadDocument(doc, {
      apiUrl,
      accessToken: session.access_token,
      birthYear:   null,
      country:     null,
    })
  } catch (err) {
    console.warn('[AddDocument] background upload failed:', err)
  }
}

// ─────────────────────────────────────────────────────────────
// IMPORTING — quiet loading state while we extract + pseudonymise
// ─────────────────────────────────────────────────────────────
function ImportingStage({
  copy, filename,
}: {
  copy: typeof COPY['fr']
  filename: string | null
}) {
  const theme = useTheme()
  return (
    <View>
      <Text
        variant="eyebrow"
        style={{ color: palette.fuchsia[500], letterSpacing: 1.6, marginBottom: theme.spacing[2] }}
      >
        {copy.eyebrowImporting}
      </Text>
      <Text variant="h2" tone="primary">
        {copy.titleImporting}
      </Text>
      <Text variant="body" tone="secondary" style={{ marginTop: theme.spacing[3] }}>
        {copy.bodyImporting}
      </Text>

      {filename ? (
        <View
          style={{
            marginTop: theme.spacing[6],
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing[3],
            paddingHorizontal: theme.spacing[4],
            paddingVertical: theme.spacing[3],
            backgroundColor: theme.colors.bg.surface,
            borderRadius: theme.radii.lg,
            borderWidth: 1,
            borderColor: theme.colors.border.subtle,
          }}
        >
          <Icon name="FileText" size={18} color={theme.colors.text.accent} strokeWidth={1.6} />
          <Text variant="bodyMed" tone="primary" style={{ flex: 1 }} numberOfLines={1}>
            {filename}
          </Text>
          <ActivityIndicator size="small" color={theme.colors.text.accent} />
        </View>
      ) : null}
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// ERROR — user-visible message with a "choose another" footer CTA
// ─────────────────────────────────────────────────────────────
function ErrorStage({ message }: { message: string }) {
  const theme = useTheme()
  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing[3],
          paddingHorizontal: theme.spacing[4],
          paddingVertical: theme.spacing[4],
          backgroundColor: theme.colors.bg.surface,
          borderRadius: theme.radii.lg,
          borderWidth: 1,
          borderColor: theme.colors.border.subtle,
        }}
      >
        <Icon
          name="AlertCircle"
          size={20}
          color={theme.colors.text.danger}
          strokeWidth={1.6}
        />
        <Text variant="body" tone="primary" style={{ flex: 1 }}>
          {message}
        </Text>
      </View>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// PREVIEW — redaction reveal
// ─────────────────────────────────────────────────────────────
function PreviewStage({
  copy, language, result, filename,
}: {
  copy: typeof COPY['fr']
  language: 'fr' | 'en'
  result: ProcessResult
  filename: string | null
}) {
  const theme = useTheme()
  const count = result.replacementCount

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    let m: RegExpExecArray | null
    PLACEHOLDER_REGEX.lastIndex = 0
    while ((m = PLACEHOLDER_REGEX.exec(result.document.cleanText)) !== null) {
      const key = `[${m[1]}]`
      counts[key] = (counts[key] ?? 0) + 1
    }
    return counts
  }, [result])

  const pillKeys = Object.keys(typeCounts)

  return (
    <View>
      <Text
        variant="eyebrow"
        style={{ color: palette.fuchsia[500], letterSpacing: 1.6, marginBottom: theme.spacing[2] }}
      >
        {copy.eyebrowPreview}
      </Text>
      <Text variant="h2" tone="primary">
        {copy.titlePreview}
      </Text>

      {filename ? (
        <Text variant="caption" tone="tertiary" style={{ marginTop: theme.spacing[2] }}>
          {filename.toUpperCase()}
        </Text>
      ) : null}

      {count === 0 ? (
        <Text variant="body" tone="secondary" style={{ marginTop: theme.spacing[3] }}>
          {copy.bodyNone}
        </Text>
      ) : (
        <>
          <Text variant="body" tone="secondary" style={{ marginTop: theme.spacing[3] }}>
            <Text variant="body" style={{ color: theme.colors.accent.primary }}>
              {count}
            </Text>
            {' '}
            {count === 1 ? copy.bodySingular : copy.bodyPlural}
          </Text>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: theme.spacing[2],
              marginTop: theme.spacing[4],
            }}
          >
            {pillKeys.map((key, i) => (
              <TypePill
                key={key}
                label={PLACEHOLDER_LABEL[key]?.[language] ?? key.replace(/[\[\]]/g, '')}
                count={typeCounts[key]}
                index={i}
              />
            ))}
          </View>
        </>
      )}

      <Text
        variant="eyebrow"
        style={{
          color: theme.colors.text.tertiary,
          letterSpacing: 1.4,
          marginTop: theme.spacing[8],
          marginBottom: theme.spacing[3],
        }}
      >
        {copy.cleanedLabel.toUpperCase()}
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
        <RichRedactedText
          text={result.document.cleanText}
          language={language}
          color={theme.colors.text.primary}
          chipColor={theme.colors.text.accent}
          chipBg={palette.petal[100]}
        />
      </View>
    </View>
  )
}

function TypePill({ label, count, index }: { label: string; count: number; index: number }) {
  const theme = useTheme()
  const enter = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 260,
      delay: 120 + index * 40,
      easing: EASE_OUT,
      useNativeDriver: true,
    }).start()
  }, [enter, index])

  return (
    <Animated.View
      style={{
        opacity: enter,
        transform: [
          { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
          { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) },
        ],
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[2],
        backgroundColor: palette.petal[100],
        borderRadius: theme.radii.pill,
        paddingVertical: theme.spacing[2],
        paddingHorizontal: theme.spacing[4],
        borderWidth: 1,
        borderColor: palette.sand[300],
      }}
    >
      <Text variant="label" style={{ color: theme.colors.text.accent }}>
        {label}
      </Text>
      {count > 1 ? (
        <Text variant="caption" style={{ color: theme.colors.text.accent, opacity: 0.7 }}>
          × {count}
        </Text>
      ) : null}
    </Animated.View>
  )
}

function RichRedactedText({
  text, language, color, chipColor, chipBg,
}: {
  text: string
  language: 'fr' | 'en'
  color: string
  chipColor: string
  chipBg: string
}) {
  const segments: Array<{ kind: 'raw' | 'pill'; value: string }> = []
  let last = 0
  let m: RegExpExecArray | null
  PLACEHOLDER_REGEX.lastIndex = 0
  while ((m = PLACEHOLDER_REGEX.exec(text)) !== null) {
    if (m.index > last) segments.push({ kind: 'raw', value: text.slice(last, m.index) })
    const key = `[${m[1]}]`
    segments.push({ kind: 'pill', value: PLACEHOLDER_LABEL[key]?.[language] ?? m[1] })
    last = m.index + m[0].length
  }
  if (last < text.length) segments.push({ kind: 'raw', value: text.slice(last) })

  return (
    <Text variant="body" style={{ color, lineHeight: 24 }} selectable>
      {segments.map((seg, i) =>
        seg.kind === 'raw' ? (
          <Text key={i} variant="body" style={{ color }}>
            {seg.value}
          </Text>
        ) : (
          <Text
            key={i}
            variant="label"
            style={{
              color: chipColor,
              backgroundColor: chipBg,
              fontFamily: 'Inter-Medium',
            }}
          >
            {`  ${seg.value}  `}
          </Text>
        ),
      )}
    </Text>
  )
}
