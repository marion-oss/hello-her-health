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
      questions: [],
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
