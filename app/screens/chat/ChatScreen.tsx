/**
 * anoqi — ChatScreen
 *
 * Main conversation interface. Designed to feel like Claude — clean,
 * focused, no chrome — with anoqi's trust layer on top.
 *
 * Features:
 *   • Empty state: "What's on your mind today?" + 4 objective-based starters
 *   • Streaming message reveal (character by character)
 *   • Animated typing indicator (3 pulsing dots)
 *   • Source citation chips on every anoqi response
 *   • Safety note on the very first anoqi message
 *   • "Generate doctor summary →" banner after 3 user messages
 *   • Document attach button in input bar
 *   • Keyboard-aware layout
 *   • Full FR / EN support
 *
 * API: calls /functions/v1/chat (api/functions/chat.ts) via supabase.functions.invoke.
 *      Anon-mode sessions use a persisted session_id; signed-in users send the
 *      JWT. Responses arrive in one shot today (no token streaming yet — the
 *      visual streaming below is a presentation effect over the full payload).
 *
 * Brand palette:
 *   Neon Fuchsia  #FF0472  · Hot Coral  #FF6B3D
 *   Midnight Navy #000E28  · Warm Cream #FFF3EE
 *   Off White     #FFF8F5  · Candy Pink #FFB0CC
 */

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Linking,
  Pressable,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/native'
import { useOnboarding, type HealthObjective, type Language } from '../../context/OnboardingContext'
import { supabase } from '../../lib/supabase'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

// Display-side shape used by SourceChip. The server's /chat endpoint
// returns persisted citation refs in `messages.sources` plus optional
// display enrichment in `sources_display` (see api/functions/chat.ts
// step 7.5). Mobile coerces both into this shape for rendering.
type Source = {
  /** Citation label as rendered inline in the message body, e.g. 'S1'. Optional for legacy / non-RAG sources. */
  label?: string
  /** Display name, e.g. 'NHS' or the pathway title. Falls back to label if missing. */
  name: string
  /** Short topic line, e.g. 'Menstrual health' or pathway key. */
  topic: string
  /** Tappable link if available. */
  url?: string
  /** Provenance refs from the server — useful for analytics, not rendered. */
  source_kind?: 'pathway' | 'source' | 'pathway_red_flag'
  source_ref?: string
  pathway_key?: string | null
}

type Message = {
  id: string
  role: 'user' | 'anoqi'
  text: string
  fullText: string       // complete text (text streams toward this)
  isStreaming: boolean
  sources?: Source[]
  isFirst?: boolean      // first anoqi message → show safety note
  timestamp: Date
}

// Response shape from /functions/v1/chat. Mirror of ChatResponse in
// api/functions/chat.ts plus sources_display from the server-side enricher.
type ChatApiResponse = {
  message: {
    id:              string
    content:         string
    role:            'assistant'
    sources:         Array<{
      label:           string
      row_id:          string
      source_kind:     'pathway' | 'source' | 'pathway_red_flag'
      source_ref:      string
      pathway_key:     string | null
      pathway_version: string | null
    }>
    sources_display: Array<{
      label:       string
      source_kind: 'pathway' | 'source' | 'pathway_red_flag'
      source_ref:  string
      name:        string
      topic:       string
      url?:        string
    }>
    policyFlags:     unknown[]
    createdAt:       string
  }
  conversationId: string
  blocked:        boolean
}

// Lightweight UUID-ish session ID. Tries crypto.randomUUID (Hermes ≥0.74,
// modern web) and falls back to a timestamp+random hex string. The server
// only uses this as an opaque key, so format isn't load-bearing.
function generateSessionId(): string {
  try {
    // @ts-ignore — crypto.randomUUID exists in Hermes recent enough
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch { /* fall through */ }
  return (
    Date.now().toString(36) + '-' +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10)
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Copy — all user-facing strings
// ─────────────────────────────────────────────────────────────────────────────

const COPY = {
  fr: {
    greeting: 'Qu\'est-ce qui te préoccupe aujourd\'hui ?',
    inputPlaceholder: 'Pose ta question…',
    safetyNote: 'Anoqi informe, elle ne diagnostique pas. Consulte toujours ton médecin.',
    summaryBanner: 'Générer un résumé pour ton médecin →',
    sourcesLabel: 'Sources',
    send: 'Envoyer',
    attach: 'Joindre un document',
    errorGeneric: 'Une erreur s\'est produite. Réessaie.',
    introMessage: 'Bonjour, je suis anoqi. Pose-moi toutes tes questions — je te montrerai toujours la source derrière chaque réponse. Et rien de ce que tu partages ici n\'est lié à ton nom ou à ton identité.',
    consentGate: {
      title: 'Avant ta première question',
      subtitle: 'Quelques points pour utiliser Anoqi en toute confiance.',
      points: [
        'Anoqi t\'informe, elle ne pose pas de diagnostic.',
        'Tes données sont pseudonymisées avant tout traitement.',
        'Tes données sont hébergées en Europe (UE).',
        'Tu peux demander la suppression de tes données à tout moment.',
      ],
      cta: 'Je comprends et j\'accepte',
      footnote: 'Pour le consentement détaillé, crée un compte plus tard.',
    },
  },
  en: {
    greeting: 'What\'s on your mind today?',
    inputPlaceholder: 'Ask your question…',
    safetyNote: 'Anoqi informs, it doesn\'t diagnose. Always consult your doctor.',
    summaryBanner: 'Generate a summary for your doctor →',
    sourcesLabel: 'Sources',
    send: 'Send',
    attach: 'Attach a document',
    errorGeneric: 'Something went wrong. Please try again.',
    introMessage: 'Hi, I\'m anoqi. Ask me anything — I\'ll always show you the source behind my answer. And nothing you share here is linked to your name or any personal identifier.',
    consentGate: {
      title: 'Before your first question',
      subtitle: 'A few things so you can use Anoqi with full confidence.',
      points: [
        'Anoqi informs you — it does not diagnose.',
        'Your data is pseudonymised before any processing.',
        'Your data is hosted in Europe (EU).',
        'You can request deletion of your data at any time.',
      ],
      cta: 'I understand and agree',
      footnote: 'For detailed consent, sign up later.',
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Starter questions — 4 per objective, bilingual
// ─────────────────────────────────────────────────────────────────────────────

const STARTERS: Record<HealthObjective | 'general', { fr: string[]; en: string[] }> = {
  symptoms: {
    fr: [
      'J\'ai des règles irrégulières depuis 3 mois',
      'J\'ai des douleurs pelviennes — que dois-je savoir ?',
      'Qu\'est-ce qui pourrait expliquer ma fatigue ?',
      'Comment préparer ma consultation gynécologique ?',
    ],
    en: [
      'I\'ve been having irregular periods for 3 months',
      'I have pelvic pain — what should I know?',
      'What could be causing my fatigue?',
      'How do I prepare for a gynaecology appointment?',
    ],
  },
  contraception: {
    fr: [
      'Quelle est la différence entre la pilule et le stérilet ?',
      'Je veux arrêter la pilule — à quoi m\'attendre ?',
      'Quels effets secondaires peuvent avoir les contraceptifs ?',
      'La pilule fait-elle vraiment grossir ?',
    ],
    en: [
      'What\'s the difference between the pill and the coil?',
      'I want to stop the pill — what should I expect?',
      'What side effects can I expect from contraceptives?',
      'Does the pill really cause weight gain?',
    ],
  },
  menopause: {
    fr: [
      'Quels sont les premiers signes de la périménopause ?',
      'Le THM est-il fait pour moi ?',
      'Comment gérer les bouffées de chaleur ?',
      'Que fait la ménopause à mes os ?',
    ],
    en: [
      'What are the first signs of perimenopause?',
      'Is HRT right for me?',
      'How do I manage hot flashes?',
      'What does menopause do to my bones?',
    ],
  },
  fertility: {
    fr: [
      'Comment repérer ma fenêtre de fertilité ?',
      'Qu\'est-ce qui influence la qualité des ovules ?',
      'J\'essaie depuis 6 mois — quand consulter ?',
      'Que m\'indique la longueur de mon cycle ?',
    ],
    en: [
      'How do I track my fertile window?',
      'What affects egg quality?',
      'I\'ve been trying for 6 months — when should I see a doctor?',
      'What does my cycle length tell me?',
    ],
  },
  general: {
    fr: [
      'Je veux mieux comprendre mes hormones',
      'Je me sens épuisée — est-ce hormonal ?',
      'Comment les hormones influencent mon énergie et mes performances ?',
      'Comment trouver un médecin qui m\'écoute vraiment ?',
    ],
    en: [
      'I want to understand my hormones better',
      'I\'ve been feeling exhausted — could it be hormonal?',
      'How do hormones affect my energy and performance?',
      'How do I find a doctor who listens?',
    ],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// TypingIndicator — three pulsing dots
// ─────────────────────────────────────────────────────────────────────────────

function TypingIndicator() {
  const dots = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ]

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.delay((2 - i) * 150),
        ])
      )
    )
    animations.forEach(a => a.start())
    return () => animations.forEach(a => a.stop())
  }, [])

  return (
    <View style={styles.typingWrapper}>
      <View style={styles.typingBubble}>
        {dots.map((dot, i) => (
          <Animated.View key={i} style={[styles.typingDot, { opacity: dot }]} />
        ))}
      </View>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SourceChip — tappable source pill
// ─────────────────────────────────────────────────────────────────────────────

function SourceChip({ source }: { source: Source }) {
  const labelBadge = source.label ? `[${source.label}] ` : ''
  return (
    <TouchableOpacity
      style={styles.sourceChip}
      onPress={() => source.url && Linking.openURL(source.url)}
      accessibilityRole={source.url ? 'link' : 'button'}
      accessibilityLabel={`${source.label ? source.label + ' — ' : ''}${source.name} · ${source.topic}`}
    >
      {source.label && <Text style={styles.sourceChipLabel}>{labelBadge}</Text>}
      <Text style={styles.sourceChipName}>{source.name}</Text>
      {source.topic ? <Text style={styles.sourceChipDot}> · </Text> : null}
      {source.topic ? <Text style={styles.sourceChipTopic}>{source.topic}</Text> : null}
    </TouchableOpacity>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MessageBubble
// ─────────────────────────────────────────────────────────────────────────────

function MessageBubble({ message, language }: { message: Message; language: Language }) {
  const isUser = message.role === 'user'
  const copy = COPY[language]

  return (
    <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAnoqi]}>
      {!isUser && (
        <View style={styles.avatarDot} />
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAnoqi]}>
        <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAnoqi]}>
          {message.text}
          {message.isStreaming && (
            <Text style={styles.cursor}>▋</Text>
          )}
        </Text>

        {/* Safety note — first anoqi message only */}
        {!isUser && message.isFirst && (
          <View style={styles.safetyNote}>
            <Text style={styles.safetyNoteText}>{copy.safetyNote}</Text>
          </View>
        )}

        {/* Source chips */}
        {!isUser && !message.isStreaming && message.sources && message.sources.length > 0 && (
          <View style={styles.sourcesRow}>
            {message.sources.map((s, i) => (
              <SourceChip key={i} source={s} />
            ))}
          </View>
        )}
      </View>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ChatScreen
// ─────────────────────────────────────────────────────────────────────────────

export function ChatScreen() {
  const navigation = useNavigation<any>()
  const { language, objective } = useOnboarding()
  const copy = COPY[language]

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [userMessageCount, setUserMessageCount] = useState(0)

  const flatListRef = useRef<FlatList>(null)
  const anoqiMessageCount = useRef(0)
  // Server-assigned conversation UUID. Null until the first /chat response
  // creates it; reused on every subsequent turn so the server can rebuild
  // history. Stays in the screen's lifetime — leaving and re-entering Chat
  // starts a fresh conversation, which matches the current UX.
  const conversationIdRef = useRef<string | null>(null)

  // ── Consent gate (anon-mode lighter "I understand and agree") ─
  // The "Commencer la conversation →" shortcut on Objective bypasses formal
  // Consent, so we block the chat UI here until the user accepts the short
  // version. ConsentScreen mirrors this flag — signed-up users skip the
  // gate. See ROADMAP "Consent strategy (GDPR — three-tier)".
  // ──────────────────────────────────────────────────────────────
  const [consentChecked, setConsentChecked] = useState(false)
  const [consentAccepted, setConsentAccepted] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem('anoqi_chat_consent_accepted').then(v => {
      setConsentAccepted(v === 'true')
      setConsentChecked(true)
    })
  }, [])

  async function handleAcceptConsent() {
    await AsyncStorage.setItem('anoqi_chat_consent_accepted', 'true')
    setConsentAccepted(true)
  }

  // ── First-visit intro message ─────────────────────────────────
  // Deferred until consent is accepted so the persisted intro_shown flag
  // isn't burned before the user actually sees the chat.
  useEffect(() => {
    if (!consentAccepted) return
    const currentLanguage = language // capture at mount
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

  const starters = STARTERS[objective ?? 'general'][language]
  const showSummaryBanner = userMessageCount >= 3

  // ── Streaming effect ──────────────────────────────────────────
  useEffect(() => {
    if (!streamingId) return

    const msg = messages.find(m => m.id === streamingId)
    if (!msg) return

    if (msg.text.length >= msg.fullText.length) {
      setMessages(prev =>
        prev.map(m => m.id === streamingId ? { ...m, isStreaming: false } : m)
      )
      setStreamingId(null)
      return
    }

    const chunkSize = 3
    const timer = setTimeout(() => {
      setMessages(prev =>
        prev.map(m =>
          m.id === streamingId
            ? { ...m, text: m.fullText.slice(0, m.text.length + chunkSize) }
            : m
        )
      )
    }, 18)

    return () => clearTimeout(timer)
  }, [streamingId, messages])

  // ── Scroll to bottom on new message ──────────────────────────
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80)
    }
  }, [messages.length])

  // ── Send a message ────────────────────────────────────────────
  const handleSend = useCallback(async (text?: string) => {
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

    setMessages(prev => [...prev, userMessage])
    setUserMessageCount(prev => prev + 1)
    setIsTyping(true)

    // ── Call /functions/v1/chat ─────────────────────────────────
    // Anon-mode sessions: we mint a session_id once per install and stash
    // it in AsyncStorage. The server accepts either an auth JWT or a
    // sessionId (see api/functions/chat.ts step 2).
    //
    // Failure path: any error (network, 503, blocked) surfaces as an
    // error bubble. The server-side policy layer and citation parser
    // already strip unsafe / hallucinated content before it reaches here.
    try {
      let sessionId = await AsyncStorage.getItem('anoqi_session_id')
      if (!sessionId) {
        sessionId = generateSessionId()
        await AsyncStorage.setItem('anoqi_session_id', sessionId)
      }

      const { data, error } = await supabase.functions.invoke<ChatApiResponse>('chat', {
        body: {
          message:        content,
          conversationId: conversationIdRef.current,
          sessionId,
          journeyType:    objective ?? 'free_chat',
          language,
        },
      })

      setIsTyping(false)

      if (error || !data) {
        const errId = `error-${Date.now()}`
        setMessages(prev => [...prev, {
          id:         errId,
          role:       'anoqi',
          text:       copy.errorGeneric,
          fullText:   copy.errorGeneric,
          isStreaming: false,
          timestamp:  new Date(),
        }])
        return
      }

      conversationIdRef.current = data.conversationId

      const isFirstAnoqi = anoqiMessageCount.current === 0
      anoqiMessageCount.current += 1

      const displaySources: Source[] = (data.message.sources_display ?? []).map(s => ({
        label:       s.label,
        name:        s.name,
        topic:       s.topic,
        url:         s.url,
        source_kind: s.source_kind,
        source_ref:  s.source_ref,
      }))

      const anoqiMessage: Message = {
        id:          data.message.id,
        role:        'anoqi',
        text:        '',
        fullText:    data.message.content,
        isStreaming: true,
        sources:     displaySources,
        isFirst:     isFirstAnoqi,
        timestamp:   new Date(data.message.createdAt),
      }

      setMessages(prev => [...prev, anoqiMessage])
      setStreamingId(data.message.id)
    } catch (e) {
      setIsTyping(false)
      console.error('[ChatScreen] /chat call failed:', e)
      const errId = `error-${Date.now()}`
      setMessages(prev => [...prev, {
        id:          errId,
        role:        'anoqi',
        text:        copy.errorGeneric,
        fullText:    copy.errorGeneric,
        isStreaming: false,
        timestamp:   new Date(),
      }])
    }
  }, [input, language, objective])

  // ── Consent gate render (anon-mode lighter consent before chat) ──
  // Wait for the AsyncStorage check to resolve so users who've already
  // accepted don't get a gate flash on every Chat mount.
  if (!consentChecked) {
    return <SafeAreaView style={styles.safe} />
  }
  if (!consentAccepted) {
    const gate = copy.consentGate
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.gateContainer}>
          <View style={styles.gateHeader}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={language === 'fr' ? 'Retour' : 'Back'}
            >
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.wordmark}>anoqi</Text>
          </View>
          <View style={styles.gateContent}>
            <Text style={styles.gateTitle}>{gate.title}</Text>
            <Text style={styles.gateSubtitle}>{gate.subtitle}</Text>
            <View style={styles.gateList}>
              {gate.points.map((p, i) => (
                <View key={i} style={styles.gateRow}>
                  <Text style={styles.gateBullet}>✓</Text>
                  <Text style={styles.gateRowText}>{p}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.gateFooter}>
            <TouchableOpacity
              style={styles.gateButton}
              onPress={handleAcceptConsent}
              accessibilityRole="button"
            >
              <Text style={styles.gateButtonText}>{gate.cta}</Text>
            </TouchableOpacity>
            <Text style={styles.gateFootnote}>{gate.footnote}</Text>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >

        {/* ── Header ───────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={language === 'fr' ? 'Retour' : 'Back'}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.wordmark}>anoqi</Text>
        </View>

        {/* ── Message list ─────────────────────────────────── */}
        {messages.length === 0 ? (
          // Empty state
          <View style={styles.emptyState}>
            <Text style={styles.emptyGreeting}>{copy.greeting}</Text>
            <View style={styles.starterList}>
              {starters.map((q, i) => (
                <Pressable
                  key={i}
                  style={({ pressed }) => [styles.starterChip, pressed && styles.starterChipPressed]}
                  onPress={() => handleSend(q)}
                  accessibilityRole="button"
                >
                  <Text style={styles.starterChipText}>{q}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={m => m.id}
            renderItem={({ item }) => (
              <MessageBubble message={item} language={language} />
            )}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            ListFooterComponent={
              <>
                {isTyping && <TypingIndicator />}
                {/* Show starter chips below intro message until user sends first message */}
                {userMessageCount === 0 && !streamingId && (
                  <View style={styles.starterListInline}>
                    {starters.map((q, i) => (
                      <Pressable
                        key={i}
                        style={({ pressed }) => [styles.starterChip, pressed && styles.starterChipPressed]}
                        onPress={() => handleSend(q)}
                        accessibilityRole="button"
                      >
                        <Text style={styles.starterChipText}>{q}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </>
            }
          />
        )}

        {/* ── Summary banner ───────────────────────────────── */}
        {showSummaryBanner && messages.length > 0 && (
          <TouchableOpacity
            style={styles.summaryBanner}
            onPress={() => { /* navigate to SummaryScreen */ }}
            accessibilityRole="button"
          >
            <Text style={styles.summaryBannerText}>{copy.summaryBanner}</Text>
          </TouchableOpacity>
        )}

        {/* ── Input bar ────────────────────────────────────── */}
        <View style={styles.inputBar}>
          {/* Attach */}
          <TouchableOpacity
            style={styles.attachButton}
            onPress={() => { /* open document picker */ }}
            accessibilityRole="button"
            accessibilityLabel={copy.attach}
          >
            <Text style={styles.attachIcon}>⊕</Text>
          </TouchableOpacity>

          {/* Text input */}
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={copy.inputPlaceholder}
            placeholderTextColor="#BBBBBB"
            multiline
            maxLength={2000}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={() => handleSend()}
          />

          {/* Send */}
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || isTyping) && styles.sendButtonDisabled]}
            onPress={() => handleSend()}
            disabled={!input.trim() || isTyping}
            accessibilityRole="button"
            accessibilityLabel={copy.send}
          >
            <Text style={styles.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFF8F5',
  },
  flex: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE8E0',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  backIcon: {
    fontSize: 22,
    color: '#FF0472',
    lineHeight: 24,
  },
  wordmark: {
    fontSize: 18,
    fontFamily: 'BricolageGrotesque-ExtraBold',
    color: '#FF0472',
    letterSpacing: -0.5,
  },

  // Empty state
  emptyState: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingBottom: 60,
  },
  emptyGreeting: {
    fontSize: 26,
    fontFamily: 'BricolageGrotesque-ExtraBold',
    color: '#000E28',
    letterSpacing: -0.8,
    marginBottom: 28,
    textAlign: 'center',
  },
  starterList: {
    gap: 10,
  },
  starterListInline: {
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  starterChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#EDE5E0',
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  starterChipPressed: {
    backgroundColor: '#FFF3EE',
    borderColor: '#FF6B3D',
  },
  starterChipText: {
    fontSize: 15,
    fontFamily: 'DMSans-Regular',
    color: '#000E28',
    lineHeight: 22,
  },

  // Message list
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },

  // Message rows
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAnoqi: {
    justifyContent: 'flex-start',
  },

  // Avatar dot (anoqi side)
  avatarDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF0472',
    marginBottom: 4,
    flexShrink: 0,
  },

  // Bubbles
  bubble: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bubbleUser: {
    backgroundColor: '#FF0472',
    borderBottomRightRadius: 4,
  },
  bubbleAnoqi: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000E28',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 23,
    fontFamily: 'DMSans-Regular',
  },
  bubbleTextUser: {
    color: '#FFFFFF',
  },
  bubbleTextAnoqi: {
    color: '#000E28',
  },
  cursor: {
    color: '#FF0472',
    fontWeight: '200',
  },

  // Safety note
  safetyNote: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EDE5E0',
  },
  safetyNoteText: {
    fontSize: 11,
    fontFamily: 'DMSans-Regular',
    color: '#AAAAAA',
    lineHeight: 16,
    fontStyle: 'italic',
  },

  // Sources
  sourcesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  sourceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3EE',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#FFB0CC',
  },
  sourceChipLabel: {
    fontSize: 10,
    fontFamily: 'DMSans-Medium',
    color: '#FF0472',
    fontWeight: '700',
    marginRight: 2,
  },
  sourceChipName: {
    fontSize: 11,
    fontFamily: 'DMSans-Medium',
    color: '#FF6B3D',
    fontWeight: '600',
  },
  sourceChipDot: {
    fontSize: 11,
    color: '#FFB0CC',
  },
  sourceChipTopic: {
    fontSize: 11,
    fontFamily: 'DMSans-Regular',
    color: '#888888',
  },

  // Typing indicator
  typingWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingLeft: 16,
    paddingTop: 4,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 14,
    shadowColor: '#000E28',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FF6B3D',
  },

  // Summary banner
  summaryBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#FFF3EE',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FFB0CC',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  summaryBannerText: {
    fontSize: 14,
    fontFamily: 'DMSans-Medium',
    color: '#FF6B3D',
    fontWeight: '600',
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 16 : 10,
    borderTopWidth: 1,
    borderTopColor: '#EDE5E0',
    backgroundColor: '#FFF8F5',
    gap: 8,
  },
  attachButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF3EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  attachIcon: {
    fontSize: 20,
    color: '#FF6B3D',
    lineHeight: 24,
  },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#EDE5E0',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    fontFamily: 'DMSans-Regular',
    color: '#000E28',
    maxHeight: 120,
    lineHeight: 22,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FF0472',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  sendButtonDisabled: {
    backgroundColor: '#E8DDD9',
  },
  sendIcon: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
    lineHeight: 22,
  },

  // Consent gate (lighter "I understand and agree" — anon-mode entry)
  gateContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  gateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
  },
  gateContent: {
    flex: 1,
    justifyContent: 'center',
    gap: 24,
  },
  gateTitle: {
    fontSize: 28,
    fontFamily: 'BricolageGrotesque-ExtraBold',
    color: '#000E28',
    letterSpacing: -0.8,
  },
  gateSubtitle: {
    fontSize: 15,
    fontFamily: 'DMSans-Regular',
    color: '#777777',
    lineHeight: 22,
  },
  gateList: {
    gap: 14,
  },
  gateRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  gateBullet: {
    fontSize: 14,
    color: '#FF0472',
    fontFamily: 'DMSans-Medium',
    fontWeight: '700',
    marginTop: 1,
  },
  gateRowText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'DMSans-Regular',
    color: '#000E28',
    lineHeight: 21,
  },
  gateFooter: {
    paddingTop: 16,
    gap: 12,
  },
  gateButton: {
    backgroundColor: '#FF0472',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  gateButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'BricolageGrotesque-ExtraBold',
    letterSpacing: -0.3,
  },
  gateFootnote: {
    fontSize: 12,
    fontFamily: 'DMSans-Regular',
    color: '#AAAAAA',
    textAlign: 'center',
  },
})
