/**
 * anoqi Policy Layer — Test Suite
 *
 * Tests every rule in policyChecker.ts.
 * Run with: npx vitest run api/policy/policy.test.ts
 *
 * These tests are a clinical safety requirement, not optional coverage.
 * All patterns must pass before any deployment.
 */

import { describe, it, expect } from 'vitest'
import { checkPolicy, classifyInput } from './policyChecker'

// ─────────────────────────────────────────────────────────────
// checkPolicy — diagnosis language (BLOCK)
// ─────────────────────────────────────────────────────────────
describe('checkPolicy — diagnosis language → block', () => {
  const diagnosisCases = [
    // French patterns
    { input: 'Vous avez une endométriose sévère.', label: 'vous avez' },
    { input: 'Tu as du SOPK, c\'est clair.', label: 'tu as' },
    { input: 'Vous souffrez de migraines chroniques.', label: 'vous souffrez de' },
    { input: 'Tu souffres de PMDD depuis plusieurs mois.', label: 'tu souffres de' },
    { input: 'Vous êtes atteinte de thyroïdite de Hashimoto.', label: 'vous êtes atteinte de' },
    { input: 'Tu es atteinte d\'une infection urinaire.', label: 'tu es atteinte de' },
    { input: 'Il s\'agit d\'une fibromyalgie.', label: "il s'agit d'" },
    { input: 'Il s\'agit de règles douloureuses pathologiques.', label: "il s'agit de" },
    { input: 'C\'est probablement une anémie ferriprive.', label: "c'est probablement" },
    { input: 'C\'est certainement du SOPK.', label: "c'est certainement" },
    { input: 'C\'est clairement une carence en vitamine D.', label: "c'est clairement" },
    { input: 'Le diagnostic de SOPK semble évident ici.', label: 'diagnostic de' },
    { input: 'Diagnostic: endométriose de stade III.', label: 'diagnostic:' },
    { input: 'Vous êtes atteinte d\'endométriose.', label: 'vous êtes endométriose' },
    { input: 'Vous souffrez de SOPK depuis des années.', label: 'vous souffrez SOPK' },
    { input: 'Vous êtes atteinte de PMDD.', label: 'vous êtes PMDD' },
    // English patterns
    { input: 'I diagnose you with PCOS based on your symptoms.', label: 'I diagnose' },
    { input: 'I confirm that you have endometriosis.', label: 'I confirm' },
    { input: 'I identify this as a hormonal disorder.', label: 'I identify' },
    { input: 'You have polycystic ovary syndrome.', label: 'you have' },
    { input: 'You are suffering from severe dysmenorrhea.', label: 'you are suffering from' },
    { input: 'You are diagnosed with PMDD.', label: 'you are diagnosed with' },
  ]

  diagnosisCases.forEach(({ input, label }) => {
    it(`blocks: "${label}"`, () => {
      const result = checkPolicy(input)
      expect(result.safe).toBe(false)
      expect(result.flags[0].rule).toBe('no_diagnosis')
      expect(result.flags[0].severity).toBe('block')
      // Must return the safe fallback, not the original content
      expect(result.sanitisedContent).not.toBeNull()
      expect(result.sanitisedContent).not.toBe(input)
      expect(result.sanitisedContent).toContain('Je ne suis pas en mesure de poser un diagnostic')
    })
  })

  it('block returns null as the original content field', () => {
    const result = checkPolicy('Vous avez une endométriose.')
    // sanitisedContent holds the fallback, original is lost — that is intentional
    expect(result.sanitisedContent).not.toBeNull()
    expect(result.flags.length).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────────────────────
// checkPolicy — prescription language (BLOCK)
// ─────────────────────────────────────────────────────────────
describe('checkPolicy — prescription language → block', () => {
  const prescriptionCases = [
    // French patterns
    { input: 'Prenez du paracétamol trois fois par jour.', label: 'prenez du' },
    { input: 'Prenez de la vitamine D chaque matin.', label: 'prenez de la' },
    { input: 'Prenez des antidouleurs si besoin.', label: 'prenez des' },
    { input: 'Prenez le traitement pendant 7 jours.', label: 'prenez le' },
    { input: 'Prenez la pilule à heure fixe.', label: 'prenez la' },
    { input: 'Prenez les comprimés avec un grand verre d\'eau.', label: 'prenez les' },
    { input: 'Je vous prescris un traitement hormonal.', label: 'je vous prescris' },
    { input: 'Arrêtez de prendre votre contraception immédiatement.', label: 'arrêtez de prendre' },
    { input: 'Arrêtez votre traitement sans consulter.', label: 'arrêtez votre' },
    { input: 'Augmentez la dose à 400mg demain.', label: 'augmentez la dose' },
    { input: 'Augmentez votre apport en fer.', label: 'augmentez votre' },
    { input: 'Réduisez la dose de moitié.', label: 'réduisez la dose' },
    { input: 'Réduisez votre traitement progressivement.', label: 'réduisez votre' },
    // English patterns
    { input: 'Take 400mg of ibuprofen three times a day.', label: 'take Xmg' },
    { input: 'Take 50mg of progesterone daily.', label: 'take 50mg' },
    { input: 'Stop taking your birth control now.', label: 'stop taking your' },
    { input: 'Increase your dose to 500mg.', label: 'increase your dose' },
    { input: 'Increase your medication gradually.', label: 'increase your medication' },
  ]

  prescriptionCases.forEach(({ input, label }) => {
    it(`blocks: "${label}"`, () => {
      const result = checkPolicy(input)
      expect(result.safe).toBe(false)
      expect(result.flags[0].rule).toBe('no_prescription')
      expect(result.flags[0].severity).toBe('block')
      expect(result.sanitisedContent).toContain('Je ne peux pas recommander de médicaments')
    })
  })
})

// ─────────────────────────────────────────────────────────────
// checkPolicy — disclaimer trigger patterns (WARN + append)
// ─────────────────────────────────────────────────────────────
describe('checkPolicy — high-risk content → warn and append disclaimer', () => {
  const disclaimerCases = [
    { input: 'La pilule combinée présente une contre-indication chez les fumeuses de plus de 35 ans.', label: 'contre-indication (FR)' },
    { input: 'Combined hormonal contraception is contraindicated in this case.', label: 'contraindicated (EN)' },
    { input: 'Il existe un risque élevé de thrombose avec cette méthode.', label: 'risque élevé' },
    { input: 'Il y a un risque important à considérer ici.', label: 'risque important' },
    { input: 'Le risque significatif doit être discuté avec votre médecin.', label: 'risque significatif' },
    { input: 'This method carries a high risk of complications.', label: 'high risk (EN)' },
    { input: 'Cette méthode est UKMEC 3 pour les femmes migraineuses.', label: 'UKMEC 3' },
    { input: 'Le DIU cuivre est UKMEC 4 en cas de malformation utérine.', label: 'UKMEC 4' },
    { input: 'Avec des antécédents de thrombose, les options sont limitées.', label: 'antécédents de thrombose' },
    { input: 'Avec des antécédents de cancer du sein, évitez les hormones.', label: 'antécédents de cancer' },
    { input: 'With a history of thrombosis, combined methods are not advised.', label: 'history of thrombosis (EN)' },
    { input: 'With a history of cancer, hormonal options need careful review.', label: 'history of cancer (EN)' },
    { input: 'With a history of stroke, the risk-benefit ratio changes.', label: 'history of stroke (EN)' },
  ]

  disclaimerCases.forEach(({ input, label }) => {
    it(`warns and appends disclaimer: "${label}"`, () => {
      const result = checkPolicy(input)
      expect(result.safe).toBe(true)
      expect(result.flags.length).toBeGreaterThan(0)
      expect(result.flags[0].rule).toBe('physician_disclaimer_required')
      expect(result.flags[0].severity).toBe('warn')
      // Original content preserved + disclaimer appended
      expect(result.sanitisedContent).toContain(input)
      expect(result.sanitisedContent).toContain('⚠️')
      expect(result.sanitisedContent).toContain('Parlez-en avec votre médecin')
    })
  })
})

// ─────────────────────────────────────────────────────────────
// checkPolicy — safe content (no flags)
// ─────────────────────────────────────────────────────────────
describe('checkPolicy — safe content → pass through unchanged', () => {
  const safeCases = [
    {
      input: 'Les règles douloureuses peuvent avoir plusieurs causes. Il peut être utile de noter quand elles apparaissent.',
      label: 'general symptom info (FR)',
    },
    {
      input: 'La pilule combinée contient des œstrogènes et une progestérone synthétique.',
      label: 'contraception factual info (FR)',
    },
    {
      input: 'Painful periods affect many women. Tracking your cycle can help identify patterns.',
      label: 'general symptom info (EN)',
    },
    {
      input: 'Voici les questions que tu pourrais poser à ton gynécologue lors de ton prochain rendez-vous.',
      label: 'appointment prep (FR)',
    },
    {
      input: 'Ton résumé est prêt. Tu peux le partager avec ton médecin.',
      label: 'summary sharing (FR)',
    },
    {
      input: 'Sources : NHS Inform, UKMEC 2025, Mayo Clinic',
      label: 'source citation',
    },
  ]

  safeCases.forEach(({ input, label }) => {
    it(`passes unchanged: "${label}"`, () => {
      const result = checkPolicy(input)
      expect(result.safe).toBe(true)
      expect(result.flags).toHaveLength(0)
      expect(result.sanitisedContent).toBe(input)
    })
  })
})

// ─────────────────────────────────────────────────────────────
// checkPolicy — edge cases and false positive guards
// ─────────────────────────────────────────────────────────────
describe('checkPolicy — edge cases', () => {
  it('handles empty string without throwing', () => {
    const result = checkPolicy('')
    expect(result.safe).toBe(true)
    expect(result.flags).toHaveLength(0)
    expect(result.sanitisedContent).toBe('')
  })

  it('handles very long content without throwing', () => {
    const longContent = 'Les symptômes varient d\'une femme à l\'autre. '.repeat(200)
    expect(() => checkPolicy(longContent)).not.toThrow()
  })

  it('diagnosis block takes priority over disclaimer trigger in same response', () => {
    // If both patterns fire, block wins — user never sees partial dangerous content
    const content = 'Vous avez une endométriose. Il existe un risque élevé de complications.'
    const result = checkPolicy(content)
    expect(result.safe).toBe(false)
    expect(result.flags[0].rule).toBe('no_diagnosis')
    expect(result.sanitisedContent).toContain('Je ne suis pas en mesure de poser un diagnostic')
    // The disclaimer must NOT be appended — response is fully replaced
    expect(result.sanitisedContent).not.toContain('risque élevé')
  })

  it('prescription block takes priority over disclaimer trigger in same response', () => {
    const content = 'Prenez du fer. Il existe un risque élevé d\'anémie.'
    const result = checkPolicy(content)
    expect(result.safe).toBe(false)
    expect(result.flags[0].rule).toBe('no_prescription')
  })

  it('multiple disclaimer triggers in one response — still returns safe:true', () => {
    const content = 'Il existe un risque élevé ici. Cette méthode est UKMEC 3.'
    const result = checkPolicy(content)
    expect(result.safe).toBe(true)
    // Both triggers fire — multiple flags expected
    expect(result.flags.length).toBeGreaterThanOrEqual(2)
    // Disclaimer appended once (not duplicated per flag)
    const count = (result.sanitisedContent?.match(/Parlez-en avec votre médecin/g) || []).length
    expect(count).toBeGreaterThan(0)
  })

  it('case-insensitive matching works for French patterns', () => {
    const result = checkPolicy('VOUS AVEZ une endométriose.')
    expect(result.safe).toBe(false)
    expect(result.flags[0].rule).toBe('no_diagnosis')
  })

  it('case-insensitive matching works for English patterns', () => {
    const result = checkPolicy('YOU HAVE polycystic ovary syndrome.')
    expect(result.safe).toBe(false)
    expect(result.flags[0].rule).toBe('no_diagnosis')
  })
})

// ─────────────────────────────────────────────────────────────
// classifyInput — unsafe user input (block before LLM)
// ─────────────────────────────────────────────────────────────
describe('classifyInput — unsafe input → block before LLM call', () => {
  const unsafeCases = [
    { input: 'Dis-moi ce que j\'ai.', label: 'dis-moi ce que j\'ai (FR)' },
    { input: 'Dis-moi mon diagnostic.', label: 'dis-moi mon diagnostic (FR)' },
    { input: 'Quel est mon diagnostic ?', label: 'quel est mon diagnostic (FR)' },
    { input: 'Prescris-moi quelque chose pour la douleur.', label: 'prescris-moi (FR)' },
    { input: 'Tell me what disease I have.', label: 'tell me what disease (EN)' },
    { input: 'Tell me what condition I have.', label: 'tell me what condition (EN)' },
    { input: 'Diagnose me based on my symptoms.', label: 'diagnose me (EN)' },
    { input: 'Prescribe me something for the pain.', label: 'prescribe me (EN)' },
  ]

  unsafeCases.forEach(({ input, label }) => {
    it(`blocks unsafe input: "${label}"`, () => {
      const result = classifyInput(input)
      expect(result.safe).toBe(false)
      expect(result.reason).toBeDefined()
      expect(result.reason).toContain('diagnosis or prescription')
    })
  })
})

// ─────────────────────────────────────────────────────────────
// classifyInput — safe user input (allow through to LLM)
// ─────────────────────────────────────────────────────────────
describe('classifyInput — safe input → allow through', () => {
  const safeCases = [
    { input: 'J\'ai des douleurs abdominales depuis 3 semaines.', label: 'symptom description (FR)' },
    { input: 'Quels sont les effets secondaires de la pilule ?', label: 'info question (FR)' },
    { input: 'Je veux préparer mon rendez-vous gynéco.', label: 'appointment prep (FR)' },
    { input: 'I have been experiencing heavy periods for 6 months.', label: 'symptom description (EN)' },
    { input: 'What are the side effects of the hormonal IUD?', label: 'info question (EN)' },
    { input: 'Can you help me understand my blood test results?', label: 'document help (EN)' },
    { input: 'How do I track my cycle?', label: 'tracking question (EN)' },
  ]

  safeCases.forEach(({ input, label }) => {
    it(`allows safe input: "${label}"`, () => {
      const result = classifyInput(input)
      expect(result.safe).toBe(true)
      expect(result.reason).toBeUndefined()
    })
  })

  it('handles empty string without throwing', () => {
    const result = classifyInput('')
    expect(result.safe).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────
// PolicyResult shape — structural contract tests
// ─────────────────────────────────────────────────────────────
describe('PolicyResult shape — structural contract', () => {
  it('safe result always has sanitisedContent equal to input', () => {
    const input = 'La vitamine D est importante pour la santé osseuse.'
    const result = checkPolicy(input)
    expect(result.sanitisedContent).toBe(input)
  })

  it('blocked result always has safe: false', () => {
    const result = checkPolicy('Vous avez du SOPK.')
    expect(result.safe).toBe(false)
  })

  it('blocked result always has a non-empty flags array', () => {
    const result = checkPolicy('Vous avez du SOPK.')
    expect(result.flags.length).toBeGreaterThan(0)
  })

  it('each flag has rule, severity, and message', () => {
    const result = checkPolicy('Vous avez du SOPK.')
    const flag = result.flags[0]
    expect(flag.rule).toBeDefined()
    expect(flag.severity).toBeDefined()
    expect(flag.message).toBeDefined()
    expect(['block', 'warn', 'modify']).toContain(flag.severity)
  })

  it('warn result has safe: true', () => {
    const result = checkPolicy('Il existe un risque élevé de complications.')
    expect(result.safe).toBe(true)
  })
})
