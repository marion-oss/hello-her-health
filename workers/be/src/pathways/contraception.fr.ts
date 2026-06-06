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
      questions: [
        {
          id:       'prefs.reversibility',
          prompt:   "À quel point est-ce important pour toi que ta contraception soit rapidement réversible si tu souhaites essayer d'avoir un enfant dans un avenir proche ?",
          required: true,
        },
        {
          id:          'prefs.frequency',
          prompt:      "Préférerais-tu quelque chose à laquelle tu ne penses jamais, quelque chose à changer une fois par semaine ou par mois, ou une fois par jour — ou est-ce que ça t'est égal ?",
          required:    true,
          branchLogic: "Pondérer la réponse avec le drapeau adherence_concern posé en phase 1.",
        },
        {
          id:       'prefs.route',
          prompt:   "Y a-t-il des voies d'administration avec lesquelles tu es moins à l'aise ? Par exemple, as-tu du mal à avaler des comprimés ? Trouves-tu les patchs inconfortables ? Es-tu à l'aise avec un dispositif inséré dans l'utérus ou sous la peau ?",
          required: false,
        },
        {
          id:          'prefs.periods',
          prompt:      "As-tu des préférences fortes concernant tes règles — qu'elles s'arrêtent, deviennent plus légères ou plus abondantes, ou restent à peu près identiques ?",
          required:    true,
          validation:  "Question critique : c'est le déclencheur d'arrêt le plus fréquent et le plus souvent passé sous silence. La soulever explicitement à ce stade.",
        },
        {
          id:       'prefs.ruled_out',
          prompt:   "Y a-t-il des méthodes que tu as déjà écartées — ou d'autres qui t'intriguent ?",
          required: false,
        },
        {
          id:       'prefs.others_involved',
          prompt:   "Est-ce qu'il y a quelqu'un d'autre impliqué dans cette décision, comme un partenaire, dont le point de vue compte pour toi ?",
          required: false,
        },
      ],
    },
    {
      number:  4,
      title:   'Présentation des méthodes',
      purpose: 'présenter, 2 à 3 à la fois, les méthodes non exclues par les filtres UKMEC de la phase 2',
      questions: [],
      enrichmentHooks: [
        {
          id:          'phase4.presentation_rules',
          description: "Ne présenter que les méthodes non exclues par les filtres UKMEC de la phase 2. Présenter 2 à 3 options à la fois, en langage simple, sans submerger. Pour chaque méthode : fonctionnement (une phrase), durée, profil de saignement attendu, effets secondaires les plus fréquents et leurs délais, pour qui ça marche bien, mises en garde (dépistage IST, observance), rapidité du retour de fertilité. Si glp1_user = true : privilégier DIU/SIU, implant, patch, anneau (l'absorption orale est moins fiable). Si adherence_concern = true : privilégier les LARC puis anneau/patch avant les pilules quotidiennes.",
        },
      ],
    },
    {
      number:  5,
      title:   'Comprendre les effets secondaires',
      purpose: 'expliquer en amont les effets secondaires attendus, leurs délais et les signaux d\'alerte',
      questions: [],
      enrichmentHooks: [
        {
          id:          'phase5.preempt_principle',
          description: "Pour chaque méthode envisagée, expliquer les effets secondaires attendus AVANT qu'ils ne surviennent. C'est l'intervention de rétention la plus importante : les utilisatrices surprises arrêtent, celles qui s'y attendaient continuent. Être précise, donner les délais, donner le signal d'alerte.",
        },
      ],
    },
    {
      number:  6,
      title:   'Démystification',
      purpose: 'corriger les idées reçues au fil de la conversation, avec chaleur et sources',
      questions: [],
      enrichmentHooks: [
        {
          id:          'phase6.correct_in_flow',
          description: "Corriger la désinformation quand elle apparaît — au fil de la conversation, pas en bloc à la fin. Quand l'utilisatrice exprime une croyance qui correspond à un mythe connu, la corriger immédiatement, avec chaleur et une source.",
        },
      ],
    },
    {
      number:  7,
      title:   'Préparation à la consultation',
      purpose: 'générer un résumé personnalisé, à la première personne, que l\'utilisatrice apporte à son médecin prescripteur',
      questions: [],
      enrichmentHooks: [
        {
          id:          'phase7.generate_summary',
          description: "Générer le résumé selon consultationPrepTemplate : rédigé à la première personne, comme si l'utilisatrice l'avait écrit. Reprendre les antécédents pertinents de la phase 2, les méthodes qui l'intéressent et ses questions, ses inquiétudes et la façon dont elles ont été abordées, les questions à poser au médecin, et les points à retenir sur les méthodes envisagées.",
        },
      ],
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

  // Method reference table (V2 §6.1 Phase 4). Brand names kept as-is.
  methodTable: [
    { name: 'SIU Mirena',          type: 'LARC hormonal',      duration: '5 à 8 ans',             keyPoints: 'LNG 52 mg — SIU le plus dosé. Arrête souvent les règles. Utile pour l\'endométriose et les règles abondantes.', clinicianNotes: 'À distinguer de Jaydess/Kyleena — ne pas regrouper. Dépistage IST avant pose.' },
    { name: 'SIU Jaydess',         type: 'LARC hormonal',      duration: '3 ans',                 keyPoints: 'LNG 13,5 mg — SIU le moins dosé. Effet plus léger sur les règles.', clinicianNotes: 'Quasi identique à Kyleena hormis la durée. Dépistage IST avant pose. Informer du risque d\'expulsion.' },
    { name: 'SIU Kyleena',         type: 'LARC hormonal',      duration: '5 ans',                 keyPoints: 'LNG 19,5 mg — dose intermédiaire. Légèrement plus grand que Jaydess.', clinicianNotes: 'Quasi identique à Jaydess hormis la durée et la taille. Dépistage IST avant pose.' },
    { name: 'DIU au cuivre',       type: 'LARC non hormonal',  duration: "Jusqu'à 10 ans",        keyPoints: 'Aucun effet secondaire hormonal. Peut aggraver les douleurs de règles et les douleurs pelviennes chroniques. Aussi utilisable en contraception d\'urgence.', clinicianNotes: 'Prévenir activement du risque de douleurs. Dépistage IST avant pose.' },
    { name: 'Implant Nexplanon',   type: 'LARC hormonal',      duration: '3 ans',                 keyPoints: 'Méthode la plus efficace. Saignements imprévisibles très fréquents. 20 % d\'aménorrhée à 12 mois.', clinicianNotes: 'Idéal pour les fumeuses et en cas d\'obésité. Peut provoquer une sécheresse vaginale et une baisse de moral.' },
    { name: 'Pilule combinée (CHC)', type: 'Hormonal quotidien', duration: 'En continu',           keyPoints: 'Toutes les CHC peuvent améliorer l\'acné. Possible en prise continue (4 règles/an). Risque de MTEV — vérifier UKMEC et IMC.', clinicianNotes: 'La fertilité revient 4 à 7 jours après l\'arrêt — certaines données suggèrent qu\'elle est optimale juste après l\'arrêt.' },
    { name: 'Pilule progestative (POP)', type: 'Hormonal quotidien', duration: 'En continu',        keyPoints: 'Adaptée quand les œstrogènes sont contre-indiqués. 50 % d\'aménorrhée à 12 mois. Désogestrel : fenêtre de 12 h.' },
    { name: 'Patch Evra',          type: 'Hormonal hebdomadaire', duration: 'En continu',          keyPoints: 'CHC par voie transdermique. Effet de premier passage hépatique plus faible que la pilule.', clinicianNotes: 'Utile en cas de difficulté d\'observance. Même UKMEC que la pilule combinée.' },
    { name: 'Anneau Nuvaring',     type: 'Hormonal mensuel',   duration: 'En continu',            keyPoints: 'CHC par anneau vaginal. Pose et retrait une fois par mois.', clinicianNotes: 'Utile en cas de difficulté d\'observance. Même UKMEC que la pilule combinée.' },
    { name: 'Injection DMPA',      type: 'Toutes les 12 à 13 semaines', duration: 'En continu',    keyPoints: 'Aucune action quotidienne. Retour de fertilité retardé (jusqu\'à 12 mois). Densité osseuse : prudence au long cours.', clinicianNotes: 'Sécheresse vaginale et baisse de moral rapportées. Peut diminuer la densité osseuse en usage prolongé.' },
  ],

  // Side-effect literacy (V2 §6.1 Phase 5). Explain before symptoms occur.
  sideEffectLiteracy: [
    { effect: 'Tension mammaire',            whatToSay: "Une certaine sensibilité des seins pendant les 2 à 3 premières semaines est très fréquente avec les méthodes hormonales. Ce n'est pas un signe de cancer du sein — ça disparaît presque toujours tout seul.", whenToEscalate: 'Boule persistante ; écoulement du mamelon ; douleur au-delà de 8 semaines → orientation médicale.' },
    { effect: 'Spotting / saignements irréguliers', whatToSay: "De légers saignements pendant les 3 à 6 premiers mois sont normaux. Si tu as eu un nouveau partenaire récemment, le spotting peut parfois venir d'une infection plutôt que de ta contraception — un test IST rapide vaut la peine.", whenToEscalate: "Imbiber une protection chaque heure ; saignements après les rapports de façon constante ; saignements après 6 mois sans règles → orientation médicale urgente." },
    { effect: 'Nausées',                     whatToSay: "Les nausées sont fréquentes les premières semaines avec les pilules orales. Essaie de la prendre avec un repas ou au coucher — ça aide généralement.", whenToEscalate: 'Persistance au-delà de 6 semaines → orientation médicale.' },
    { effect: "Changements d'humeur",        whatToSay: "Certaines femmes remarquent des variations d'humeur, surtout au début. La variabilité individuelle est forte. Garde une note — c'est utile pour en parler à ton médecin.", whenToEscalate: "Idées suicidaires → escalade de crise. Humeur très basse et persistante au-delà de 6 semaines → orientation médicale." },
    { effect: 'Acné',                        whatToSay: "Toutes les méthodes hormonales combinées peuvent améliorer l'acné. Si l'acné persiste ou s'aggrave sous pilule combinée, la formulation n'est peut-être pas la bonne — un changement vaut la peine d'être discuté avec ton médecin.", whenToEscalate: 'Aggravation sévère → orientation médicale.' },
    { effect: 'Libido',                      whatToSay: "Des changements du désir sexuel, dans un sens ou dans l'autre, sont rapportés avec toutes les méthodes hormonales. Ce n'est pas systématique et ça se stabilise souvent une fois le corps adapté.", whenToEscalate: 'Détresse persistante → orientation médicale.' },
    { effect: 'Poids',                       whatToSay: "Seule l'injection (DMPA/Depo-Provera) a des données modestes de prise de poids chez certaines utilisatrices — environ 1 à 2 kg en moyenne la première année pour celles concernées. Aucune autre méthode n'a d'effet établi sur le poids dans les essais contrôlés." },
    { effect: 'Retour de fertilité',         whatToSay: "La fertilité n'est pas altérée par ces méthodes et il faut utiliser une protection de barrière dès l'arrêt, car elle peut revenir en 4 à 7 jours. Les données suggèrent même qu'elle est la plus élevée dans le premier cycle après l'arrêt de la pilule combinée. L'injection est l'exception — jusqu'à 12 mois." },
  ],

  // Myth corrections (V2 §6.1 Phase 6). Correct warmly, in flow, with a source.
  mythCorrections: [
    {
      trigger:    "J'ai entendu que la pilule rend stérile",
      correction: "C'est l'un des mythes les plus répandus sur la contraception. La fertilité revient dans les 4 à 7 jours après l'arrêt de la pilule combinée — et la recherche suggère qu'elle est même optimale dans le premier cycle après l'arrêt. L'injection est la seule exception, où le retour peut prendre jusqu'à 12 mois.",
      sources:    ['Bristol ALSPAC Study', 'John et al. J Gen Intern Med 2025'],
    },
    {
      trigger:    "Il faut faire une pause de la pilule chaque année",
      correction: "Il n'y a aucune raison médicale de faire une pause de la pilule — c'est un mythe transmis dans les familles depuis des décennies. Les pauses sont associées à un risque plus élevé de grossesse non désirée, sans aucun bénéfice pour la santé. Tu peux la prendre en continu aussi longtemps que tu as besoin d'une contraception.",
      sources:    ['FSRH CHC Guideline 2023'],
    },
    {
      trigger:    "La pilule donne le cancer",
      correction: "La pilule combinée protège en réalité contre le cancer de l'ovaire et celui de la muqueuse de l'utérus. Il existe une légère augmentation du risque de cancer du sein — mais pour la mettre en perspective : pour 10 000 femmes prenant la pilule pendant 5 ans, environ 1 cas supplémentaire de cancer du sein peut survenir par rapport aux femmes qui ne la prennent pas. C'est une augmentation comparable à celle de boire plus d'un verre d'alcool par jour. Le risque revient à la normale environ 5 ans après l'arrêt.",
      sources:    ['Jahanfar et al. Front Glob Womens Health 2024', 'Int J Cancer 2021'],
    },
    {
      trigger:    "Les hormones naturelles sont toujours plus sûres que les synthétiques",
      correction: "Naturel contre synthétique n'est pas vraiment le bon cadre ici. Tes propres ovaires produisent des hormones qui comportent leurs propres risques. Les hormones des contraceptifs ont des décennies de données de sécurité derrière elles. Ce qui compte, c'est de savoir si les bénéfices l'emportent sur les risques dans ta situation précise — c'est exactement ce que ton médecin évalue.",
    },
    {
      trigger:    "Après l'arrêt de la contraception hormonale, le corps met des mois à revenir à la normale",
      correction: "La période d'élimination de la plupart des méthodes hormonales est d'environ 20 à 30 jours — après quoi tout symptôme persistant (cycles irréguliers, acné, changements capillaires) correspond à ton propre état de base, pas à ta contraception. C'est en fait une information utile : ces symptômes méritent d'être explorés pour eux-mêmes.",
      sources:    ['Note clinique Dr Frontino', 'FSRH'],
    },
    {
      trigger:    "J'ai vu sur TikTok/Instagram que [méthode] provoque [effet secondaire]",
      correction: "Les réseaux sociaux sont l'une des plus grandes sources de désinformation sur la contraception. Les études montrent que 74 % des influenceurs YouTube parlant de contraception encourageaient l'arrêt, et environ la moitié des publications TikTok sur la contraception véhiculaient des affirmations négatives — la plupart fondées sur des expériences individuelles, pas sur des preuves cliniques. Laisse-moi te dire ce que disent réellement les données.",
      sources:    ['Pfender UPenn/STAT News 2024', 'John et al. PMC 2025'],
    },
  ],

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
