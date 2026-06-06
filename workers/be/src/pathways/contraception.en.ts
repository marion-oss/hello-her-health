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
      enrichmentHooks: [
        {
          id:          'phase4.presentation_rules',
          description: 'Present only methods not excluded by the Phase 2 UKMEC gates. Present two to three options at a time, in plain language, without overwhelming. For each method cover: how it works (one sentence), duration, expected bleeding pattern, most common side effects and their timelines, who it works well for, caveats (STI screen, adherence), how quickly fertility returns. If glp1_user = true: lead with IUD/IUS, implant, patch, ring (oral absorption is less reliable). If adherence_concern = true: lead with LARC methods, then ring/patch, before daily pills.',
        },
      ],
    },
    {
      number:  5,
      title:   'Side Effect Literacy',
      purpose: 'proactively explain expected side effects, their timelines, and the escalation signal',
      questions: [],
      enrichmentHooks: [
        {
          id:          'phase5.preempt_principle',
          description: 'For every method under consideration, explain expected side effects BEFORE they occur. This is the most important retention intervention: users who are surprised discontinue; users who expected side effects continue. Be specific, give timelines, give the escalation signal.',
        },
      ],
    },
    {
      number:  6,
      title:   'Myth-Busting Layer',
      purpose: 'correct misinformation as it arises, warmly and with a source',
      questions: [],
      enrichmentHooks: [
        {
          id:          'phase6.correct_in_flow',
          description: 'Correct misinformation when it arises — throughout the conversation, not as a lecture at the end. When the user mentions a belief that matches a known myth, correct it immediately, warmly, and with a source.',
        },
      ],
    },
    {
      number:  7,
      title:   'Consultation Preparation',
      purpose: 'generate a personalised first-person summary the user brings to her prescribing physician',
      questions: [],
      enrichmentHooks: [
        {
          id:          'phase7.generate_summary',
          description: 'Generate the summary per consultationPrepTemplate: written in the first person, as if the user wrote it. Pull in relevant medical history from Phase 2, the methods she is interested in and her questions, her concerns and how they were addressed, the questions to ask her doctor, and the things to remember about the methods she is considering.',
        },
      ],
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

  // Method reference table (V2 §6.1 Phase 4). Brand names kept as-is.
  methodTable: [
    { name: 'Mirena IUS',        type: 'LARC hormonal',     duration: '5–8 years',        keyPoints: 'LNG 52mg — highest-dose IUS. Often stops periods. Good for endometriosis and heavy bleeding.', clinicianNotes: 'Distinct from Jaydess/Kyleena — do not group. STI screen before insertion.' },
    { name: 'Jaydess IUS',       type: 'LARC hormonal',     duration: '3 years',          keyPoints: 'LNG 13.5mg — lowest-dose IUS. Lighter effect on periods.', clinicianNotes: 'Near-identical to Kyleena except duration. STI screen before insertion. Counsel re: expulsion.' },
    { name: 'Kyleena IUS',       type: 'LARC hormonal',     duration: '5 years',          keyPoints: 'LNG 19.5mg — mid dose. Slightly larger than Jaydess.', clinicianNotes: 'Near-identical to Jaydess except duration and size. STI screen before insertion.' },
    { name: 'Copper IUD',        type: 'LARC non-hormonal', duration: 'Up to 10 years',   keyPoints: 'No hormonal side effects. Can worsen period pain and chronic pelvic pain. Also used as emergency contraception.', clinicianNotes: 'Counsel proactively about pain risk. STI screen before insertion.' },
    { name: 'Nexplanon implant', type: 'LARC hormonal',     duration: '3 years',          keyPoints: 'Most effective method. Unpredictable bleeding very common. 20% amenorrhoea at 12 months.', clinicianNotes: 'Ideal for smokers and people with obesity. Can cause vaginal dryness and low mood.' },
    { name: 'Combined pill (CHC)', type: 'Daily hormonal',  duration: 'Ongoing',          keyPoints: 'All CHCs can improve acne. Can be taken continuously (4 periods/year). VTE risk — check UKMEC and BMI.', clinicianNotes: 'Fertility returns 4–7 days after stopping — some evidence it is best immediately after stopping CHC.' },
    { name: 'Progestogen-only pill (POP)', type: 'Daily hormonal', duration: 'Ongoing',    keyPoints: 'Suitable where oestrogen is contraindicated. 50% amenorrhoea at 12 months. Desogestrel: 12-hour window.' },
    { name: 'Evra patch',        type: 'Weekly hormonal',   duration: 'Ongoing',          keyPoints: 'CHC via transdermal route. Lower first-pass hepatic effect than the pill.', clinicianNotes: 'Good for adherence-challenged users. Same UKMEC as the CHC pill.' },
    { name: 'Nuvaring',          type: 'Monthly hormonal',  duration: 'Ongoing',          keyPoints: 'CHC via vaginal ring. Monthly insertion and removal.', clinicianNotes: 'Good for adherence-challenged users. Same UKMEC as the CHC pill.' },
    { name: 'DMPA injection',    type: 'Every 12–13 weeks', duration: 'Ongoing',          keyPoints: 'No daily action. Delayed fertility return (up to 12 months). Bone density: caution long-term.', clinicianNotes: 'Vaginal dryness and low mood reported. Can decrease bone density with prolonged use.' },
  ],

  // Side-effect literacy (V2 §6.1 Phase 5). Explain before symptoms occur.
  sideEffectLiteracy: [
    { effect: 'Breast tension',              whatToSay: 'Some breast tenderness in the first 2–3 weeks is very common with hormonal methods. It is not a sign of breast cancer — it nearly always fades on its own.', whenToEscalate: 'Persistent lump; nipple discharge; pain after 8 weeks → physician referral.' },
    { effect: 'Spotting / irregular bleeding', whatToSay: "Light spotting in the first 3–6 months is normal. If you've recently had a new sexual partner, spotting can sometimes be from an infection rather than your contraception — worth a quick STI test.", whenToEscalate: 'Soaking a pad every hour; bleeding after sex consistently; bleeding after 6 months without periods → urgent physician referral.' },
    { effect: 'Nausea',                      whatToSay: 'Nausea is common in the first few weeks with oral pills. Try taking it with food or at bedtime — this usually helps.', whenToEscalate: 'Persisting beyond 6 weeks → physician referral.' },
    { effect: 'Mood changes',                whatToSay: 'Some women notice mood shifts, especially early on. Individual variation is high. Keep a note — it helps if you speak to your doctor.', whenToEscalate: 'Suicidal ideation → crisis escalation. Severe persistent low mood after 6 weeks → physician referral.' },
    { effect: 'Acne',                        whatToSay: "All combined hormonal methods can improve acne. If acne persists or worsens on a combined pill, it may indicate the formulation isn't quite right — worth discussing a switch with your doctor.", whenToEscalate: 'Severe worsening → physician referral.' },
    { effect: 'Libido',                      whatToSay: 'Changes to sex drive in either direction are reported with all hormonal methods. Not universal, and often settles as the body adjusts.', whenToEscalate: 'Persistent distress → physician referral.' },
    { effect: 'Weight',                      whatToSay: 'The injection (DMPA/Depo-Provera) has modest evidence of weight gain in some users — roughly 1–2kg on average over the first year for those affected. No other method has an established weight effect in controlled trials.' },
    { effect: 'Fertility return',            whatToSay: 'Fertility is not affected by these methods, and barrier methods should be used immediately once the method is stopped, as it can return as quickly as 4–7 days. Evidence suggests fertility may be highest in the first cycle after stopping the combined pill. The injection is the exception — up to 12 months.' },
  ],

  // Myth corrections (V2 §6.1 Phase 6). Correct warmly, in flow, with a source.
  mythCorrections: [
    {
      trigger:    'I heard the pill makes you infertile',
      correction: 'This is one of the most common myths about contraception. Fertility returns within 4–7 days of stopping the combined pill — and research suggests fertility may actually be at its best in the first cycle after stopping. The injection is the only exception, where it can take up to 12 months to return.',
      sources:    ['Bristol ALSPAC Study', 'John et al. J Gen Intern Med 2025'],
    },
    {
      trigger:    'I should take a break from the pill every year',
      correction: "There's no medical reason to take a break from the pill — this is a myth that has been passed down through families for decades. Breaks are associated with a higher risk of unplanned pregnancy, without any health benefit. You can safely continue for as long as you need contraception.",
      sources:    ['FSRH CHC Guideline 2023'],
    },
    {
      trigger:    'The pill causes cancer',
      correction: "The combined pill is actually protective against ovarian cancer and cancer of the lining of the womb. There is a small increase in breast cancer risk — but to put it in perspective: for every 10,000 women who take the pill for 5 years, roughly 1 additional breast cancer case may occur compared to women who don't take it. That's a similar increase in risk to drinking more than one alcoholic drink a day. The risk returns to normal within about 5 years of stopping.",
      sources:    ['Jahanfar et al. Front Glob Womens Health 2024', 'Int J Cancer 2021'],
    },
    {
      trigger:    'Natural hormones are always safer than synthetic',
      correction: "Natural versus synthetic isn't quite the right frame here. Your own ovaries produce hormones that carry their own risks. The hormones in contraceptives have decades of safety data behind them. What matters is whether the benefits outweigh the risks for your specific situation — which is exactly what your doctor assesses.",
    },
    {
      trigger:    'After stopping hormonal contraception it takes months for my body to get back to normal',
      correction: 'The washout period for most hormonal methods is around 20–30 days — after that, any ongoing symptoms like irregular cycles, acne, or hair changes are your own baseline, not your contraception. That\'s actually useful information: it means those symptoms are worth investigating in their own right.',
      sources:    ['Dr Frontino clinical note', 'FSRH'],
    },
    {
      trigger:    'I saw on TikTok/Instagram that [method] causes [side effect]',
      correction: 'Social media is one of the biggest sources of misinformation about contraception. Research shows that 74% of YouTube influencers discussing contraception encouraged discontinuation, and about half of TikTok posts about birth control promoted negative claims — most based on individual experience, not clinical evidence. Let me tell you what the evidence actually says.',
      sources:    ['Pfender UPenn/STAT News 2024', 'John et al. PMC 2025'],
    },
  ],

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
