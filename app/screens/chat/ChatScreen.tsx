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
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  TextInput,
  View,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation, useIsFocused } from '@react-navigation/native'

import {
  useOnboarding,
  type Language,
} from '../../context/OnboardingContext'
import { palette, useTheme } from '../../theme'
import { STARTERS } from './starters'
import {
  BackHeader,
  BreathingForm,
  Bubble,
  Button,
  type CitationSource,
  ConsentSheet,
  Icon,
  type IconName,
  LiquidEmber,
  Markdown,
  parseMarkdown,
  StreamingCursor,
  Text,
  TypingIndicator,
} from '../../components'

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

const SAMPLE_SOURCES: Source[][] = [
  [
    { label: 'S1', name: 'NHS',  topic: 'Menstrual health', url: 'https://www.nhs.uk/conditions/periods/' },
    { label: 'S2', name: 'NICE', topic: 'Gynaecology',      url: 'https://www.nice.org.uk/guidance/ng88' },
    { label: 'S3', name: 'BMS',  topic: 'Endometriosis',    url: 'https://thebms.org.uk/publications/' },
  ],
  [
    { label: 'S1', name: 'FSRH', topic: 'Contraception',  url: 'https://www.fsrh.org/standards-and-guidance/' },
    { label: 'S2', name: 'NHS',  topic: 'Sexual health',  url: 'https://www.nhs.uk/contraception/' },
    { label: 'S3', name: 'NICE', topic: 'Contraception',  url: 'https://www.nice.org.uk/guidance/ng3' },
  ],
  [
    { label: 'S1', name: 'BMS',  topic: 'Menopause',  url: 'https://thebms.org.uk/publications/' },
    { label: 'S2', name: 'NICE', topic: 'Menopause',  url: 'https://www.nice.org.uk/guidance/ng23' },
    { label: 'S3', name: 'NHS',  topic: 'HRT',       url: 'https://www.nhs.uk/conditions/hormone-replacement-therapy-hrt/' },
  ],
]

const MOCK_RESPONSES: Record<Language, string[]> = {
  en: [
    `# What irregular periods can really mean

What you're describing is something **many women experience**, and it's worth taking seriously. Symptoms like these can have several underlying causes, and the right next step depends on which pattern fits you. [S1]

## Most likely causes

- **Hormonal fluctuations** — thyroid, prolactin, or perimenopausal shifts
- **PCOS or endometriosis** — especially if pain or skipped cycles are part of the picture [S2][S3]
- **Lifestyle factors** — sleep, weight change, intense exercise, or stress

## How to prepare for a consultation

Track the **timing, intensity, and any accompanying symptoms** for at least one full cycle. That gives your doctor a much clearer picture than recall alone. [S1][S2]

Would you like help building a summary you can bring with you?`,

    `# Why women's health research keeps missing the point

There are important nuances here that often get missed. Research conducted **specifically on women** — rather than extrapolated from male studies — shows that hormonal influences are significant and often underestimated. [S2]

## What the evidence actually says

- Recent NICE and FSRH guidelines lean toward a **personalised approach** over one-size-fits-all protocols [S1][S3]
- Cycle phase changes how the body responds to medication, diet, and training load
- Symptom clusters are more diagnostic than any single marker

The implication: treatment that works in week one of your cycle may not work in week three, and that's a feature of the biology, not a failure of the patient. [S2]`,

    `# Your symptoms are real — and there are evidence-based options

This is one of those areas where women are often dismissed, but the **evidence is clear**: your symptoms have a clinical basis, and there are paths forward. [S1]

## What the research supports

- First-line HRT for vasomotor symptoms is well-established in NICE NG23 [S2]
- Non-hormonal options exist for those who can't or prefer not to take HRT [S3]
- Bone-density monitoring is recommended for anyone with early menopause [S1][S2]

## What to ask your doctor

Bring a **symptom diary** spanning at least 6 weeks. Ask specifically about **bone health, mood, and sleep** — these are the three areas most often under-treated. [S2]`,
  ],
  fr: [
    `# Ce que des règles irrégulières peuvent vraiment signifier

Ce que tu décris est vécu par **beaucoup de femmes**, et ça mérite d'être pris au sérieux. Ces symptômes peuvent avoir plusieurs causes, et la suite dépend du schéma qui te correspond. [S1]

## Causes les plus probables

- **Fluctuations hormonales** — thyroïde, prolactine, ou périménopause
- **SOPK ou endométriose** — surtout si douleur ou cycles sautés sont présents [S2][S3]
- **Facteurs de vie** — sommeil, changement de poids, sport intense, stress

## Préparer ta consultation

Note le **moment, l'intensité et les symptômes associés** sur au moins un cycle complet. Ça donne à ton médecin une image bien plus claire que la mémoire seule. [S1][S2]

Tu veux que je t'aide à préparer un résumé à apporter ?`,

    `# Pourquoi la recherche sur la santé des femmes manque le coche

Il y a des nuances importantes ici qui passent souvent inaperçues. Les recherches menées **spécifiquement sur les femmes** — plutôt qu'extrapolées d'études masculines — montrent que les influences hormonales sont significatives et souvent sous-estimées. [S2]

## Ce que dit l'évidence

- Les recommandations NICE et FSRH penchent vers une **approche personnalisée** plutôt qu'un protocole universel [S1][S3]
- La phase du cycle modifie la réponse aux médicaments, à l'alimentation, à l'entraînement
- Les grappes de symptômes sont plus diagnostiques qu'un seul marqueur

Conséquence : un traitement qui marche en semaine 1 du cycle peut ne pas marcher en semaine 3 — c'est une caractéristique de la biologie, pas un échec de la patiente. [S2]`,

    `# Tes symptômes sont réels — et il existe des options fondées sur des preuves

C'est un domaine où les femmes sont souvent ignorées, mais les **preuves sont claires** : tes symptômes ont une base clinique, et des pistes existent. [S1]

## Ce que soutient la recherche

- Le THM en première ligne pour les symptômes vasomoteurs est bien établi (NICE NG23) [S2]
- Des options non hormonales existent pour celles qui ne peuvent ou ne veulent pas du THM [S3]
- Un suivi de la densité osseuse est recommandé en cas de ménopause précoce [S1][S2]

## Quoi demander à ton médecin

Apporte un **journal des symptômes** sur au moins 6 semaines. Demande spécifiquement à propos de la **santé osseuse, l'humeur, et le sommeil** — ce sont les trois zones les plus sous-traitées. [S2]`,
  ],
}

function getMockResponse(lang: Language, index: number): string {
  const responses = MOCK_RESPONSES[lang]
  return responses[index % responses.length]
}

export function ChatScreen() {
  const navigation = useNavigation<any>()
  const { language, objective } = useOnboarding()
  const theme = useTheme()
  const copy = COPY[language]
  // Without this guard, the form's `position: fixed` (web) bleeds into
  // sibling tabs because the bottom-tab navigator keeps screens mounted.
  const isFocused = useIsFocused()

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
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
            ? { ...m, text: m.fullText.slice(0, m.text.length + 2) }
            : m,
        ),
      )
    }, 15)
    return () => clearTimeout(timer)
  }, [streamingId, messages])

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80)
    }
  }, [messages.length])

  const runAnoqiResponse = useCallback(async () => {
    setIsTyping(true)
    // WIRE API — replace with streaming fetch
    await new Promise((r) => setTimeout(r, 900 + Math.random() * 400))
    setIsTyping(false)

    const isFirstAnoqi = anoqiMessageCount.current === 0
    anoqiMessageCount.current += 1
    const responseText = getMockResponse(language, anoqiMessageCount.current - 1)
    const sources = SAMPLE_SOURCES[anoqiMessageCount.current % SAMPLE_SOURCES.length]
    const anoqiId = `anoqi-${Date.now()}`
    const anoqiMessage: Message = {
      id: anoqiId,
      role: 'anoqi',
      text: '',
      fullText: responseText,
      isStreaming: true,
      sources,
      isFirst: isFirstAnoqi,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, anoqiMessage])
    setStreamingId(anoqiId)
  }, [language])

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

      await runAnoqiResponse()
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
        heldFirstSendRef.current = null
        await runAnoqiResponse()
      }
    },
    [runAnoqiResponse],
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
                    onPress={() => handleSend(q)}
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
                      {q}
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
            renderItem={({ item }) =>
              item.role === 'user' ? (
                <View
                  style={{
                    width: '100%',
                    alignSelf: 'center',
                    maxWidth: 864,
                    flexDirection: 'row',
                    justifyContent: 'flex-end',
                    marginBottom: theme.spacing[5],
                  }}
                >
                  {/* Bubble already caps its own width at 86%; nesting a
                      second maxWidth wrapper collapses to per-character
                      width on RN-Web for short messages like "test". */}
                  <Bubble role="user">
                    <Text
                      variant="bodyLg"
                      style={{ color: theme.colors.accent.primaryOnText }}
                    >
                      {item.text}
                    </Text>
                  </Bubble>
                </View>
              ) : (
                // Assistant — article-style reading pane. No bubble shell;
                // Markdown handles headings, body, bullets, and inline
                // citation pills. Streaming cursor anchors to the tail of
                // the last block in the parsed tree.
                <View
                  style={{
                    width: '100%',
                    alignSelf: 'center',
                    maxWidth: 864,
                    marginBottom: theme.spacing[8],
                  }}
                >
                  <Markdown
                    blocks={parseMarkdown(item.text)}
                    sources={item.sources}
                    trailingCursor={item.isStreaming ? <StreamingCursor /> : null}
                  />

                  {!item.isStreaming && item.isFirst ? (
                    <Text
                      variant="caption"
                      tone="tertiary"
                      style={{
                        marginTop: theme.spacing[2],
                        paddingTop: theme.spacing[3],
                        borderTopWidth: 1,
                        borderTopColor: theme.colors.border.subtle,
                      }}
                    >
                      {copy.safetyNote}
                    </Text>
                  ) : null}
                </View>
              )
            }
            contentContainerStyle={{
              paddingHorizontal: theme.spacing[5],
              paddingTop: theme.spacing[4],
              paddingBottom: theme.spacing[3],
            }}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              isTyping ? (
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
              ) : null
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
    </SafeAreaView>
  )
}
