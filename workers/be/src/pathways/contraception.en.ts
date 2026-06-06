/**
 * anoqi — Contraceptive pathway (English mirror)
 *
 * Mirrors contraception.fr.ts question-for-question. FR is canonical; the EN
 * questions here are the original V2 §6.1 source wording. Keep in sync.
 */
import type { PathwayModule } from './types'

export const contraceptionEn: PathwayModule = {
  key:      'contraception',
  language: 'en',
  version:  'v1-2026-06-06',

  entrySignals: [
    'contraception', 'birth control', 'preventing pregnancy', 'period management',
    'pill', 'coil', 'implant', 'iud', 'ius', 'patch', 'ring', 'condom',
    'contraceptive', 'getting pregnant', 'periods',
  ],

  declaredSymptoms: ['period_pain', 'acne', 'mood_low', 'irregular_bleeding', 'weight_gain'],

  phases: [
    {
      number:  1,
      title:   'Goals and Context',
      purpose: 'understand why the user is here and surface early misinformation triggers',
      questions: [
        {
          id:       'goals.start_switch_review',
          prompt:   'Are you starting contraception for the first time, switching from something else, or checking in on how your current method is working?',
          required: true,
        },
        {
          id:               'goals.pregnancy_or_symptoms',
          prompt:           'Is your main goal preventing pregnancy — or are you also hoping it might help with symptoms like painful periods, acne, or mood changes?',
          required:         true,
          symptomsRecorded: ['period_pain', 'acne', 'mood_low'],
          branchLogic:      'If symptom management is mentioned: "Contraception can do a lot more than prevent pregnancy — this is worth exploring together."',
        },
        {
          id:       'goals.prior_experience',
          prompt:   'Have you tried contraception before? If so, what worked — and what didn\'t?',
          required: false,
        },
        {
          id:          'goals.adherence',
          prompt:      'Do you ever find it hard to remember to take a daily pill — or is that not something you\'ve thought about?',
          required:    false,
          branchLogic: 'If yes: set internal flag adherence_concern = true (used in phases 3-4).',
        },
        {
          id:          'goals.pregnancy_status',
          prompt:      'Are you currently pregnant, breastfeeding, or have you given birth in the last 6 weeks?',
          required:    true,
          branchLogic: 'If yes: route to postpartum pathway (not yet implemented).',
        },
      ],
    },
    {
      number:  2,
      title:   'Medical History Screen (UKMEC-gated)',
      purpose: 'identify contraindications and conditions requiring physician review (UKMEC 2025 logic)',
      questions: [],
    },
    {
      number:  3,
      title:   'Lifestyle and Preferences',
      purpose: 'establish preferences (reversibility, frequency, route of administration, expectations about bleeding)',
      questions: [],
    },
    {
      number:  4,
      title:   'Method Overview',
      purpose: 'present, two to three at a time, the methods not excluded by the Phase 2 UKMEC gates',
      questions: [],
    },
    {
      number:  5,
      title:   'Side Effect Literacy',
      purpose: 'proactively explain expected side effects, their timelines, and the escalation signal',
      questions: [],
    },
    {
      number:  6,
      title:   'Myth-Busting Layer',
      purpose: 'correct misinformation as it arises, warmly and with a source',
      questions: [],
    },
    {
      number:  7,
      title:   'Consultation Preparation',
      purpose: 'generate a personalised first-person summary the user brings to her prescribing physician',
      questions: [],
    },
    {
      number:  8,
      title:   'Check-In Protocol',
      purpose: 'check-in protocol (3 weeks, 6 weeks, 2 months) to support continuation',
      questions: [],
    },
  ],

  mythCorrections: [],

  differentialAwareness: {},

  consultationPrepTemplate: {
    voice: 'Write the summary in the first person, as if the user wrote it herself.',
    sections: [
      "Why I'm here / what I want to discuss",
      'My relevant medical history',
      'Methods I\'m interested in and questions about them',
      'My concerns and how they were addressed',
      'Questions I want to ask my doctor',
      'Specific things to remember about the method(s) I\'m considering',
    ],
  },
}

export default contraceptionEn
