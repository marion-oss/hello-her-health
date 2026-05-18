// Anoqi — ChatScreen.
//
// Conversation UI. Assistant replies render as an article-style reading
// pane (no bubble shell) with markdown structure: serif h2 title, sans-
// serif section headings, bodyLg paragraphs, bulleted lists, **bold**
// inline, and inline [Sn] citation pills. User questions stay in the
// fuchsia bubble — kept as the brand "send" moment. Consent flows are
// unchanged: full-screen gate for direct-to-Anoqi entry, bottom-sheet
// ConsentSheet for the skip-and-chat path.

import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation, useFocusEffect, useIsFocused } from '@react-navigation/native'
import {
  listDocuments,
  listInContextDocuments,
  setInContext,
  type DocumentIndexEntry,
  type LocalDocument,
} from '../../lib/documentStore'
import { setPendingFile } from '../../lib/pendingFile'
import { pseudonymise } from '../../lib/pseudonymise'

import {
  useOnboarding,
  type HealthObjective,
  type Language,
} from '../../context/OnboardingContext'
import { palette, useTheme } from '../../theme'
import { STARTERS } from './starters'
import { StarterCard } from './StarterCard'
import {
  postChatStream,
  postSummary,
  AnoqiApiError,
  type ChatRequestDocument,
  type SourceDisplay,
} from '../../lib/anoqiApi'
import { Alert } from 'react-native'
import { supabase } from '../../lib/supabase'
import {
  BackHeader,
  BreathingForm,
  Bubble,
  Button,
  type CitationSource,
  ConsentSheet,
  DocumentContextSheet,
  GoalSheet,
  Icon,
  type IconName,
  Markdown,
  parseMarkdown,
  StreamingCursor,
  Text,
  TypingIndicator,
} from '../../components'

// Cap each document's cleanText at this many characters before sending. The
// BE applies its own caps too — this just avoids shipping megabytes.
const DOC_PER_DOC_MAX = 4000
const DOC_TOTAL_MAX   = 12_000

function buildContextDocsPayload(docs: LocalDocument[]): ChatRequestDocument[] {
  let used = 0
  const out: ChatRequestDocument[] = []
  for (const d of docs) {
    if (used >= DOC_TOTAL_MAX) break
    const cap = Math.min(DOC_PER_DOC_MAX, DOC_TOTAL_MAX - used)
    const text = d.cleanText.length > cap
      ? d.cleanText.slice(0, cap) + '\n\n[…truncated]'
      : d.cleanText
    out.push({
      id:           d.id,
      name:         d.name,
      documentType: d.documentType,
      documentDate: d.documentDate,
      cleanText:    text,
    })
    used += text.length
  }
  return out
}

type Source = CitationSource & { topic: string }

type Message = {
  id: string
  role: 'user' | 'anoqi'
  text: string
  fullText: string
  isStreaming: boolean
  sources?: Source[]
  isFirst?: boolean
  timestamp: Date
}

const COPY = {
  fr: {
    greeting: "Qu'est-ce qui te préoccupe aujourd'hui ?",
    sub: 'Pose ta question. Sans détour.',
    inputPlaceholder: 'Pose ta question…',
    safetyNote: 'Anoqi informe, elle ne diagnostique pas. Consulte toujours ton médecin.',
    summaryBanner: 'Générer un résumé pour ton médecin',
    send: 'Envoyer',
    attach: 'Joindre un document',
    docsSingular: 'document en mémoire',
    docsPlural:   'documents en mémoire',
    docsManage:   'gérer',
    dropTitle:    'Dépose ton document.',
    dropBody:     'PDF ou texte · nettoyé sur ton appareil avant d\'être enregistré.',
    introMessage:
      'Bonjour, je suis Anoqi. Pose-moi toutes tes questions — je te montrerai toujours la source derrière chaque réponse. Rien de ce que tu partages ici n\'est lié à ton nom.',
    consentGate: {
      title: 'Avant ta première question',
      subtitle: 'Quelques points pour utiliser Anoqi en toute confiance.',
      points: [
        { icon: 'BookOpen' as IconName, text: 'Anoqi t\'informe, elle ne pose pas de diagnostic.' },
        { icon: 'ShieldCheck' as IconName, text: 'Tes données sont pseudonymisées avant tout traitement.' },
        { icon: 'Trash2' as IconName, text: 'Tu peux demander la suppression à tout moment.' },
      ],
      cta: 'Je comprends et j\'accepte',
      footnote: 'Pour le consentement détaillé, crée un compte plus tard.',
    },
  },
  en: {
    greeting: "What's on your mind today?",
    sub: 'Ask directly. No detours.',
    inputPlaceholder: 'Ask your question…',
    safetyNote: "Anoqi informs, it doesn't diagnose. Always consult your doctor.",
    summaryBanner: 'Generate a summary for your doctor',
    send: 'Send',
    attach: 'Attach a document',
    docsSingular: 'document in context',
    docsPlural:   'documents in context',
    docsManage:   'manage',
    dropTitle:    'Drop your document.',
    dropBody:     'PDF or text · cleaned on your device before anything is saved.',
    introMessage:
      "Hi, I'm Anoqi. Ask me anything — I'll always show you the source behind my answer. Nothing you share here is linked to your name.",
    consentGate: {
      title: 'Before your first question',
      subtitle: 'A few things so you can use Anoqi with full confidence.',
      points: [
        { icon: 'BookOpen' as IconName, text: 'Anoqi informs you — it does not diagnose.' },
        { icon: 'ShieldCheck' as IconName, text: 'Your data is pseudonymised before any processing.' },
        { icon: 'Trash2' as IconName, text: 'You can request deletion at any time.' },
      ],
      cta: 'I understand and agree',
      footnote: 'For detailed consent, sign up later.',
    },
  },
} as const

// Bilingual goal labels mirrored on the Chat header chip. Same icon set as
// the Home pill so the visual identity stays consistent across surfaces.
const OBJECTIVE_LABELS: Record<HealthObjective, { fr: string; en: string; icon: IconName }> = {
  symptoms:      { fr: 'Symptômes',      en: 'Symptoms',        icon: 'Stethoscope' },
  contraception: { fr: 'Contraception',  en: 'Contraception',   icon: 'Pill' },
  menopause:     { fr: 'Ménopause',      en: 'Menopause',       icon: 'Sunset' },
  fertility:     { fr: 'Fertilité',      en: 'Fertility',       icon: 'Sprout' },
  general:       { fr: 'Santé générale', en: 'General health',  icon: 'MessageCircle' },
}

// Map the BE's sources_display payload into the local Source shape (which is
// CitationSource & { topic: string }). Pathway-typed entries have no URL.
function toSource(d: SourceDisplay): Source {
  return { label: d.label, name: d.name, topic: d.topic, url: d.url }
}

// Fake-stream cadence. The full response text is already in memory once the
// /chat fetch resolves — the typewriter is purely cosmetic. ~16 chars per
// 24 ms tick ≈ 660 chars/sec, ~5× faster than the previous 2/15ms loop. Keeps
// the "answer is appearing" feel without making the user wait on a UI animation
// after the network already finished.
const STREAM_TICK_MS = 24
const STREAM_CHARS_PER_TICK = 16

// Stable keyExtractor & item separator. Pulled out so FlatList sees identical
// function references across renders (otherwise every parent state change
// invalidates virtualization).
const messageKeyExtractor = (m: Message) => m.id

// Static styles for message items. Theme-dependent values (spacing, colors)
// stay inline in the components below; everything else is hoisted so RN-Web
// doesn't re-emit a className per render.
const messageStyles = StyleSheet.create({
  userWrap: {
    width: '100%',
    alignSelf: 'center',
    maxWidth: 864,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  assistantWrap: {
    width: '100%',
    alignSelf: 'center',
    maxWidth: 864,
  },
  safetyNote: {
    borderTopWidth: 1,
  },
})

// Memoised user bubble. Re-renders only when its own text changes — past
// messages stay quiet while the latest one streams.
const UserMessageItem = memo(function UserMessageItem({ text }: { text: string }) {
  const theme = useTheme()
  return (
    <View style={[messageStyles.userWrap, { marginBottom: theme.spacing[5] }]}>
      {/* Bubble already caps its own width at 86%; nesting a second
          maxWidth wrapper collapses to per-character width on RN-Web. */}
      <Bubble role="user">
        <Text
          variant="bodyLg"
          style={{ color: theme.colors.accent.primaryOnText }}
        >
          {text}
        </Text>
      </Bubble>
    </View>
  )
})

// Memoised assistant message. parseMarkdown runs once per text change instead
// of every parent render — during streaming that turns ~250 parses into ~30,
// and other messages above stop re-parsing entirely.
const AssistantMessageItem = memo(function AssistantMessageItem({
  text,
  isStreaming,
  sources,
  isFirst,
  safetyNote,
}: {
  text: string
  isStreaming: boolean
  sources?: Source[]
  isFirst?: boolean
  safetyNote: string
}) {
  const theme = useTheme()
  const blocks = useMemo(() => parseMarkdown(text), [text])
  return (
    <View style={[messageStyles.assistantWrap, { marginBottom: theme.spacing[8] }]}>
      <Markdown
        blocks={blocks}
        sources={sources}
        trailingCursor={isStreaming ? <StreamingCursor /> : null}
      />

      {!isStreaming && isFirst ? (
        <Text
          variant="caption"
          tone="tertiary"
          style={[
            messageStyles.safetyNote,
            {
              marginTop: theme.spacing[2],
              paddingTop: theme.spacing[3],
              borderTopColor: theme.colors.border.subtle,
            },
          ]}
        >
          {safetyNote}
        </Text>
      ) : null}
    </View>
  )
})


export function ChatScreen() {
  const navigation = useNavigation<any>()
  const { language, objective, setObjective, sessionId } = useOnboarding()
  const theme = useTheme()
  const { width: screenWidth } = useWindowDimensions()
  // Cormorant h2 (36px) wraps to 3 lines on FR greeting at < 480px and
  // pushes the rest of the empty state below the fold. Step down to h3.
  const greetingVariant = screenWidth < 480 ? 'h3' : 'h2'
  const copy = COPY[language]

  const objKey = objective ?? 'general'
  const objMeta = OBJECTIVE_LABELS[objKey]
  const [goalSheetOpen, setGoalSheetOpen] = useState(false)
  // Without this guard, the form's `position: fixed` (web) bleeds into
  // sibling tabs because the bottom-tab navigator keeps screens mounted.
  const isFocused = useIsFocused()

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [documents, setDocuments] = useState<DocumentIndexEntry[]>([])
  const [docSheetOpen, setDocSheetOpen] = useState(false)
  const [isDraggingFile, setIsDraggingFile] = useState(false)

  // Re-poll the document index whenever the chat regains focus so a doc
  // added in the Documents flow shows up in the in-context pill immediately.
  useFocusEffect(
    useCallback(() => {
      listDocuments()
        .then(setDocuments)
        .catch(() => { /* silent — pill simply won't show */ })
    }, []),
  )

  // Toggle a single document's inContext flag. Persists to documentStore and
  // mirrors locally so the sheet reflects the change without a re-fetch.
  const handleToggleDocInContext = useCallback(async (id: string, next: boolean) => {
    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, inContext: next } : d)))
    try {
      await setInContext(id, next)
    } catch (err) {
      // Revert if persistence fails so the UI doesn't lie.
      setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, inContext: !next } : d)))
      if (__DEV__) console.warn('[chat] setInContext failed:', err)
    }
  }, [])

  const inContextCount = documents.filter((d) => d.inContext).length

  // Drag-and-drop file uploads (web only). Dropping a file anywhere on
  // the chat screen sets the pending file + opens the AddDocument modal.
  useEffect(() => {
    if (Platform.OS !== 'web') return

    let depth = 0
    const onDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes('Files')) return
      e.preventDefault()
      depth++
      setIsDraggingFile(true)
    }
    const onDragOver = (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes('Files')) return
      e.preventDefault()
      e.dataTransfer!.dropEffect = 'copy'
    }
    const onDragLeave = (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes('Files')) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setIsDraggingFile(false)
    }
    const onDrop = (e: DragEvent) => {
      if (!e.dataTransfer?.files?.length) return
      e.preventDefault()
      depth = 0
      setIsDraggingFile(false)
      const file = e.dataTransfer.files[0]
      setPendingFile(file)
      navigation.navigate('Documents', { screen: 'AddDocument' })
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
  const [isTyping, setIsTyping] = useState(false)
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [userMessageCount, setUserMessageCount] = useState(0)
  const [consentChecked, setConsentChecked] = useState(false)
  const [consentAccepted, setConsentAccepted] = useState(false)
  // Skip-and-chat path: user entered Chat directly from ObjectiveScreen
  // without going through ConsentScreen. We let them compose + send their
  // first message, then show the consent bottom-sheet before generating any
  // AI response.
  const [pendingConsent, setPendingConsent] = useState(false)
  const [showConsentSheet, setShowConsentSheet] = useState(false)

  const flatListRef = useRef<FlatList>(null)
  const anoqiMessageCount = useRef(0)
  // Holds the user's first message content while the consent sheet is open,
  // so we can fire the AI response once consent is granted.
  const heldFirstSendRef = useRef<string | null>(null)
  // Server-assigned conversation UUID. Null until the first /chat response
  // creates it; reused on every subsequent turn so the server can rebuild
  // history. Stays in the screen's lifetime — leaving and re-entering Chat
  // starts a fresh conversation, which matches the current UX.
  const conversationIdRef = useRef<string | null>(null)

  useEffect(() => {
    AsyncStorage.getItem('anoqi_chat_consent_accepted').then((v) => {
      setConsentAccepted(v === 'true')
      setConsentChecked(true)
    })
  }, [])

  // Read skip-and-chat handoff state once on mount. The prefill is consumed
  // immediately so re-entering Chat later starts with an empty composer.
  useEffect(() => {
    let cancelled = false
    async function readHandoff() {
      const [[, prefill], [, pending]] = await AsyncStorage.multiGet([
        'anoqi_chat_prefill',
        'anoqi_pending_consent',
      ])
      if (cancelled) return
      if (prefill) {
        setInput(prefill)
        AsyncStorage.removeItem('anoqi_chat_prefill')
      }
      if (pending === 'true') setPendingConsent(true)
    }
    readHandoff()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleAcceptConsent() {
    await AsyncStorage.setItem('anoqi_chat_consent_accepted', 'true')
    setConsentAccepted(true)
  }

  useEffect(() => {
    if (!consentAccepted) return
    const currentLanguage = language
    async function maybeShowIntro() {
      const shown = await AsyncStorage.getItem('anoqi_intro_shown')
      if (shown) return
      await AsyncStorage.setItem('anoqi_intro_shown', 'true')
      const introText = COPY[currentLanguage].introMessage
      const introId = `anoqi-intro-${Date.now()}`
      const introMsg: Message = {
        id: introId,
        role: 'anoqi',
        text: '',
        fullText: introText,
        isStreaming: true,
        isFirst: true,
        timestamp: new Date(),
      }
      anoqiMessageCount.current += 1
      setMessages([introMsg])
      setStreamingId(introId)
    }
    maybeShowIntro()
  }, [consentAccepted]) // eslint-disable-line react-hooks/exhaustive-deps

  // Retranslate the intro message when the user switches language. Chat lives
  // in a bottom-tab navigator, so tabbing to Profile, flipping FR↔EN, and
  // coming back finds the screen still mounted with the old-language intro
  // baked into `messages`. Replace it in place; the streaming cursor for the
  // intro is already done by the time the user can reach the language toggle.
  useEffect(() => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id.startsWith('anoqi-intro-')
          ? {
              ...m,
              text:        COPY[language].introMessage,
              fullText:    COPY[language].introMessage,
              isStreaming: false,
            }
          : m,
      ),
    )
  }, [language])

  const starters = STARTERS[objective ?? 'general'][language]
  const showSummaryBanner = userMessageCount >= 3
  const [summaryLoading, setSummaryLoading] = useState(false)

  // Wired to the "Générer un résumé pour ton médecin" banner. Calls
  // POST /summaries on the BE, which returns a structured physician-ready
  // summary. Auth is required — for anon users we surface a clear message.
  //
  // For now the result lands in a native Alert. A proper SummarySheet
  // (mirroring ConsentSheet / GoalSheet) is a follow-up — see BRAND.md §10.
  const handleGenerateSummary = useCallback(async () => {
    if (summaryLoading) return
    if (!conversationIdRef.current) {
      Alert.alert(
        language === 'fr' ? 'Pas encore de conversation' : 'No conversation yet',
        language === 'fr'
          ? 'Envoie quelques messages avant de générer un résumé.'
          : 'Send a few messages before generating a summary.',
      )
      return
    }
    setSummaryLoading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      if (!accessToken) {
        Alert.alert(
          language === 'fr' ? 'Connexion requise' : 'Sign-in required',
          language === 'fr'
            ? 'Crée un compte ou connecte-toi pour générer un résumé.'
            : 'Create an account or sign in to generate a summary.',
        )
        return
      }
      const { summary } = await postSummary({
        conversationId: conversationIdRef.current,
        language,
        accessToken,
      })

      // Crude display for now — the structured summary as scrollable text.
      // A proper SummarySheet replaces this once the UI lands.
      const lines: string[] = []
      lines.push(`${summary.title}`, '')
      if (summary.content.motif) {
        lines.push(language === 'fr' ? 'Motif :' : 'Chief complaint:')
        lines.push(summary.content.motif, '')
      }
      if (summary.content.points_cles?.length) {
        lines.push(language === 'fr' ? 'Points clés :' : 'Key points:')
        for (const p of summary.content.points_cles) lines.push(`• ${p}`)
        lines.push('')
      }
      if (summary.content.questions?.length) {
        lines.push(language === 'fr' ? 'Questions pour le médecin :' : 'Questions for the doctor:')
        for (const q of summary.content.questions) lines.push(`• ${q}`)
        lines.push('')
      }
      if (summary.content.prochaines_etapes?.length) {
        lines.push(language === 'fr' ? 'Prochaines étapes :' : 'Next steps:')
        for (const s of summary.content.prochaines_etapes) lines.push(`• ${s}`)
      }
      Alert.alert(
        language === 'fr' ? 'Résumé prêt' : 'Summary ready',
        lines.join('\n').trim(),
      )
    } catch (err) {
      if (__DEV__) console.warn('[chat] postSummary failed:', err)
      const status = err instanceof AnoqiApiError ? err.status : 0
      const message =
        status === 401
          ? language === 'fr'
            ? 'Connexion requise pour générer un résumé.'
            : 'Sign-in required to generate a summary.'
          : status === 409
            ? language === 'fr'
              ? 'Un résumé existe déjà pour cette conversation.'
              : 'A summary already exists for this conversation.'
            : status === 400
              ? language === 'fr'
                ? 'La conversation est trop courte pour être résumée.'
                : 'The conversation is too short to summarise.'
              : language === 'fr'
                ? 'Impossible de générer le résumé. Réessaie dans un instant.'
                : 'Could not generate the summary. Please try again.'
      Alert.alert(language === 'fr' ? 'Erreur' : 'Error', message)
    } finally {
      setSummaryLoading(false)
    }
  }, [language, summaryLoading])

  // Streaming typewriter. Single interval driven by `streamingId` only — never
  // by `messages` — so each setMessages tick does NOT re-fire this effect.
  // The previous implementation listed `messages` in the dep array, which made
  // every tick re-bind the timer and re-find the streaming message, causing
  // ~250 effect runs per response and the visible mobile-web jank.
  useEffect(() => {
    if (!streamingId) return

    let stopped = false
    const tick = () => {
      if (stopped) return
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === streamingId)
        if (idx === -1) return prev
        const msg = prev[idx]
        if (msg.text.length >= msg.fullText.length) return prev
        const nextLen = Math.min(
          msg.text.length + STREAM_CHARS_PER_TICK,
          msg.fullText.length,
        )
        const done = nextLen >= msg.fullText.length
        const next = prev.slice()
        next[idx] = {
          ...msg,
          text: msg.fullText.slice(0, nextLen),
          isStreaming: !done,
        }
        if (done) {
          // Defer to break the setState-during-setState rule.
          Promise.resolve().then(() => {
            if (!stopped) setStreamingId(null)
          })
        }
        return next
      })
    }

    // Immediate first tick so the response visibly starts within a frame
    // instead of waiting STREAM_TICK_MS.
    tick()
    const id = setInterval(tick, STREAM_TICK_MS)
    return () => {
      stopped = true
      clearInterval(id)
    }
  }, [streamingId])

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80)
    }
  }, [messages.length])

  const runAnoqiResponse = useCallback(async (userContent: string) => {
    setIsTyping(true)
    const isFirstAnoqi = anoqiMessageCount.current === 0
    const anoqiId = `anoqi-stream-${Date.now()}`
    let insertedMessage = false

    const buildFriendlyError = (err: AnoqiApiError | null) =>
      err && err.status > 0
        ? (language === 'fr'
            ? `Désolée, je n'arrive pas à répondre pour l'instant (${err.status}). Réessaie dans un instant.`
            : `Sorry, I can't answer right now (${err.status}). Please try again in a moment.`)
        : (language === 'fr'
            ? `Quelque chose n'a pas fonctionné. Réessaie.`
            : `Something went wrong. Please try again.`)

    // Pull in-context documents fresh on every send so any toggle made
    // moments earlier in the bottom-sheet is reflected. Truncate before
    // shipping.
    let docsPayload: ChatRequestDocument[] = []
    try {
      const inContextDocs = await listInContextDocuments()
      docsPayload = buildContextDocsPayload(inContextDocs)
    } catch (err) {
      // Non-fatal — chat still works without doc context.
      if (__DEV__) console.warn('[chat] failed to load in-context documents:', err)
    }

    // Pseudonymise BEFORE leaving the device. The user's own bubble
    // (set in handleSend above) still shows the raw text they typed —
    // pseudonymisation is for the server-bound payload only.
    // See app/lib/pseudonymise.ts for the pattern set.
    const { pseudonymisedText } = pseudonymise(userContent)

    await postChatStream(
      {
        message:        pseudonymisedText,
        language,
        sessionId,
        objective,
        conversationId: conversationIdRef.current ?? undefined,
        documents:      docsPayload.length > 0 ? docsPayload : undefined,
      },
      {
        // First delta = first sign of life. Hide the typing indicator and
        // drop in the assistant bubble pre-populated with the initial chunk,
        // so the user goes directly from indicator → readable content.
        onDelta: (text) => {
          if (!insertedMessage) {
            insertedMessage = true
            setIsTyping(false)
            anoqiMessageCount.current += 1
            const newMsg: Message = {
              id: anoqiId,
              role: 'anoqi',
              text,
              fullText: text,
              isStreaming: true,
              sources: [],
              isFirst: isFirstAnoqi,
              timestamp: new Date(),
            }
            setMessages((prev) => [...prev, newMsg])
            return
          }
          setMessages((prev) =>
            prev.map((m) =>
              m.id === anoqiId
                ? { ...m, text: m.text + text, fullText: m.fullText + text }
                : m,
            ),
          )
        },
        // Output policy blocked the reply mid-stream. Replace whatever the
        // user has seen so far with the sanitised fallback.
        onRedact: (content) => {
          if (!insertedMessage) {
            insertedMessage = true
            setIsTyping(false)
            anoqiMessageCount.current += 1
            const newMsg: Message = {
              id: anoqiId,
              role: 'anoqi',
              text: content,
              fullText: content,
              isStreaming: false,
              sources: [],
              isFirst: isFirstAnoqi,
              timestamp: new Date(),
            }
            setMessages((prev) => [...prev, newMsg])
            return
          }
          setMessages((prev) =>
            prev.map((m) =>
              m.id === anoqiId
                ? { ...m, text: content, fullText: content, isStreaming: false }
                : m,
            ),
          )
        },
        onDone: (final) => {
          if (final.conversationId && !conversationIdRef.current) {
            conversationIdRef.current = final.conversationId
          }
          const sources: Source[] = final.sources_display.map(toSource)
          setMessages((prev) => {
            // Edge case: the server returned `done` without any prior delta
            // (shouldn't happen in practice but be defensive).
            if (!insertedMessage) {
              return [
                ...prev,
                {
                  id: anoqiId,
                  role: 'anoqi',
                  text: final.cleanContent,
                  fullText: final.cleanContent,
                  isStreaming: false,
                  sources,
                  isFirst: isFirstAnoqi,
                  timestamp: new Date(),
                },
              ]
            }
            return prev.map((m) =>
              m.id === anoqiId
                ? {
                    ...m,
                    text: final.cleanContent,
                    fullText: final.cleanContent,
                    isStreaming: false,
                    sources,
                  }
                : m,
            )
          })
          setIsTyping(false)
        },
        onError: (err) => {
          setIsTyping(false)
          const friendly = buildFriendlyError(err instanceof AnoqiApiError ? err : null)
          // If we'd already started rendering, replace the in-flight bubble
          // with the error text rather than leaving a half-finished message.
          setMessages((prev) => {
            if (insertedMessage) {
              return prev.map((m) =>
                m.id === anoqiId
                  ? { ...m, text: friendly, fullText: friendly, isStreaming: false }
                  : m,
              )
            }
            const errId = `anoqi-error-${Date.now()}`
            return [
              ...prev,
              {
                id: errId,
                role: 'anoqi',
                text: friendly,
                fullText: friendly,
                isStreaming: false,
                isFirst: isFirstAnoqi,
                timestamp: new Date(),
              },
            ]
          })
          if (__DEV__) console.warn('[chat] postChatStream failed:', err)
        },
      },
    )
  }, [language, objective, sessionId])

  const handleSend = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim()
      if (!content) return
      setInput('')
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        text: content,
        fullText: content,
        isStreaming: false,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMessage])
      setUserMessageCount((prev) => prev + 1)

      // Skip-and-chat path: hold the AI response until consent is granted via
      // the bottom-sheet. The user's typed message is already in the transcript
      // so they see what they sent.
      if (pendingConsent && anoqiMessageCount.current === 0) {
        heldFirstSendRef.current = content
        setShowConsentSheet(true)
        return
      }

      await runAnoqiResponse(content)
    },
    [input, pendingConsent, runAnoqiResponse],
  )

  const handleConsentSheetAccept = useCallback(
    async (_researchOptIn: boolean) => {
      await AsyncStorage.multiSet([
        ['anoqi_chat_consent_accepted', 'true'],
        // Suppress the welcome intro: the user already sent a question, so a
        // separate "Hi, I'm Anoqi" message before the AI's first reply would
        // feel out of place.
        ['anoqi_intro_shown', 'true'],
      ])
      await AsyncStorage.removeItem('anoqi_pending_consent')
      setPendingConsent(false)
      setShowConsentSheet(false)
      setConsentAccepted(true)
      // Replay the held first send into the AI response pipeline.
      if (heldFirstSendRef.current !== null) {
        const held = heldFirstSendRef.current
        heldFirstSendRef.current = null
        await runAnoqiResponse(held)
      }
    },
    [runAnoqiResponse],
  )

  // Stable references for FlatList. Inline renderItem + inline
  // contentContainerStyle break virtualization because every parent render
  // hands FlatList "new" props.
  const renderMessage = useCallback(
    ({ item }: { item: Message }) =>
      item.role === 'user' ? (
        <UserMessageItem text={item.text} />
      ) : (
        <AssistantMessageItem
          text={item.text}
          isStreaming={item.isStreaming}
          sources={item.sources}
          isFirst={item.isFirst}
          safetyNote={copy.safetyNote}
        />
      ),
    [copy.safetyNote],
  )

  const listContentStyle = useMemo(
    () => ({
      paddingHorizontal: theme.spacing[5],
      paddingTop: theme.spacing[4],
      paddingBottom: theme.spacing[3],
    }),
    [theme.spacing],
  )

  // ── Consent gate (Cotton Rose overlay — not a black scrim) ─────────────
  if (!consentChecked) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.canvas }} />
  }
  if (!consentAccepted && !pendingConsent) {
    const gate = copy.consentGate
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.surfaceMuted }}>
        <BackHeader
          onBack={() => {
            if (navigation.canGoBack()) navigation.goBack()
            else navigation.navigate('Home')
          }}
        />
        <View
          style={{
            flex: 1,
            paddingHorizontal: theme.spacing[6],
            paddingBottom: theme.spacing[6],
            justifyContent: 'space-between',
          }}
        >
          <View style={{ marginTop: theme.spacing[8] }}>
            <Text variant="h1" tone="primary">
              {gate.title}
            </Text>
            <Text
              variant="bodyLg"
              tone="secondary"
              style={{ marginTop: theme.spacing[3], marginBottom: theme.spacing[8] }}
            >
              {gate.subtitle}
            </Text>
            <View style={{ gap: theme.spacing[5] }}>
              {gate.points.map((p, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: theme.spacing[4],
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: theme.colors.bg.surface,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon
                      name={p.icon}
                      size={18}
                      color={theme.colors.accent.success}
                      strokeWidth={1.6}
                    />
                  </View>
                  <Text variant="body" tone="primary" style={{ flex: 1, marginTop: 8 }}>
                    {p.text}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          <View>
            <Button
              label={gate.cta}
              size="lg"
              fullWidth
              onPress={handleAcceptConsent}
            />
            <Text
              variant="caption"
              tone="tertiary"
              align="center"
              style={{ marginTop: theme.spacing[3] }}
            >
              {gate.footnote}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  // ── Main render ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* Breathing form tucked into the bottom-right corner — exact same
          placement as DocumentsScreen so the brand visual sits at a
          consistent anchor across tabs. Behind content via DOM order.
          Guarded by isFocused so the form's `position: fixed` (web) doesn't
          bleed into sibling tabs that the bottom-tab navigator keeps
          mounted in parallel. */}
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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <BackHeader
          onBack={() => {
            // Chat lives in the tab navigator alongside Home — goBack() does
            // nothing when there's no stack history, so route by name.
            if (navigation.canGoBack()) navigation.goBack()
            else navigation.navigate('Home')
          }}
          rightSlot={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={objMeta[language]}
              onPress={() => setGoalSheetOpen(true)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: theme.radii.pill,
                borderWidth: 1,
                borderColor: 'rgba(196, 128, 106, 0.28)',
                backgroundColor: pressed
                  ? 'rgba(196, 128, 106, 0.20)'
                  : 'rgba(196, 128, 106, 0.10)',
              })}
            >
              <Icon name={objMeta.icon} size={12} color={palette.ember[300]} strokeWidth={1.8} />
              <Text variant="label" style={{ color: palette.ember[200] }}>
                {objMeta[language]}
              </Text>
              <Icon name="ChevronDown" size={11} color={palette.ember[300]} strokeWidth={1.8} />
            </Pressable>
          }
        />

        {messages.length === 0 ? (
          // Empty state — scrollable so content can overflow on small screens
          // without colliding with the input bar.
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: theme.spacing[6],
              paddingTop: theme.spacing[8],
              paddingBottom: theme.spacing[16],
              justifyContent: screenWidth >= 480 ? 'center' : 'flex-start',
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text variant={greetingVariant} tone="primary" align="center">
              {copy.greeting}
            </Text>
            <Text
              variant="body"
              tone="secondary"
              align="center"
              style={{ marginTop: theme.spacing[3], marginBottom: theme.spacing[8] }}
            >
              {copy.sub}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: theme.spacing[3],
              }}
            >
              {starters.map((q, i) => (
                <StarterCard
                  key={i}
                  text={q}
                  index={i}
                  onPress={() => handleSend(q)}
                />
              ))}
            </View>
          </ScrollView>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={messageKeyExtractor}
            renderItem={renderMessage}
            extraData={streamingId}
            initialNumToRender={8}
            maxToRenderPerBatch={6}
            windowSize={7}
            removeClippedSubviews={Platform.OS === 'web'}
            contentContainerStyle={listContentStyle}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              <>
                {isTyping ? (
                  <View
                    style={{
                      alignSelf: 'center',
                      width: '100%',
                      maxWidth: 864,
                      marginBottom: theme.spacing[5],
                    }}
                  >
                    <TypingIndicator />
                  </View>
                ) : null}

                {userMessageCount === 0 && !streamingId ? (
                  // Auto-intro pushes a single message into `messages` on
                  // first visit, so the pure empty-state path doesn't fire.
                  // Mirror the starter grid here so cards are reachable
                  // below the intro. Hides after the first user turn.
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: theme.spacing[3],
                      marginTop: theme.spacing[6],
                    }}
                  >
                    {starters.map((q, i) => (
                      <StarterCard
                        key={i}
                        text={q}
                        index={i}
                        onPress={() => handleSend(q)}
                      />
                    ))}
                  </View>
                ) : null}
              </>
            }
          />
        )}

        {showSummaryBanner && messages.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={handleGenerateSummary}
            disabled={summaryLoading}
            style={{
              marginHorizontal: theme.spacing[5],
              marginBottom: theme.spacing[2],
              backgroundColor: theme.colors.bg.surfaceWarm,
              borderRadius: theme.radii.lg,
              paddingVertical: theme.spacing[3],
              paddingHorizontal: theme.spacing[4],
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: theme.spacing[3],
            }}
          >
            <Icon
              name="FileText"
              size={18}
              color={theme.colors.text.accent}
              strokeWidth={1.6}
            />
            <Text variant="bodyMed" tone="accent" style={{ flex: 1 }}>
              {copy.summaryBanner}
            </Text>
            <Icon
              name="ArrowRight"
              size={16}
              color={theme.colors.text.accent}
              strokeWidth={2}
            />
          </Pressable>
        ) : null}

        {/* Documents-in-context pill — small, ember-tinted, sits right
            above the input border so the user always knows what the model
            can see. Quiet by design — subordinate to the conversation.
            Tapping it opens DocumentContextSheet to toggle which uploaded
            docs are actually injected into the prompt. */}
        {documents.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setDocSheetOpen(true)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignSelf: 'flex-start',
              alignItems: 'center',
              gap: theme.spacing[2],
              marginLeft: theme.spacing[5],
              marginBottom: theme.spacing[2],
              paddingHorizontal: theme.spacing[3],
              paddingVertical: theme.spacing[2],
              backgroundColor: theme.colors.bg.surfaceWarm,
              borderRadius: theme.radii.pill,
              borderWidth: 1,
              borderColor: 'rgba(196, 128, 106, 0.20)',
              opacity: pressed ? 0.7 : 1,
              transform: pressed ? [{ scale: 0.985 }] : undefined,
            })}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: inContextCount > 0
                  ? theme.colors.accent.primary
                  : theme.colors.text.tertiary,
              }}
            />
            <Text variant="label" style={{ color: theme.colors.text.accent }}>
              {inContextCount} {inContextCount === 1 ? copy.docsSingular : copy.docsPlural}
            </Text>
            <Text variant="label" tone="tertiary">
              · {copy.docsManage} →
            </Text>
          </Pressable>
        ) : null}

        {/* Input bar — sits above the floating LiquidTabBar. The pill is
            ~62px tall and floats 14px above the safe-area; 92px of bottom
            clearance keeps the input fully visible. Background is intentionally
            transparent — a solid bg here would create a visible "column"
            rectangle against the position:fixed BreathingForm in the void. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            paddingHorizontal: theme.spacing[4],
            paddingVertical: theme.spacing[3],
            paddingBottom: theme.spacing[3],
            marginBottom: 92,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border.subtle,
            gap: theme.spacing[2],
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.attach}
            onPress={() =>
              navigation.navigate('Documents', { screen: 'AddDocument' })
            }
            style={({ pressed }) => ({
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: theme.colors.bg.surfaceMuted,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 1,
              transform: pressed ? [{ scale: 0.97 }] : undefined,
            })}
          >
            <Icon
              name="Paperclip"
              size={18}
              color={theme.colors.text.secondary}
              strokeWidth={1.6}
            />
          </Pressable>

          {/* Input pill — TextInput + send button visually inside one
              rounded shape. The pill is the styled wrapper; the TextInput
              sits inside with right padding reserved for the send button. */}
          <View
            style={{
              flex: 1,
              position: 'relative',
              backgroundColor: 'rgba(255, 245, 238, 0.04)',
              borderRadius: theme.radii.pill,
              borderWidth: 1,
              borderColor: 'rgba(255, 245, 238, 0.10)',
            }}
          >
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={copy.inputPlaceholder}
              placeholderTextColor={theme.colors.text.placeholder}
              multiline
              maxLength={2000}
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={() => handleSend()}
              // Web: Enter sends, Shift+Enter inserts a newline. multiline
              // TextInputs don't fire onSubmitEditing on web, so intercept
              // keypress directly. Native multiline keeps its default
              // newline-on-Enter behaviour.
              onKeyPress={
                Platform.OS === 'web'
                  ? ((e: any) => {
                      if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                        e.preventDefault?.()
                        handleSend()
                      }
                    }) as any
                  : undefined
              }
              textAlignVertical="center"
              style={{
                paddingLeft: theme.spacing[4],
                paddingRight: 48,
                // Asymmetric padding compensates for font-metric quirk:
                // most fonts put more visible mass above the baseline, so
                // geometric centring renders the text slightly above visual
                // centre. Extra paddingTop pushes glyphs down to look right.
                paddingTop: 14,
                paddingBottom: 8,
                minHeight: 44,
                fontSize: 15,
                fontFamily: 'Inter-Regular',
                color: theme.colors.text.primary,
                maxHeight: 120,
                lineHeight: 22,
                ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null),
              }}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.send}
              onPress={() => handleSend()}
              disabled={!input.trim() || isTyping}
              style={[
                {
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  marginTop: -16,
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor:
                    !input.trim() || isTyping
                      ? theme.colors.bg.surfaceWarm
                      : theme.colors.accent.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                !input.trim() || isTyping
                  ? null
                  : Platform.OS === 'web'
                    ? ({ boxShadow: '0 0 20px rgba(255, 4, 114, 0.45)' } as any)
                    : {
                        shadowColor: '#FF0472',
                        shadowOpacity: 0.55,
                        shadowRadius: 10,
                        shadowOffset: { width: 0, height: 0 },
                      },
              ]}
            >
              <Icon
                name="ArrowUp"
                size={16}
                color={
                  !input.trim() || isTyping
                    ? theme.colors.text.tertiary
                    : theme.colors.accent.primaryOnText
                }
                strokeWidth={2.4}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <ConsentSheet
        visible={showConsentSheet}
        language={language}
        onAccept={handleConsentSheetAccept}
      />

      <GoalSheet
        visible={goalSheetOpen}
        selected={objective}
        language={language}
        onSelect={setObjective}
        onClose={() => setGoalSheetOpen(false)}
      />

      <DocumentContextSheet
        visible={docSheetOpen}
        language={language}
        documents={documents}
        onToggle={handleToggleDocInContext}
        onAdd={() => {
          setDocSheetOpen(false)
          navigation.navigate('Documents', { screen: 'AddDocument' })
        }}
        onClose={() => setDocSheetOpen(false)}
      />

      {/* Drop overlay (web only) — appears while a file is being dragged
          anywhere over the chat window. */}
      {isDraggingFile && Platform.OS === 'web' ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: theme.spacing[6],
            backgroundColor: 'rgba(13, 13, 18, 0.85)',
          }}
        >
          <View
            style={{
              alignItems: 'center',
              paddingVertical: theme.spacing[10],
              paddingHorizontal: theme.spacing[8],
              borderRadius: theme.radii.xl,
              borderWidth: 2,
              borderColor: theme.colors.accent.primary,
              borderStyle: 'dashed' as any,
              backgroundColor: 'rgba(196, 128, 106, 0.06)',
              maxWidth: 420,
            }}
          >
            <Icon
              name="UploadCloud"
              size={48}
              color={theme.colors.accent.primary}
              strokeWidth={1.5}
            />
            <Text
              variant="h3Italic"
              tone="primary"
              align="center"
              style={{ marginTop: theme.spacing[4] }}
            >
              {copy.dropTitle}
            </Text>
            <Text
              variant="bodyLight"
              tone="secondary"
              align="center"
              style={{ marginTop: theme.spacing[2], maxWidth: 320 }}
            >
              {copy.dropBody}
            </Text>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  )
}
