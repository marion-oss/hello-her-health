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
      questions: [
        // Cardiovascular and clotting
        {
          id:          'cv.clot_stroke_bp',
          prompt:      'Have you ever had a blood clot, stroke, or been told your blood pressure is very high?',
          required:    true,
          branchLogic: 'Active VTE/PE → emergency services. History of VTE/PE, stroke, or ischaemic heart disease → prescribing-clinician appointment. BP ≥160/100 → CHC is UKMEC 4, block.',
        },
        {
          id:          'cv.smoking',
          prompt:      'Do you smoke? If so, roughly how many a day — and are you over 35?',
          required:    true,
          branchLogic: '>15/day AND >35 = UKMEC 4 for CHC → block CHC.',
        },
        {
          id:       'cv.family_clot',
          prompt:   'Has anyone in your close family — a parent or sibling — had a blood clot before the age of 45?',
          required: true,
        },
        {
          id:          'cv.migraine_aura',
          prompt:      'Do you get migraines? If yes — do they ever come with a visual disturbance beforehand, like zigzag lines, blind spots, or flashing lights?',
          required:    true,
          branchLogic: 'Migraine with aura = UKMEC 4 for CHC → block CHC entirely. Continue: progestogen-only methods and the copper IUD remain good options.',
        },
        // Body metrics
        {
          id:         'metrics.height_weight',
          prompt:     'What is your height and weight?',
          required:   true,
          validation: 'Calculate BMI. BMI >35 with an additional CV risk factor = UKMEC 3 → flag for prescribing physician. Record BMI (clotting risk + oral hormone absorption).',
        },
        // Hormonal and metabolic
        {
          id:       'hormonal.diagnoses',
          prompt:   'Have you been diagnosed with PCOS, endometriosis, fibroids, or adenomyosis?',
          required: false,
        },
        {
          id:       'metabolic.diabetes',
          prompt:   'Do you have diabetes? If yes, is it managed with medication?',
          required: false,
        },
        {
          id:          'metabolic.liver_gallbladder',
          prompt:      'Any liver or gallbladder conditions?',
          required:    false,
          branchLogic: 'Severe liver disease or tumour → prescribing-clinician appointment (CHC = UKMEC 4).',
        },
        {
          id:          'meds.current',
          prompt:      'Are you taking any regular medications or supplements at the moment — including weight-loss injections like Ozempic or Mounjaro, herbal remedies, or anything for epilepsy?',
          required:    true,
          branchLogic: 'GLP-1 (Ozempic/Wegovy/Mounjaro) → set glp1_user = true → strongly bias away from oral methods. St John\'s Wort, rifampicin, anti-epileptics → flag drug interaction → prescribing-physician referral.',
        },
        // Mental health
        {
          id:               'mh.hormonal_mood',
          prompt:           'Have you ever noticed that your mood, energy, or mental health seemed to shift with hormonal changes — around your period, for example, or when you were on contraception before?',
          required:         false,
          symptomsRecorded: ['mood_low'],
        },
        {
          id:       'mh.depression_treatment',
          prompt:   'Are you currently being treated for depression, or taking any antidepressants?',
          required: false,
        },
      ],
      enrichmentHooks: [
        {
          id:          'phase2.immediate_referral_screen',
          description: 'Screen these first, before proceeding. Immediate referrals: active or recent VTE/PE → emergency services; history of VTE/PE, stroke, or ischaemic heart disease → prescribing-clinician appointment; current or recent breast cancer → appointment, do not discuss hormonal methods until seen; severe liver disease or tumour → appointment; undiagnosed abnormal vaginal bleeding → appointment within the week; suspected pregnancy → pregnancy resources; migraine with aura → continue, CHC unsuitable, steer to progestogen-only options.',
        },
      ],
    },
    {
      number:  3,
      title:   'Lifestyle and Preferences',
      purpose: 'establish preferences (reversibility, frequency, route of administration, expectations about bleeding)',
      questions: [
        {
          id:       'prefs.reversibility',
          prompt:   'How important is it that your contraception is quickly reversible if you want to try for a pregnancy in the near future?',
          required: true,
        },
        {
          id:          'prefs.frequency',
          prompt:      'Would you prefer something you never think about, something you change once a week or month, or once a day — or does that not matter much to you?',
          required:    true,
          branchLogic: 'Weight the response using the adherence_concern flag set in Phase 1.',
        },
        {
          id:       'prefs.route',
          prompt:   'Are there certain administration routes you\'re less comfortable with? For example, do you find it hard to swallow pills? Do you find patches uncomfortable? Are you comfortable with devices being inserted in your uterus or under your skin?',
          required: false,
        },
        {
          id:          'prefs.periods',
          prompt:      'Do you have any strong feelings about your periods — whether they stop, become lighter or heavier, or stay roughly the same?',
          required:    true,
          validation:  'Critical question: this is the most common unspoken discontinuation trigger. Surface it explicitly at this stage.',
        },
        {
          id:       'prefs.ruled_out',
          prompt:   'Are there any methods you\'ve already ruled out — or any you\'re curious about?',
          required: false,
        },
        {
          id:       'prefs.others_involved',
          prompt:   'Is there anyone else involved in this decision, like a partner — whose perspective matters to you?',
          required: false,
        },
      ],
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

  // UKMEC gates (V2 §6.1, source CoSRH/FSRH UKMEC 2025). Method keys:
  // chc = combined hormonal; pop = progestogen-only pill; implant; lng_ius;
  // copper_iud. Category: 1 = no restriction … 4 = unacceptable risk (block).
  // Reference summary — always use the full document for complete criteria.
  ukmecGates: [
    { condition: 'Migraine with aura',                     categories: { chc: 4, pop: 2, implant: 2, lng_ius: 2, copper_iud: 1 }, action: 'Combined oestrogen contraindicated (UKMEC 4) — block CHC. Progestogen-only methods and copper IUD remain available.' },
    { condition: 'Blood pressure ≥ 160/100',               categories: { chc: 4, pop: 1, implant: 1, lng_ius: 2, copper_iud: 1 }, action: 'Block CHC (UKMEC 4).' },
    { condition: 'Smoking > 15/day AND > 35 yrs',          categories: { chc: 4, pop: 1, implant: 1, lng_ius: 2, copper_iud: 1 }, action: 'Block CHC (UKMEC 4).' },
    { condition: 'Active VTE (current)',                   categories: { chc: 4, pop: 2, implant: 2, lng_ius: 2, copper_iud: 1 }, action: 'Block CHC (UKMEC 4). Active VTE → direct to emergency services.' },
    { condition: 'BMI > 35 with CV risk factor',           categories: { chc: 3, pop: 1, implant: 1, lng_ius: 2, copper_iud: 1 }, action: 'CHC = UKMEC 3 — flag for prescribing physician.' },
    { condition: 'Current breast cancer',                  categories: { chc: 4, pop: 4, implant: 4, lng_ius: 4, copper_iud: 1 }, action: 'Block all hormonal methods (UKMEC 4). Do not discuss hormonal methods until seen.' },
    { condition: 'Severe liver disease',                   categories: { chc: 4, pop: 3, implant: 3, lng_ius: 3, copper_iud: 1 }, action: 'Block CHC (UKMEC 4); flag progestogen-only methods (UKMEC 3).' },
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
