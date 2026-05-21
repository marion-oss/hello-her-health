// Anoqi — DocumentsListScreen (v2.2 light register).
//
// Lists the user's on-device documents. Empty state is the trust pitch
// (pseudonymisation lives on device). Each row reads the LocalDocument
// so we can surface a structured insight ("4 valeurs · ferritine ↓")
// instead of a generic "saved at" timestamp.
//
// v2.2: wraps itself in <ThemeProvider mode="light"> so theme-aware
// descendants pick up the v2.2 tokens. White canvas, apricot bloom inner-
// screen intensity, white+Sand document rows, fuchsia accents.

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  FlatList,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  View,
  useWindowDimensions,
} from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import Reanimated, {
  Easing as ReanimatedEasing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg'

import {
  BackHeader,
  Button,
  Icon,
  type IconName,
  Text,
} from '../../components'
import { ThemeProvider, palette, useTheme } from '../../theme'
import { useOnboarding } from '../../context/OnboardingContext'
import {
  deleteDocument,
  listDocuments,
  loadDocument,
  type DocumentIndexEntry,
  type LocalDocument,
} from '../../lib/documentStore'
import { setPendingFile } from '../../lib/pendingFile'

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1)

const COPY = {
  fr: {
    title: 'Mes documents',
    subtitleNone: 'Privés sur ton appareil.',
    subtitleOne: '1 document · privé sur ton appareil',
    subtitleMany: (n: number) => `${n} documents · privés sur ton appareil`,
    add: 'Ajouter un document',
    emptyTitle: 'Rien pour l\'instant.',
    emptyBody:
      "Colle un compte-rendu, une ordonnance ou un résultat d'analyse. Anoqi retirera tes informations personnelles avant que rien ne quitte ton téléphone.",
    swipeHint: 'Maintiens pour supprimer',
    dropOverlayTitle: 'Dépose ton document.',
    dropOverlayBody:  'PDF ou texte · nettoyé sur ton appareil avant d\'être enregistré.',
  },
  en: {
    title: 'My documents',
    subtitleNone: 'Private to your device.',
    subtitleOne: '1 document · private to your device',
    subtitleMany: (n: number) => `${n} documents · private to your device`,
    add: 'Add a document',
    emptyTitle: 'Nothing here yet.',
    emptyBody:
      'Paste a medical report, prescription or lab result. Anoqi will strip your personal information before anything leaves your phone.',
    swipeHint: 'Long-press to delete',
    dropOverlayTitle: 'Drop your document.',
    dropOverlayBody:  'PDF or text · cleaned on your device before anything is saved.',
  },
}

const TYPE_LABELS: Record<DocumentIndexEntry['documentType'], { fr: string; en: string; icon: IconName }> = {
  analyses:       { fr: 'Analyses',     en: 'Lab results',    icon: 'Activity'   },
  ordonnances:    { fr: 'Ordonnance',   en: 'Prescription',   icon: 'Pill'       },
  comptes_rendus: { fr: 'Compte-rendu', en: 'Medical report', icon: 'FileText'   },
  imagerie:       { fr: 'Imagerie',     en: 'Imaging',        icon: 'Scan'       },
  vaccins:        { fr: 'Vaccins',      en: 'Vaccines',       icon: 'Syringe'    },
  antecedents:    { fr: 'Antécédents',  en: 'History',        icon: 'BookOpen'   },
  autre:          { fr: 'Autre',        en: 'Other',          icon: 'FileText'   },
}

function formatDate(iso: string | null, language: 'fr' | 'en'): string {
  if (!iso) return ''
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function buildInsight(doc: LocalDocument, language: 'fr' | 'en'): string {
  if (doc.documentType === 'analyses' && doc.labValues && doc.labValues.length > 0) {
    const flagged = doc.labValues.filter(
      (lv) => lv.flag === 'low' || lv.flag === 'high' || lv.flag === 'critical',
    )
    const count = doc.labValues.length
    const valueLabel =
      language === 'fr' ? `${count} valeur${count > 1 ? 's' : ''}` : `${count} value${count > 1 ? 's' : ''}`
    if (flagged.length > 0) {
      const first = flagged[0]
      const arrow = first.flag === 'high' ? '↑' : first.flag === 'critical' ? '!' : '↓'
      return `${valueLabel} · ${first.name.toLowerCase()} ${arrow}`
    }
    return valueLabel
  }
  if (doc.documentType === 'ordonnances' && doc.medications && doc.medications.length > 0) {
    const n = doc.medications.length
    return language === 'fr' ? `${n} médicament${n > 1 ? 's' : ''}` : `${n} medication${n > 1 ? 's' : ''}`
  }
  return ''
}

type RowProps = {
  entry: DocumentIndexEntry
  doc: LocalDocument | null
  index: number
  language: 'fr' | 'en'
  onPress: () => void
  onLongPress: () => void
}

function DocumentRow({ entry, doc, index, language, onPress, onLongPress }: RowProps) {
  const theme = useTheme()
  const enter = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 280,
      delay: Math.min(index, 6) * 50,
      easing: EASE_OUT,
      useNativeDriver: true,
    }).start()
  }, [enter, index])

  const meta = TYPE_LABELS[entry.documentType] ?? TYPE_LABELS.autre
  const date = formatDate(entry.documentDate ?? entry.createdAt, language)
  const insight = doc ? buildInsight(doc, language) : ''

  return (
    <Animated.View
      style={{
        opacity: enter,
        transform: [
          { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
        ],
      }}
    >
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityRole="button"
        accessibilityLabel={`${entry.name ?? meta[language]}, ${date}`}
        style={({ pressed }) => ({
          transform: pressed ? [{ scale: 0.985 }] : undefined,
        })}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing[4],
            paddingVertical: theme.spacing[4],
            paddingHorizontal: theme.spacing[5],
            backgroundColor: '#ffffff',
            borderWidth: 1,
            borderColor: palette.sand[300],
            borderRadius: theme.radii.xl,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: palette.petal[100],
            }}
          >
            <Icon name={meta.icon} size={18} color={palette.fuchsia[500]} strokeWidth={1.6} />
          </View>

          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="bodyMed" tone="primary" numberOfLines={1}>
              {entry.name && entry.name.trim().length > 0 ? entry.name : meta[language]}
            </Text>
            <Text variant="caption" tone="tertiary">
              {[meta[language].toUpperCase(), date.toUpperCase()].filter(Boolean).join(' · ')}
            </Text>
            {!!insight && (
              <Text variant="label" tone="accent" style={{ marginTop: 4 }}>
                {insight}
              </Text>
            )}
          </View>

          <Icon name="ChevronRight" size={18} color={theme.colors.text.tertiary} strokeWidth={1.6} />
        </View>
      </Pressable>
    </Animated.View>
  )
}

// ─────────────────────────────────────────────────────────────
// DocumentsListScreen
// ─────────────────────────────────────────────────────────────
export function DocumentsListScreen() {
  return (
    <ThemeProvider mode="light">
      <DocumentsListScreenInner />
    </ThemeProvider>
  )
}

function DocumentsListScreenInner() {
  const theme = useTheme()
  const navigation = useNavigation<any>()
  const { language } = useOnboarding()
  const copy = COPY[language]
  const { width } = useWindowDimensions()
  const isCompact = width < 480
  const bloomSize = isCompact ? 320 : 420

  const [entries, setEntries] = useState<DocumentIndexEntry[]>([])
  const [docs, setDocs] = useState<Record<string, LocalDocument | null>>({})
  const [loaded, setLoaded] = useState(false)

  // Drag-and-drop visual state. Web-only — RN native has no equivalent.
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (Platform.OS !== 'web') return

    let depth = 0 // nested drag enters/leaves on children fire repeatedly
    const onDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes('Files')) return
      e.preventDefault()
      depth++
      setIsDragging(true)
    }
    const onDragOver = (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes('Files')) return
      e.preventDefault()
      e.dataTransfer!.dropEffect = 'copy'
    }
    const onDragLeave = (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes('Files')) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setIsDragging(false)
    }
    const onDrop = (e: DragEvent) => {
      if (!e.dataTransfer?.files?.length) return
      e.preventDefault()
      depth = 0
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      setPendingFile(file)
      navigation.navigate('AddDocument')
    }

    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragover',  onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop',      onDrop)
    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragover',  onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop',      onDrop)
    }
  }, [navigation])

  const refresh = useCallback(async () => {
    try {
      const idx = await listDocuments()
      setEntries(idx)
      const detail = await Promise.all(
        idx.map(async (e) => [e.id, await loadDocument(e.id)] as const),
      )
      setDocs(Object.fromEntries(detail))
    } catch (err) {
      console.warn('[DocumentsList] refresh failed:', err)
    } finally {
      setLoaded(true)
    }
  }, [])

  useFocusEffect(useCallback(() => { refresh() }, [refresh]))

  const subtitle =
    entries.length === 0
      ? copy.subtitleNone
      : entries.length === 1
        ? copy.subtitleOne
        : copy.subtitleMany(entries.length)

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteDocument(id)
      await refresh()
    } catch (err) {
      console.warn('[DocumentsList] delete failed:', err)
    }
  }, [refresh])

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg.canvas }}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.bg.canvas} />

      <Bloom size={bloomSize} intensity={0.6} />

      <SafeAreaView style={{ flex: 1 }}>
        <BackHeader showWordmark />

      <View
        style={{
          paddingHorizontal: theme.spacing[6],
          paddingTop: theme.spacing[6],
          paddingBottom: theme.spacing[4],
        }}
      >
        <Text
          variant="eyebrow"
          style={{ color: palette.fuchsia[500], letterSpacing: 1.6, marginBottom: theme.spacing[2] }}
        >
          DOCUMENTS
        </Text>
        <Text variant="h2" tone="primary">
          {copy.title}
        </Text>
        <Text
          variant="body"
          tone="secondary"
          style={{ marginTop: theme.spacing[2] }}
        >
          {subtitle}
        </Text>
      </View>

      {/* List body */}
      {loaded && entries.length === 0 ? (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: theme.spacing[6],
          }}
        >
          <Text variant="h4" tone="primary" align="center">
            {copy.emptyTitle}
          </Text>
          <Text
            variant="body"
            tone="secondary"
            align="center"
            style={{ marginTop: theme.spacing[2], maxWidth: 320 }}
          >
            {copy.emptyBody}
          </Text>
          <View style={{ marginTop: theme.spacing[5] }}>
            <Button
              label={copy.add}
              variant="primary"
              size="md"
              onPress={() => navigation.navigate('AddDocument')}
              leftAdornment={
                <Icon
                  name="Plus"
                  size={16}
                  color={theme.colors.accent.primaryOnText}
                  strokeWidth={2}
                />
              }
            />
          </View>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing[6],
            paddingBottom: theme.spacing[24],
            gap: theme.spacing[3],
          }}
          renderItem={({ item, index }) => (
            <DocumentRow
              entry={item}
              doc={docs[item.id] ?? null}
              index={index}
              language={language}
              onPress={() => navigation.navigate('DocumentDetail', { id: item.id })}
              onLongPress={() => handleDelete(item.id)}
            />
          )}
          ListFooterComponent={
            entries.length > 0 ? (
              <View style={{ marginTop: theme.spacing[5], alignItems: 'stretch' }}>
                <Button
                  label={copy.add}
                  variant="secondary"
                  size="md"
                  fullWidth
                  onPress={() => navigation.navigate('AddDocument')}
                  leftAdornment={
                    <Icon
                      name="Plus"
                      size={16}
                      color={theme.colors.text.accent}
                      strokeWidth={2}
                    />
                  }
                />
                <Text
                  variant="caption"
                  tone="tertiary"
                  align="center"
                  style={{ marginTop: theme.spacing[3] }}
                >
                  {copy.swipeHint.toUpperCase()}
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Drop overlay (web only) — appears while the user is dragging a
          file over the window. Picks up the first file on drop. */}
      {isDragging && Platform.OS === 'web' ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: theme.spacing[6],
            backgroundColor: 'rgba(255, 255, 255, 0.92)',
          }}
        >
          <View
            style={{
              alignItems: 'center',
              paddingVertical: theme.spacing[10],
              paddingHorizontal: theme.spacing[8],
              borderRadius: theme.radii.xl,
              borderWidth: 2,
              borderColor: palette.fuchsia[500],
              borderStyle: 'dashed' as any,
              backgroundColor: palette.petal[100],
              maxWidth: 420,
            }}
          >
            <Icon
              name="UploadCloud"
              size={48}
              color={palette.fuchsia[500]}
              strokeWidth={1.5}
            />
            <Text
              variant="h3"
              tone="primary"
              align="center"
              style={{ marginTop: theme.spacing[4] }}
            >
              {copy.dropOverlayTitle}
            </Text>
            <Text
              variant="body"
              tone="secondary"
              align="center"
              style={{ marginTop: theme.spacing[2], maxWidth: 320 }}
            >
              {copy.dropOverlayBody}
            </Text>
          </View>
        </View>
      ) : null}
      </SafeAreaView>
    </View>
  )
}

// ─── BLOOM ─────────────────────────────────────────────────────────────────
function Bloom({ size, intensity }: { size: number; intensity: number }) {
  const t = useSharedValue(0)
  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: 4000, easing: ReanimatedEasing.bezier(0.45, 0, 0.55, 1) }),
      -1,
      true,
    )
  }, [t])
  const dotStyle = useAnimatedStyle(() => ({
    opacity: (0.92 - 0.57 * t.value) * intensity,
    transform: [{ scale: 1 - 0.38 * t.value }],
  }))

  const dotX  = size * 0.76
  const dotY  = size * 0.21
  const stop0 = Math.max(0, 0.7  * intensity)
  const stop1 = Math.max(0, 0.38 * intensity)
  const stop2 = Math.max(0, 0.10 * intensity)

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, right: 0, width: size, height: size }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id="apricotDocs" cx="72%" cy="10%" r="55%" fx="72%" fy="10%">
            <Stop offset="0%"   stopColor={palette.apricot[400]} stopOpacity={stop0} />
            <Stop offset="35%"  stopColor={palette.apricot[400]} stopOpacity={stop1} />
            <Stop offset="70%"  stopColor={palette.apricot[400]} stopOpacity={stop2} />
            <Stop offset="100%" stopColor={palette.apricot[400]} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={size} height={size} fill="url(#apricotDocs)" />
      </Svg>
      <Reanimated.View
        style={[
          {
            position: 'absolute',
            left: dotX - 5,
            top:  dotY - 5,
            width: 10,
            height: 10,
            borderRadius: 999,
            backgroundColor: palette.fuchsia[500],
            ...(Platform.OS === 'web'
              ? ({ boxShadow: '0 0 14px rgba(255, 4, 114, 0.45)' } as any)
              : {
                  shadowColor: palette.fuchsia[500],
                  shadowOpacity: 0.45,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 0 },
                }),
          },
          dotStyle,
        ]}
      />
    </View>
  )
}
