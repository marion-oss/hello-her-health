/**
 * anoqi — Contraceptive pathway (French, canonical)
 *
 * Source of truth: Anoqi LLM Product Guidelines V2 §6.1 (Dr Giada Frontino).
 * PR A populates Phase 1 only. Phases 2-8 are stubbed (purpose only, no
 * questions) and filled by their own per-phase PRs, each independently
 * reviewable by the clinical advisory board. Reference data (methodTable,
 * ukmecGates, mythCorrections) lands with the phase that needs it.
 *
 * The EN module (contraception.en.ts) mirrors this file question-for-question.
 * FR is canonical; keep EN in sync when editing.
 */
import type { PathwayModule } from './types'

export const contraceptionFr: PathwayModule = {
  key:      'contraception',
  language: 'fr',
  version:  'v1-2026-06-06',

  // §2.1 routing row — contraception signals (FR + common EN loanwords users type).
  entrySignals: [
    'contraception', 'contraceptif', 'contraceptive', 'pilule', 'stérilet',
    'diu', 'siu', 'implant', 'patch', 'anneau', 'préservatif',
    'moyen de contraception', 'éviter une grossesse', 'tomber enceinte',
    'règles', 'birth control', 'iud', 'ius',
  ],

  // Symptoms contraception touches that other pathways will also declare —
  // the overlap is where differential awareness activates once endo/menopause/
  // pmos modules land. differentialAwareness stays {} until then.
  declaredSymptoms: ['period_pain', 'acne', 'mood_low', 'irregular_bleeding', 'weight_gain'],

  phases: [
    {
      number:  1,
      title:   'Objectifs et contexte',
      purpose: "comprendre pourquoi l'utilisatrice est là et repérer tôt les déclencheurs de désinformation",
      questions: [
        {
          id:       'goals.start_switch_review',
          prompt:   "Est-ce que tu commences une contraception pour la première fois, tu changes de méthode, ou tu fais le point sur celle que tu utilises en ce moment ?",
          required: true,
        },
        {
          id:               'goals.pregnancy_or_symptoms',
          prompt:           "Ton objectif principal, c'est d'éviter une grossesse — ou est-ce que tu espères aussi que ça aide pour des symptômes comme des règles douloureuses, de l'acné ou des variations d'humeur ?",
          required:         true,
          symptomsRecorded: ['period_pain', 'acne', 'mood_low'],
          branchLogic:      "Si la gestion de symptômes est mentionnée : « La contraception peut faire bien plus qu'éviter une grossesse — ça vaut la peine d'explorer ça ensemble. »",
        },
        {
          id:       'goals.prior_experience',
          prompt:   "As-tu déjà essayé une contraception ? Si oui, qu'est-ce qui a marché — et qu'est-ce qui n'a pas marché ?",
          required: false,
        },
        {
          id:          'goals.adherence',
          prompt:      "Est-ce qu'il t'arrive d'avoir du mal à penser à prendre un comprimé tous les jours — ou ce n'est pas quelque chose qui te préoccupe ?",
          required:    false,
          branchLogic: "Si oui : poser le drapeau interne adherence_concern = true (utilisé en phases 3-4).",
        },
        {
          id:          'goals.pregnancy_status',
          prompt:      "Es-tu actuellement enceinte, en train d'allaiter, ou as-tu accouché au cours des 6 dernières semaines ?",
          required:    true,
          branchLogic: "Si oui : orienter vers le parcours post-partum (pas encore implémenté).",
        },
      ],
    },
    // ── Phases 2-8 stubbed — purpose only. Filled by per-phase PRs. ──
    {
      number:  2,
      title:   'Antécédents médicaux (filtre UKMEC)',
      purpose: 'identifier les contre-indications et les situations nécessitant un avis médical (logique UKMEC 2025)',
      questions: [
        // Cardiovasculaire et coagulation
        {
          id:          'cv.clot_stroke_bp',
          prompt:      "As-tu déjà eu un caillot sanguin (phlébite, embolie), un AVC, ou est-ce qu'on t'a déjà dit que ta tension artérielle était très élevée ?",
          required:    true,
          branchLogic: "MTEV/EP active en cours → orienter vers les urgences. Antécédent de MTEV/EP, d'AVC ou de cardiopathie ischémique → rendez-vous avec le médecin prescripteur. TA ≥ 160/100 → CHC = UKMEC 4, bloquer.",
        },
        {
          id:          'cv.smoking',
          prompt:      "Est-ce que tu fumes ? Si oui, environ combien de cigarettes par jour — et as-tu plus de 35 ans ?",
          required:    true,
          branchLogic: "> 15/jour ET > 35 ans = UKMEC 4 pour les CHC → bloquer les CHC.",
        },
        {
          id:       'cv.family_clot',
          prompt:   "Est-ce que quelqu'un dans ta famille proche — un parent, un frère ou une sœur — a déjà eu un caillot sanguin avant l'âge de 45 ans ?",
          required: true,
        },
        {
          id:          'cv.migraine_aura',
          prompt:      "As-tu des migraines ? Si oui, est-ce qu'elles s'accompagnent parfois de troubles visuels juste avant — des lignes en zigzag, des taches aveugles, ou des éclairs lumineux ?",
          required:    true,
          branchLogic: "Migraine avec aura = UKMEC 4 pour les CHC → bloquer entièrement les CHC. Poursuivre : les méthodes progestatives seules et le DIU au cuivre restent de bonnes options.",
        },
        // Mesures corporelles
        {
          id:         'metrics.height_weight',
          prompt:     "Quelle est ta taille et ton poids ?",
          required:   true,
          validation: "Calculer l'IMC. IMC > 35 avec un facteur de risque cardiovasculaire = UKMEC 3 → signaler au médecin prescripteur. Enregistrer l'IMC (risque de thrombose + absorption des hormones orales).",
        },
        // Hormonal et métabolique
        {
          id:       'hormonal.diagnoses',
          prompt:   "Est-ce qu'on t'a diagnostiqué un SOPK, une endométriose, des fibromes ou une adénomyose ?",
          required: false,
        },
        {
          id:       'metabolic.diabetes',
          prompt:   "Est-ce que tu as du diabète ? Si oui, est-il traité par un médicament ?",
          required: false,
        },
        {
          id:          'metabolic.liver_gallbladder',
          prompt:      "As-tu des problèmes de foie ou de vésicule biliaire ?",
          required:    false,
          branchLogic: "Maladie ou tumeur hépatique sévère → rendez-vous avec le médecin prescripteur (CHC = UKMEC 4).",
        },
        {
          id:          'meds.current',
          prompt:      "Prends-tu des médicaments ou des compléments en ce moment — y compris des injections pour la perte de poids comme Ozempic ou Mounjaro, des remèdes à base de plantes, ou un traitement contre l'épilepsie ?",
          required:    true,
          branchLogic: "GLP-1 (Ozempic/Wegovy/Mounjaro) → poser glp1_user = true → orienter fortement hors des méthodes orales. Millepertuis, rifampicine, anti-épileptiques → signaler l'interaction médicamenteuse → orienter vers le médecin prescripteur.",
        },
        // Santé mentale
        {
          id:               'mh.hormonal_mood',
          prompt:           "As-tu déjà remarqué que ton humeur, ton énergie ou ton moral changeaient avec les variations hormonales — autour de tes règles, par exemple, ou quand tu prenais une contraception auparavant ?",
          required:         false,
          symptomsRecorded: ['mood_low'],
        },
        {
          id:       'mh.depression_treatment',
          prompt:   "Es-tu actuellement suivie pour une dépression, ou prends-tu des antidépresseurs ?",
          required: false,
        },
      ],
      enrichmentHooks: [
        {
          id:          'phase2.immediate_referral_screen',
          description: "Dépistage prioritaire AVANT de poursuivre. Orientations immédiates : MTEV/EP active ou récente → urgences ; antécédent de MTEV/EP, d'AVC ou de cardiopathie ischémique → rendez-vous avec le médecin prescripteur ; cancer du sein actuel ou récent → rendez-vous, ne pas aborder les méthodes hormonales avant avis ; maladie ou tumeur hépatique sévère → rendez-vous ; saignements vaginaux anormaux non diagnostiqués → rendez-vous sous une semaine ; grossesse suspectée → ressources grossesse ; migraine avec aura → poursuivre, CHC non adaptés, orienter vers les options progestatives.",
        },
      ],
    },
    {
      number:  3,
      title:   'Mode de vie et préférences',
      purpose: "cerner les préférences (réversibilité, fréquence, voie d'administration, attentes sur les règles)",
      questions: [],
    },
    {
      number:  4,
      title:   'Présentation des méthodes',
      purpose: 'présenter, 2 à 3 à la fois, les méthodes non exclues par les filtres UKMEC de la phase 2',
      questions: [],
    },
    {
      number:  5,
      title:   'Comprendre les effets secondaires',
      purpose: 'expliquer en amont les effets secondaires attendus, leurs délais et les signaux d\'alerte',
      questions: [],
    },
    {
      number:  6,
      title:   'Démystification',
      purpose: 'corriger les idées reçues au fil de la conversation, avec chaleur et sources',
      questions: [],
    },
    {
      number:  7,
      title:   'Préparation à la consultation',
      purpose: 'générer un résumé personnalisé, à la première personne, que l\'utilisatrice apporte à son médecin prescripteur',
      questions: [],
    },
    {
      number:  8,
      title:   'Suivi',
      purpose: 'protocole de check-in (3 semaines, 6 semaines, 2 mois) pour soutenir la continuité',
      questions: [],
    },
  ],

  // UKMEC gates (V2 §6.1, source CoSRH/FSRH UKMEC 2025). Method keys:
  // chc = combined hormonal; pop = progestogen-only pill; implant; lng_ius;
  // copper_iud. Category: 1 = aucune restriction … 4 = risque inacceptable
  // (bloquer). Reference summary — toujours se référer au document complet.
  ukmecGates: [
    { condition: 'Migraine avec aura',                                   categories: { chc: 4, pop: 2, implant: 2, lng_ius: 2, copper_iud: 1 }, action: "Œstrogènes combinés contre-indiqués (UKMEC 4) — bloquer les CHC. Méthodes progestatives seules et DIU au cuivre possibles." },
    { condition: 'Tension artérielle ≥ 160/100',                         categories: { chc: 4, pop: 1, implant: 1, lng_ius: 2, copper_iud: 1 }, action: 'Bloquer les CHC (UKMEC 4).' },
    { condition: 'Tabac > 15/jour ET > 35 ans',                          categories: { chc: 4, pop: 1, implant: 1, lng_ius: 2, copper_iud: 1 }, action: 'Bloquer les CHC (UKMEC 4).' },
    { condition: 'MTEV active (en cours)',                               categories: { chc: 4, pop: 2, implant: 2, lng_ius: 2, copper_iud: 1 }, action: 'Bloquer les CHC (UKMEC 4). MTEV active → orienter vers les urgences.' },
    { condition: 'IMC > 35 avec facteur de risque cardiovasculaire',     categories: { chc: 3, pop: 1, implant: 1, lng_ius: 2, copper_iud: 1 }, action: 'CHC = UKMEC 3 — signaler au médecin prescripteur.' },
    { condition: 'Cancer du sein actuel',                                categories: { chc: 4, pop: 4, implant: 4, lng_ius: 4, copper_iud: 1 }, action: 'Bloquer toutes les méthodes hormonales (UKMEC 4). Ne pas aborder les méthodes hormonales avant avis médical.' },
    { condition: 'Maladie hépatique sévère',                             categories: { chc: 4, pop: 3, implant: 3, lng_ius: 3, copper_iud: 1 }, action: 'Bloquer les CHC (UKMEC 4) ; signaler les méthodes progestatives (UKMEC 3).' },
  ],

  // Populated by the Phase 6 PR (V2 §6.1 myth-busting table).
  mythCorrections: [],

  // Empty until a second pathway declaring an overlapping symptom lands.
  differentialAwareness: {},

  // Phase 7 structure (organisational; clinical phrasing arrives with Phase 7 PR).
  consultationPrepTemplate: {
    voice: "Rédige le résumé à la première personne, comme si l'utilisatrice l'avait écrit elle-même.",
    sections: [
      'Pourquoi je consulte / ce dont je veux parler',
      'Mes antécédents médicaux pertinents',
      "Les méthodes qui m'intéressent et mes questions à leur sujet",
      'Mes inquiétudes et comment elles ont été abordées',
      'Les questions que je veux poser à mon médecin',
      'Les points à retenir sur la ou les méthodes que j\'envisage',
    ],
  },
}

export default contraceptionFr
