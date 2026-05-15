import { useEffect, useRef, useState } from 'react'
import { getOrCreateSessionId, postChat } from './api'
import type { ChatMessage, JourneyType, Language } from './types'

const JOURNEYS: { value: JourneyType; label: string }[] = [
  { value: 'free_chat',        label: 'Discussion libre' },
  { value: 'symptoms',         label: 'Symptômes' },
  { value: 'contraception',    label: 'Contraception' },
  { value: 'menopause',        label: 'Ménopause' },
  { value: 'fertility',        label: 'Fertilité' },
  { value: 'appointment_prep', label: 'Préparation RDV' },
]

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [language, setLanguage] = useState<Language>('fr')
  const [journeyType, setJourneyType] = useState<JourneyType>('free_chat')

  const sessionIdRef = useRef<string>(getOrCreateSessionId())
  const conversationIdRef = useRef<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to the latest message after each render.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  async function send() {
    const trimmed = input.trim()
    if (!trimmed || loading) return

    const userMsg: ChatMessage = {
      id:      crypto.randomUUID(),
      role:    'user',
      content: trimmed,
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const resp = await postChat({
        message:        trimmed,
        sessionId:      sessionIdRef.current,
        conversationId: conversationIdRef.current ?? undefined,
        journeyType,
        language,
      })

      conversationIdRef.current = resp.conversationId

      const assistantMsg: ChatMessage = {
        id:              resp.message.id,
        role:            'assistant',
        content:         resp.message.content,
        sources:         resp.message.sources,
        sources_display: resp.message.sources_display,
        blocked:         resp.blocked,
        createdAt:       resp.message.createdAt,
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur réseau'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter inserts a newline.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <section className="chat">
      <div className="chat__controls">
        <label>
          Parcours
          <select
            value={journeyType}
            onChange={e => setJourneyType(e.target.value as JourneyType)}
            disabled={messages.length > 0}
            title={messages.length > 0 ? 'Verrouillé après le premier message' : undefined}
          >
            {JOURNEYS.map(j => (
              <option key={j.value} value={j.value}>{j.label}</option>
            ))}
          </select>
        </label>
        <label>
          Langue
          <select value={language} onChange={e => setLanguage(e.target.value as Language)}>
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </label>
      </div>

      <div className="chat__list" ref={listRef}>
        {messages.length === 0 && !loading && (
          <p className="chat__empty">
            Pose-moi une question. Tes échanges restent anonymes pour cette session web.
          </p>
        )}

        {messages.map(m => (
          <div key={m.id} className={`bubble bubble--${m.role}`}>
            <div className="bubble__content">{m.content}</div>
            {m.role === 'assistant' && m.sources_display && m.sources_display.length > 0 && (
              <div className="bubble__sources">
                {m.sources_display.map(s => (
                  <a
                    key={s.label}
                    className="chip"
                    href={s.url ?? '#'}
                    target={s.url ? '_blank' : undefined}
                    rel={s.url ? 'noreferrer' : undefined}
                    title={`${s.source_kind} · ${s.topic}`}
                  >
                    <span className="chip__label">[{s.label}]</span>
                    <span className="chip__name">{s.name}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && <div className="bubble bubble--assistant bubble--loading">…</div>}
      </div>

      {error && <div className="chat__error">{error}</div>}

      <form
        className="chat__composer"
        onSubmit={e => {
          e.preventDefault()
          send()
        }}
      >
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={language === 'fr' ? 'Écris ta question…' : 'Write your message…'}
          rows={2}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          {loading ? '…' : 'Envoyer'}
        </button>
      </form>
    </section>
  )
}
