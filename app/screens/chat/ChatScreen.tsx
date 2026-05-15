// Anoqi — ChatScreen.
//
// Conversation UI. Peony user bubbles, white Anoqi bubbles with Cotton Rose
// border, sage avatar with peony bloom glyph, breathing sage typing dots,
// peony send button. Empty state: h3 greeting + 2x2 starter grid. Consent
// gate is a Cotton Rose overlay (not a black scrim — hostile in this context).

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  TextInput,
  View,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/native'

import {
  useOnboarding,
  type HealthObjective,
  type Language,
} from '../../context/OnboardingContext'
import { palette, useTheme } from '../../theme'
import { postChat, AnoqiApiError, type SourceDisplay } from '../../lib/anoqiApi'
import {
  BackHeader,
  BreathingForm,
  Bubble,
  Button,
  GoalSheet,
  Icon,
  type IconName,
  LiquidEmber,
  MarkdownText,
  SourceChip,
  StreamingCursor,
  Text,
  TypingIndicator,
} from '../../components'

const OBJECTIVE_LABELS: Record<HealthObjective, { fr: string; en: string; icon: IconName }> = {
  symptoms:      { fr: 'Symptômes',     en: 'Symptoms',     icon: 'Stethoscope' },
  contraception: { fr: 'Contraception', en: 'Contraception', icon: 'Pill' },
  menopause:     { fr: 'Ménopause',     en: 'Menopause',    icon: 'Sunset' },
  fertility:     { fr: 'Fertilité',     en: 'Fertility',    icon: 'Sprout' },
  general:       { fr: 'Santé générale', en: 'General health', icon: 'MessageCircle' },
}

type Source = { name: string; topic: string; url?: string }

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
    introMessage:
      'Bonjour, je suis Anoqi. Pose-moi toutes tes questions — je te montrerai toujours la source derrière chaque réponse. Rien de ce que tu partages ici n\'est lié à ton nom.',
    consentGate: {
      title: 'Avant ta première question',
      subtitle: 'Quelques points pour utiliser Anoqi en toute confiance.',
      points: [
        { icon: 'BookOpen' as IconName, text: 'Anoqi t\'informe, elle ne pose pas de diagnostic.' },
        { icon: 'ShieldCheck' as IconName, text: 'Tes données sont pseudonymisées avant tout traitement.' },
        { icon: 'Globe' as IconName, text: 'Tes données sont hébergées en Europe (UE).' },
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
    introMessage:
      "Hi, I'm Anoqi. Ask me anything — I'll always show you the source behind my answer. Nothing you share here is linked to your name.",
    consentGate: {
      title: 'Before your first question',
      subtitle: 'A few things so you can use Anoqi with full confidence.',
      points: [
        { icon: 'BookOpen' as IconName, text: 'Anoqi informs you — it does not diagnose.' },
        { icon: 'ShieldCheck' as IconName, text: 'Your data is pseudonymised before any processing.' },
        { icon: 'Globe' as IconName, text: 'Your data is hosted in Europe (EU).' },
        { icon: 'Trash2' as IconName, text: 'You can request deletion at any time.' },
      ],
      cta: 'I understand and agree',
      footnote: 'For detailed consent, sign up later.',
    },
  },
} as const

// Starter cards. The short `label` is what the user sees on the card; the
// full `prompt` is what gets sent to the LLM as the user turn — gives the
// model enough context to answer well without forcing chatty card copy.
type Starter = { label: string; prompt: string }

const STARTERS: Record<HealthObjective, { fr: Starter[]; en: Starter[] }> = {
  symptoms: {
    fr: [
      { label: "Règles irrégulières",          prompt: "J'ai des règles irrégulières depuis 3 mois" },
      { label: "Préparer ma consultation gynéco", prompt: "Comment préparer ma consultation gynécologique ?" },
      { label: "Pourquoi cette fatigue ?",    prompt: "Qu'est-ce qui pourrait expliquer ma fatigue ?" },
      { label: "Douleurs pelviennes",         prompt: "J'ai des douleurs pelviennes — que dois-je savoir ?" },
    ],
    en: [
      { label: "Irregular periods",       prompt: "I've been having irregular periods for 3 months" },
      { label: "Prepare for my gynae appt", prompt: "How do I prepare for a gynaecology appointment?" },
      { label: "Why this fatigue?",       prompt: "What could be causing my fatigue?" },
      { label: "Pelvic pain",             prompt: "I have pelvic pain — what should I know?" },
    ],
  },
  contraception: {
    fr: [
      { label: "Pilule vs stérilet",          prompt: "Quelle est la différence entre la pilule et le stérilet ?" },
      { label: "Arrêter la pilule",           prompt: "Je veux arrêter la pilule — à quoi m'attendre ?" },
      { label: "Effets secondaires",          prompt: "Quels effets secondaires peuvent avoir les contraceptifs ?" },
      { label: "Pilule et prise de poids ?",  prompt: "La pilule fait-elle vraiment grossir ?" },
    ],
    en: [
      { label: "Pill vs coil",                prompt: "What's the difference between the pill and the coil?" },
      { label: "Stopping the pill",           prompt: "I want to stop the pill — what should I expect?" },
      { label: "Side effects",                prompt: "What side effects can I expect from contraceptives?" },
      { label: "Pill and weight gain?",       prompt: "Does the pill really cause weight gain?" },
    ],
  },
  menopause: {
    fr: [
      { label: "Signes de périménopause",     prompt: "Quels sont les premiers signes de la périménopause ?" },
      { label: "Le THM est-il pour moi ?",    prompt: "Le THM est-il fait pour moi ?" },
      { label: "Gérer les bouffées de chaleur", prompt: "Comment gérer les bouffées de chaleur ?" },
      { label: "Ménopause et mes os ?",       prompt: "Que fait la ménopause à mes os ?" },
    ],
    en: [
      { label: "Signs of perimenopause",      prompt: "What are the first signs of perimenopause?" },
      { label: "Is HRT right for me?",        prompt: "Is HRT right for me?" },
      { label: "Manage hot flashes",          prompt: "How do I manage hot flashes?" },
      { label: "Menopause and my bones?",     prompt: "What does menopause do to my bones?" },
    ],
  },
  fertility: {
    fr: [
      { label: "Ma fenêtre de fertilité",     prompt: "Comment repérer ma fenêtre de fertilité ?" },
      { label: "Qualité des ovules",          prompt: "Qu'est-ce qui influence la qualité des ovules ?" },
      { label: "Essais depuis 6 mois",        prompt: "J'essaie depuis 6 mois — quand consulter ?" },
      { label: "Longueur de mon cycle",       prompt: "Que m'indique la longueur de mon cycle ?" },
    ],
    en: [
      { label: "My fertile window",           prompt: "How do I track my fertile window?" },
      { label: "Egg quality",                 prompt: "What affects egg quality?" },
      { label: "Trying for 6 months",         prompt: "I've been trying for 6 months — when should I see a doctor?" },
      { label: "My cycle length",             prompt: "What does my cycle length tell me?" },
    ],
  },
  general: {
    fr: [
      { label: "Mieux comprendre mes hormones",    prompt: "Je veux mieux comprendre mes hormones" },
      { label: "Épuisée — est-ce hormonal ?",      prompt: "Je me sens épuisée — est-ce hormonal ?" },
      { label: "Hormones, énergie, performance ?", prompt: "Comment les hormones influencent mon énergie et mes performances ?" },
      { label: "Trouver un médecin qui m'écoute ?", prompt: "Comment trouver un médecin qui m'écoute vraiment ?" },
    ],
    en: [
      { label: "Help me understand my hormones",   prompt: "I want to understand my hormones better" },
      { label: "Exhausted — could it be hormonal?", prompt: "I've been feeling exhausted — could it be hormonal?" },
      { label: "Hormones, energy, performance?",   prompt: "How do hormones affect my energy and performance?" },
      { label: "Find a doctor who listens?",       prompt: "How do I find a doctor who listens?" },
    ],
  },
}

// Map the BE's `sources_display` payload into the UI's compact Source shape.
// Pathway-typed sources don't have a URL on the BE; we leave it undefined and
// the SourceChip render handles non-link rendering.
function toSource(d: SourceDisplay): Source {
  return { name: d.name, topic: d.topic, url: d.url }
}

export function ChatScreen() {
  const navigation = useNavigation<any>()
  const { language, objective, setObjective, sessionId } = useOnboarding()
  const theme = useTheme()
  const copy = COPY[language]

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [userMessageCount, setUserMessageCount] = useState(0)
  const [consentChecked, setConsentChecked] = useState(false)
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [goalSheetOpen, setGoalSheetOpen] = useState(false)

  const objKey = objective ?? 'general'
  const objMeta = OBJECTIVE_LABELS[objKey]

  const flatListRef = useRef<FlatList>(null)
  const anoqiMessageCount = useRef(0)
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

  async function handleAcceptConsent() {
    await AsyncStorage.setItem('anoqi_chat_consent_accepted', 'true')
    setConsentAccepted(true)
  }

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
              text:     COPY[language].introMessage,
              fullText: COPY[language].introMessage,
              isStreaming: false,
            }
          : m,
      ),
    )
  }, [language])

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

  const starters = STARTERS[objective ?? 'general'][language]
  const showSummaryBanner = userMessageCount >= 3

  useEffect(() => {
    if (!streamingId) return
    const msg = messages.find((m) => m.id === streamingId)
    if (!msg) return
    if (msg.text.length >= msg.fullText.length) {
      setMessages((prev) =>
        prev.map((m) => (m.id === streamingId ? { ...m, isStreaming: false } : m)),
      )
      setStreamingId(null)
      return
    }
    const timer = setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamingId
            ? { ...m, text: m.fullText.slice(0, m.text.length + 3) }
            : m,
        ),
      )
    }, 18)
    return () => clearTimeout(timer)
  }, [streamingId, messages])

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80)
    }
  }, [messages.length])

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
      setIsTyping(true)

      const isFirstAnoqi = anoqiMessageCount.current === 0

      try {
        const response = await postChat({
          message:        content,
          language,
          sessionId,
          objective,
          conversationId: conversationIdRef.current ?? undefined,
        })

        // Capture the server-assigned conversation UUID on the first turn so
        // subsequent calls thread into the same conversation.
        if (response.conversationId && !conversationIdRef.current) {
          conversationIdRef.current = response.conversationId
        }

        setIsTyping(false)
        anoqiMessageCount.current += 1

        const sources: Source[] = response.message.sources_display.map(toSource)
        const anoqiId = `anoqi-${response.message.id ?? Date.now()}`
        const anoqiMessage: Message = {
          id: anoqiId,
          role: 'anoqi',
          text: '',
          fullText: response.message.content,
          isStreaming: true,
          sources,
          isFirst: isFirstAnoqi,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, anoqiMessage])
        setStreamingId(anoqiId)
      } catch (err) {
        setIsTyping(false)
        const friendly = err instanceof AnoqiApiError
          ? (language === 'fr'
              ? `Désolée, je n'arrive pas à répondre pour l'instant (${err.status || 'réseau'}). Réessaie dans un instant.`
              : `Sorry, I can't answer right now (${err.status || 'network'}). Please try again in a moment.`)
          : (language === 'fr'
              ? `Quelque chose n'a pas fonctionné. Réessaie.`
              : `Something went wrong. Please try again.`)
        const errId = `anoqi-error-${Date.now()}`
        setMessages((prev) => [
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
        ])
        if (__DEV__) console.warn('[chat] postChat failed:', err)
      }
    },
    [input, language, objective, sessionId],
  )

  // ── Consent gate (Cotton Rose overlay — not a black scrim) ─────────────
  if (!consentChecked) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.canvas }} />
  }
  if (!consentAccepted) {
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
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.canvas }}>
      {/* Decorative breathing form anchored low-right behind everything. Same
          composition as the Welcome screen so the brand visual stays present
          in long conversation sessions without crowding the messages. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          right: -160,
          bottom: 80,
          opacity: 0.45,
        }}
      >
        <BreathingForm size={520} />
      </View>

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
          // Empty state
          <View
            style={{
              flex: 1,
              paddingHorizontal: theme.spacing[6],
              justifyContent: 'center',
              paddingBottom: theme.spacing[16],
            }}
          >
            <Text variant="h2" tone="primary" align="center">
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
                <View
                  key={i}
                  style={{
                    flexGrow: 1,
                    flexBasis: '47%',
                    borderRadius: 22,
                    overflow: 'hidden',
                    position: 'relative',
                    minHeight: 110,
                  }}
                >
                  <LiquidEmber
                    intensity={0.55}
                    fuchsia={false}
                    blur={36}
                    borderRadius={22}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={q.label}
                    onPress={() => handleSend(q.prompt)}
                    style={({ pressed }) => [
                      {
                        flex: 1,
                        backgroundColor: pressed
                          ? 'rgba(255, 245, 238, 0.10)'
                          : 'rgba(255, 245, 238, 0.05)',
                        borderWidth: 1,
                        borderColor: 'rgba(255, 245, 238, 0.09)',
                        borderRadius: 22,
                        paddingVertical: theme.spacing[4],
                        paddingHorizontal: theme.spacing[4],
                        justifyContent: 'space-between',
                      },
                      Platform.OS === 'web'
                        ? ({
                            backdropFilter: 'blur(18px) saturate(140%)',
                            WebkitBackdropFilter: 'blur(18px) saturate(140%)',
                          } as any)
                        : null,
                    ]}
                  >
                    <Icon
                      name="Sparkles"
                      size={14}
                      color={palette.ember[300]}
                      strokeWidth={1.8}
                    />
                    <Text
                      variant="h4Italic"
                      style={{
                        color: palette.warmWhite[100],
                        marginTop: theme.spacing[3],
                        lineHeight: 24,
                      }}
                    >
                      {q.label}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  gap: theme.spacing[2],
                  marginBottom: theme.spacing[3],
                  justifyContent: item.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <View style={{ maxWidth: '85%' }}>
                  <Bubble role={item.role}>
                    {item.role === 'anoqi' && !item.isStreaming ? (
                      // Done streaming — re-render the same text through the
                      // markdown formatter so **bold** and `*  bullets` from
                      // the BE pick up real styling.
                      <MarkdownText
                        style={{
                          ...theme.typography.h4Italic,
                          color: theme.colors.text.primary,
                        }}
                      >
                        {item.text}
                      </MarkdownText>
                    ) : (
                      <Text
                        variant={item.role === 'user' ? 'body' : 'h4Italic'}
                        style={{
                          color: item.role === 'user'
                            ? theme.colors.accent.primaryOnText
                            : theme.colors.text.primary,
                        }}
                      >
                        {item.text}
                        {item.isStreaming ? (
                          <>
                            <StreamingCursor />
                            {/* Invisible ghost of the remaining text. Reserves
                                the final bubble shape so streamed characters
                                don't cause the layout to jitter line-by-line. */}
                            <Text style={{ opacity: 0 }}>
                              {item.fullText.slice(item.text.length)}
                            </Text>
                          </>
                        ) : null}
                      </Text>
                    )}

                    {!item.isStreaming && item.isFirst ? (
                      <View
                        style={{
                          marginTop: theme.spacing[3],
                          paddingTop: theme.spacing[3],
                          borderTopWidth: 1,
                          borderTopColor: theme.colors.border.subtle,
                        }}
                      >
                        <Text variant="caption" tone="tertiary">
                          {copy.safetyNote}
                        </Text>
                      </View>
                    ) : null}

                    {!item.isStreaming && item.sources && item.sources.length > 0 ? (
                      <View
                        style={{
                          flexDirection: 'row',
                          flexWrap: 'wrap',
                          gap: theme.spacing[2],
                          marginTop: theme.spacing[3],
                        }}
                      >
                        {item.sources.map((s: Source, i: number) => (
                          <SourceChip
                            key={i}
                            label={`${s.name} · ${s.topic}`}
                            onPress={() => s.url && Linking.openURL(s.url)}
                          />
                        ))}
                      </View>
                    ) : null}
                  </Bubble>
                </View>
              </View>
            )}
            contentContainerStyle={{
              paddingHorizontal: theme.spacing[5],
              paddingTop: theme.spacing[4],
              paddingBottom: theme.spacing[3],
            }}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              <>
                {isTyping ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-end',
                      marginBottom: theme.spacing[3],
                    }}
                  >
                    <Bubble role="assistant">
                      <TypingIndicator />
                    </Bubble>
                  </View>
                ) : null}

                {userMessageCount === 0 && !streamingId ? (
                  // Mirror the empty-state grid below the intro so the cards
                  // are reachable on the very first visit (when the auto-intro
                  // has populated `messages` and the pure empty state path
                  // would never fire). Cards disappear after the first turn.
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: theme.spacing[3],
                      marginTop: theme.spacing[6],
                    }}
                  >
                    {starters.map((q, i) => (
                      <View
                        key={i}
                        style={{
                          flexGrow: 1,
                          flexBasis: '47%',
                          borderRadius: 22,
                          overflow: 'hidden',
                          position: 'relative',
                          minHeight: 110,
                        }}
                      >
                        <LiquidEmber
                          intensity={0.55}
                          fuchsia={false}
                          blur={36}
                          borderRadius={22}
                        />
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={q.label}
                          onPress={() => handleSend(q.prompt)}
                          style={({ pressed }) => [
                            {
                              flex: 1,
                              backgroundColor: pressed
                                ? 'rgba(255, 245, 238, 0.10)'
                                : 'rgba(255, 245, 238, 0.05)',
                              borderWidth: 1,
                              borderColor: 'rgba(255, 245, 238, 0.09)',
                              borderRadius: 22,
                              paddingVertical: theme.spacing[4],
                              paddingHorizontal: theme.spacing[4],
                              justifyContent: 'space-between',
                            },
                            Platform.OS === 'web'
                              ? ({
                                  backdropFilter: 'blur(18px) saturate(140%)',
                                  WebkitBackdropFilter: 'blur(18px) saturate(140%)',
                                } as any)
                              : null,
                          ]}
                        >
                          <Icon
                            name="Sparkles"
                            size={14}
                            color={palette.ember[300]}
                            strokeWidth={1.8}
                          />
                          <Text
                            variant="h4Italic"
                            style={{
                              color: palette.warmWhite[100],
                              marginTop: theme.spacing[3],
                              lineHeight: 24,
                            }}
                          >
                            {q.label}
                          </Text>
                        </Pressable>
                      </View>
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
            onPress={() => {
              /* navigate to SummaryScreen */
            }}
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

        {/* Input bar — sits above the floating LiquidTabBar. The pill is
            ~62px tall and floats 14px above the safe-area; 92px of bottom
            clearance keeps the input fully visible. */}
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
            backgroundColor: theme.colors.bg.canvas,
            gap: theme.spacing[2],
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.attach}
            onPress={() => {}}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: theme.colors.bg.surfaceMuted,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 1,
            }}
          >
            <Icon
              name="Paperclip"
              size={18}
              color={theme.colors.text.secondary}
              strokeWidth={1.6}
            />
          </Pressable>

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
            style={{
              flex: 1,
              backgroundColor: 'rgba(255, 245, 238, 0.04)',
              borderRadius: theme.radii.pill,
              borderWidth: 1,
              borderColor: 'rgba(255, 245, 238, 0.10)',
              paddingHorizontal: theme.spacing[4],
              paddingTop: Platform.OS === 'ios' ? 10 : 8,
              paddingBottom: Platform.OS === 'ios' ? 10 : 8,
              fontSize: 15,
              fontFamily: 'Inter-Regular',
              color: theme.colors.text.primary,
              maxHeight: 120,
              lineHeight: 22,
            }}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.send}
            onPress={() => handleSend()}
            disabled={!input.trim() || isTyping}
            style={[
              {
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor:
                  !input.trim() || isTyping
                    ? theme.colors.bg.surfaceWarm
                    : theme.colors.accent.primary,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 1,
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
              size={18}
              color={
                !input.trim() || isTyping
                  ? theme.colors.text.tertiary
                  : theme.colors.accent.primaryOnText
              }
              strokeWidth={2.4}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <GoalSheet
        visible={goalSheetOpen}
        selected={objective}
        language={language}
        onSelect={setObjective}
        onClose={() => setGoalSheetOpen(false)}
      />
    </SafeAreaView>
  )
}
