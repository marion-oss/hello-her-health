// Anoqi — Starter prompts per health objective.
//
// Shared between the empty-state grid in ChatScreen and the skip-and-chat
// prefill flow on ObjectiveScreen, so both surfaces stay in sync.

import type { HealthObjective } from '../../context/OnboardingContext'

export const STARTERS: Record<HealthObjective, { fr: string[]; en: string[] }> = {
  symptoms: {
    fr: [
      "J'ai des règles irrégulières depuis 3 mois",
      "Comment préparer ma consultation gynéco ?",
      "Qu'est-ce qui pourrait expliquer ma fatigue ?",
      'Pelviennes — que dois-je savoir ?',
    ],
    en: [
      "I've had irregular periods for 3 months",
      'How do I prepare for a gynae appointment?',
      'What could be causing my fatigue?',
      'Pelvic pain — what should I know?',
    ],
  },
  contraception: {
    fr: [
      'Pilule vs stérilet : la différence ?',
      "J'arrête la pilule — quoi attendre ?",
      'Quels effets secondaires possibles ?',
      'La pilule fait-elle grossir ?',
    ],
    en: [
      "Pill vs coil — what's the difference?",
      "I'm stopping the pill — what to expect?",
      'What side effects are possible?',
      'Does the pill cause weight gain?',
    ],
  },
  menopause: {
    fr: [
      'Premiers signes de la périménopause ?',
      'Le THM est-il fait pour moi ?',
      'Gérer les bouffées de chaleur ?',
      'Ménopause et mes os ?',
    ],
    en: [
      'First signs of perimenopause?',
      'Is HRT right for me?',
      'How do I manage hot flashes?',
      'What does menopause do to my bones?',
    ],
  },
  fertility: {
    fr: [
      'Repérer ma fenêtre de fertilité ?',
      'Qualité des ovules — quoi savoir ?',
      "J'essaie depuis 6 mois — quand consulter ?",
      'Que dit la longueur de mon cycle ?',
    ],
    en: [
      'How do I track my fertile window?',
      'What affects egg quality?',
      "I've been trying 6 months — when to consult?",
      'What does my cycle length say?',
    ],
  },
  general: {
    fr: [
      'Mieux comprendre mes hormones',
      'Épuisée — est-ce hormonal ?',
      'Hormones, énergie, performance ?',
      "Trouver un médecin qui m'écoute ?",
    ],
    en: [
      'Help me understand my hormones',
      'Exhausted — could it be hormonal?',
      'Hormones, energy, performance?',
      'Find a doctor who listens?',
    ],
  },
}
