/**
 * anoqi Pseudonymisation Pipeline — Test Suite
 *
 * Tests every PII pattern in pseudonymise.ts.
 * Run with: npx vitest run api/lib/pseudonymise.test.ts
 *
 * Like policy.test.ts, these are a GDPR safety requirement.
 * A missed PII pattern means real patient data could reach the AI.
 */

import { describe, it, expect } from 'vitest'
import { pseudonymise, classifyDocument } from './pseudonymise'

// ─────────────────────────────────────────────────────────────
// Numéro INSEE / Sécurité Sociale (NIR)
// ─────────────────────────────────────────────────────────────
describe('pseudonymise — NIR (Sécurité Sociale)', () => {
  it('strips spaced NIR format', () => {
    const { pseudonymisedText, detectedTypes } = pseudonymise('NIR : 2 85 03 75 116 042 06')
    expect(pseudonymisedText).not.toContain('285037511604206')
    expect(pseudonymisedText).toContain('[NIR]')
    expect(detectedTypes).toContain('nir')
  })

  it('strips unspaced NIR format', () => {
    const { pseudonymisedText } = pseudonymise('Numéro de sécurité sociale : 185037511604219')
    expect(pseudonymisedText).toContain('[NIR]')
    expect(pseudonymisedText).not.toContain('185037511604219')
  })

  it('strips female NIR (starts with 2)', () => {
    const { pseudonymisedText } = pseudonymise('Assurée : 2 90 06 75 042 011 53')
    expect(pseudonymisedText).toContain('[NIR]')
  })
})

// ─────────────────────────────────────────────────────────────
// Email addresses
// ─────────────────────────────────────────────────────────────
describe('pseudonymise — email addresses', () => {
  it('strips standard email', () => {
    const { pseudonymisedText, detectedTypes } = pseudonymise('Contacter la patiente : marie.dupont@gmail.com')
    expect(pseudonymisedText).toContain('[EMAIL]')
    expect(pseudonymisedText).not.toContain('marie.dupont@gmail.com')
    expect(detectedTypes).toContain('email')
  })

  it('strips professional email', () => {
    const { pseudonymisedText } = pseudonymise('Email : m.dupont@chu-paris.fr')
    expect(pseudonymisedText).toContain('[EMAIL]')
  })

  it('strips email with plus sign', () => {
    const { pseudonymisedText } = pseudonymise('Adresse : marie+sante@proton.me')
    expect(pseudonymisedText).toContain('[EMAIL]')
  })

  it('does not strip non-email text', () => {
    const { pseudonymisedText } = pseudonymise('Le traitement est efficace à 90%.')
    expect(pseudonymisedText).not.toContain('[EMAIL]')
    expect(pseudonymisedText).toBe('Le traitement est efficace à 90%.')
  })
})

// ─────────────────────────────────────────────────────────────
// French phone numbers
// ─────────────────────────────────────────────────────────────
describe('pseudonymise — phone numbers', () => {
  it('strips spaced mobile number', () => {
    const { pseudonymisedText, detectedTypes } = pseudonymise('Téléphone : 06 12 34 56 78')
    expect(pseudonymisedText).toContain('[TELEPHONE]')
    expect(pseudonymisedText).not.toContain('06 12 34 56 78')
    expect(detectedTypes).toContain('phone')
  })

  it('strips unspaced mobile number', () => {
    const { pseudonymisedText } = pseudonymise('Tél : 0612345678')
    expect(pseudonymisedText).toContain('[TELEPHONE]')
  })

  it('strips landline number', () => {
    const { pseudonymisedText } = pseudonymise('Fixe : 01 42 33 44 55')
    expect(pseudonymisedText).toContain('[TELEPHONE]')
  })

  it('strips international French number', () => {
    const { pseudonymisedText } = pseudonymise('Mobile : +33 6 12 34 56 78')
    expect(pseudonymisedText).toContain('[TELEPHONE]')
  })

  it('strips dot-separated number', () => {
    const { pseudonymisedText } = pseudonymise('06.12.34.56.78')
    expect(pseudonymisedText).toContain('[TELEPHONE]')
  })
})

// ─────────────────────────────────────────────────────────────
// Dates of birth
// ─────────────────────────────────────────────────────────────
describe('pseudonymise — dates of birth', () => {
  it('strips day/month but KEEPS year from "née le" format', () => {
    const { pseudonymisedText, detectedTypes } = pseudonymise('Patiente née le 15/03/1985')
    expect(pseudonymisedText).toContain('[DATE_NAISSANCE]')
    expect(pseudonymisedText).not.toContain('15/03')   // day/month gone
    expect(pseudonymisedText).toContain('1985')         // year preserved
    expect(detectedTypes).toContain('dob_labelled')
  })

  it('strips day/month but KEEPS year from "date de naissance" label', () => {
    const { pseudonymisedText } = pseudonymise('Date de naissance : 22.07.1990')
    expect(pseudonymisedText).toContain('[DATE_NAISSANCE]')
    expect(pseudonymisedText).not.toContain('22.07')
    expect(pseudonymisedText).toContain('1990')
  })

  it('strips day/month but KEEPS year from DDN abbreviation', () => {
    const { pseudonymisedText } = pseudonymise('DDN : 08-11-1978')
    expect(pseudonymisedText).toContain('[DATE_NAISSANCE]')
    expect(pseudonymisedText).toContain('1978')
  })

  it('strips day/month but KEEPS year from DOB (English)', () => {
    const { pseudonymisedText } = pseudonymise('DOB: 03/04/1992')
    expect(pseudonymisedText).toContain('[DATE_NAISSANCE]')
    expect(pseudonymisedText).toContain('1992')
  })

  it('preserves "née en YYYY" entirely — year-only is safe to keep', () => {
    const { pseudonymisedText } = pseudonymise('Patiente née en 1985, suivi depuis 2020')
    expect(pseudonymisedText).not.toContain('[DATE_NAISSANCE]')
    expect(pseudonymisedText).toContain('1985')   // year kept
    expect(pseudonymisedText).toContain('2020')   // other years unaffected
  })

  it('does not strip standalone years unrelated to DOB', () => {
    const { pseudonymisedText } = pseudonymise('Traitement initié en 2022, réévaluation en 2023.')
    expect(pseudonymisedText).not.toContain('[DATE_NAISSANCE]')
  })
})

// ─────────────────────────────────────────────────────────────
// French addresses
// ─────────────────────────────────────────────────────────────
describe('pseudonymise — addresses', () => {
  it('strips "rue" address', () => {
    const { pseudonymisedText, detectedTypes } = pseudonymise('Domicile : 12 rue de la Paix, Paris')
    expect(pseudonymisedText).toContain('[ADRESSE]')
    expect(pseudonymisedText).not.toContain('12 rue de la Paix')
    expect(detectedTypes).toContain('address')
  })

  it('strips "avenue" address', () => {
    const { pseudonymisedText } = pseudonymise('Adresse : 5 avenue Victor Hugo')
    expect(pseudonymisedText).toContain('[ADRESSE]')
  })

  it('strips "boulevard" address', () => {
    const { pseudonymisedText } = pseudonymise('3 boulevard Haussmann, 75009 Paris')
    expect(pseudonymisedText).toContain('[ADRESSE]')
  })

  it('strips postal code', () => {
    const { pseudonymisedText, detectedTypes } = pseudonymise('Résidant à Paris 75015')
    expect(pseudonymisedText).toContain('[CODE_POSTAL]')
    expect(detectedTypes).toContain('postal_code')
  })

  it('strips various Paris arrondissement codes', () => {
    const inputs = ['75001', '75008', '75020', '92100', '93200', '94000']
    inputs.forEach(code => {
      const { pseudonymisedText } = pseudonymise(`Code postal : ${code}`)
      expect(pseudonymisedText).toContain('[CODE_POSTAL]')
    })
  })
})

// ─────────────────────────────────────────────────────────────
// Patient name markers
// ─────────────────────────────────────────────────────────────
describe('pseudonymise — patient name markers', () => {
  it('strips "Patient :" label format', () => {
    const { pseudonymisedText, detectedTypes } = pseudonymise('Patient : Marie Dupont')
    expect(pseudonymisedText).toContain('[NOM]')
    expect(pseudonymisedText).not.toContain('Marie Dupont')
    expect(detectedTypes).toContain('name_labelled')
  })

  it('strips "Nom :" label format', () => {
    const { pseudonymisedText } = pseudonymise('Nom : DUPONT\nPrénom : Marie')
    expect(pseudonymisedText).toContain('[NOM]')
    expect(pseudonymisedText).not.toContain('DUPONT')
  })

  it('strips "Patiente :" label format', () => {
    const { pseudonymisedText } = pseudonymise('Patiente : Sophie Martin, 34 ans')
    expect(pseudonymisedText).toContain('[NOM]')
    expect(pseudonymisedText).not.toContain('Sophie Martin')
  })

  it('strips English "Name:" label format', () => {
    const { pseudonymisedText } = pseudonymise('Name: Jane Smith')
    expect(pseudonymisedText).toContain('[NOM]')
  })
})

// ─────────────────────────────────────────────────────────────
// Doctor / practitioner names
// ─────────────────────────────────────────────────────────────
describe('pseudonymise — doctor names', () => {
  it('strips "Dr." format', () => {
    const { pseudonymisedText, detectedTypes } = pseudonymise('Prescrit par Dr. Sophie Martin')
    expect(pseudonymisedText).toContain('[MEDECIN]')
    expect(pseudonymisedText).not.toContain('Sophie Martin')
    expect(detectedTypes).toContain('doctor_name')
  })

  it('strips "Dr " without dot', () => {
    const { pseudonymisedText } = pseudonymise('Médecin traitant : Dr Dupont')
    expect(pseudonymisedText).toContain('[MEDECIN]')
  })

  it('strips "Docteur" full word', () => {
    const { pseudonymisedText } = pseudonymise('Ordonnance du Docteur Bernard Leclerc')
    expect(pseudonymisedText).toContain('[MEDECIN]')
    expect(pseudonymisedText).not.toContain('Bernard Leclerc')
  })

  it('strips "Pr." professor title', () => {
    const { pseudonymisedText } = pseudonymise('Avis du Pr. Martin, CHU Pitié-Salpêtrière')
    expect(pseudonymisedText).toContain('[MEDECIN]')
  })
})

// ─────────────────────────────────────────────────────────────
// RPPS / ADELI practitioner numbers
// ─────────────────────────────────────────────────────────────
describe('pseudonymise — practitioner numbers', () => {
  it('strips RPPS number', () => {
    const { pseudonymisedText, detectedTypes } = pseudonymise('RPPS : 10003456789')
    expect(pseudonymisedText).toContain('[NUM_PRATICIEN]')
    expect(detectedTypes).toContain('practitioner_number')
  })

  it('strips ADELI number', () => {
    const { pseudonymisedText } = pseudonymise('N° ADELI : 123456789')
    expect(pseudonymisedText).toContain('[NUM_PRATICIEN]')
  })
})

// ─────────────────────────────────────────────────────────────
// Realistic document extracts — end-to-end
// ─────────────────────────────────────────────────────────────
describe('pseudonymise — realistic document extracts', () => {
  it('cleans a typical French lab result header', () => {
    const doc = `
RÉSULTATS D'ANALYSES BIOLOGIQUES
Laboratoire Cerba — Paris

Patiente : DUPONT Marie
Date de naissance : 15/03/1985
NIR : 2 85 03 75 116 042 06
Médecin prescripteur : Dr. Sophie Bernard
RPPS : 10003456789
Adresse : 12 rue de la Paix, 75001 Paris
Téléphone : 06 12 34 56 78
Email : marie.dupont@gmail.com

Bilan hormonal — Résultats :
TSH : 2.4 mUI/L (norme : 0.4–4.0)
Estradiol : 120 pg/mL
FSH : 6.2 UI/L
    `

    const { pseudonymisedText, detectedTypes, replacementCount } = pseudonymise(doc)

    // All PII gone
    expect(pseudonymisedText).not.toContain('DUPONT Marie')
    expect(pseudonymisedText).not.toContain('15/03')    // day/month stripped
    expect(pseudonymisedText).toContain('1985')          // year preserved
    expect(pseudonymisedText).not.toContain('285037511604206')
    expect(pseudonymisedText).not.toContain('Sophie Bernard')
    expect(pseudonymisedText).not.toContain('10003456789')
    expect(pseudonymisedText).not.toContain('12 rue de la Paix')
    expect(pseudonymisedText).not.toContain('75001')
    expect(pseudonymisedText).not.toContain('06 12 34 56 78')
    expect(pseudonymisedText).not.toContain('marie.dupont@gmail.com')

    // Clinical content preserved
    expect(pseudonymisedText).toContain('TSH : 2.4 mUI/L')
    expect(pseudonymisedText).toContain('Estradiol : 120 pg/mL')
    expect(pseudonymisedText).toContain('FSH : 6.2 UI/L')
    expect(pseudonymisedText).toContain('Bilan hormonal')

    // Multiple PII types detected
    expect(detectedTypes.length).toBeGreaterThan(3)
    expect(replacementCount).toBeGreaterThan(5)
  })

  it('cleans a prescription document', () => {
    const doc = `
ORDONNANCE MÉDICALE

Dr. Jean-Pierre Moreau
Médecin généraliste — RPPS 10009876543
Cabinet : 45 avenue de la République, 75011 Paris
Tél : 01 43 55 66 77

Prescrit pour :
Patiente : MARTIN Amélie
DDN : 22/07/1990
NIR : 2 90 07 75 042 018 24

Médicaments prescrits :
- Ibuprofène 400mg — 1 comprimé 3 fois par jour pendant 5 jours
- Doliprane 500mg — si douleur résiduelle
    `

    const { pseudonymisedText } = pseudonymise(doc)

    // PII stripped
    expect(pseudonymisedText).not.toContain('Jean-Pierre Moreau')
    expect(pseudonymisedText).not.toContain('10009876543')
    expect(pseudonymisedText).not.toContain('45 avenue de la République')
    expect(pseudonymisedText).not.toContain('01 43 55 66 77')
    expect(pseudonymisedText).not.toContain('MARTIN Amélie')
    expect(pseudonymisedText).not.toContain('22/07')    // day/month stripped
    expect(pseudonymisedText).toContain('1990')          // year preserved

    // Medical content preserved
    expect(pseudonymisedText).toContain('Ibuprofène 400mg')
    expect(pseudonymisedText).toContain('Doliprane 500mg')
    expect(pseudonymisedText).toContain('ORDONNANCE MÉDICALE')
  })
})

// ─────────────────────────────────────────────────────────────
// Edge cases
// ─────────────────────────────────────────────────────────────
describe('pseudonymise — edge cases', () => {
  it('handles empty string without throwing', () => {
    expect(() => pseudonymise('')).not.toThrow()
    const { pseudonymisedText, detectedTypes, replacementCount } = pseudonymise('')
    expect(pseudonymisedText).toBe('')
    expect(detectedTypes).toHaveLength(0)
    expect(replacementCount).toBe(0)
  })

  it('handles text with no PII', () => {
    const clean = 'TSH : 2.4 mUI/L. FSH : 6.2 UI/L. Estradiol normal.'
    const { pseudonymisedText, replacementCount } = pseudonymise(clean)
    expect(pseudonymisedText).toBe(clean)
    expect(replacementCount).toBe(0)
  })

  it('handles multiple occurrences of the same PII type', () => {
    const text = 'Tel : 06 12 34 56 78. Autre tel : 07 98 76 54 32.'
    const { pseudonymisedText, replacementCount } = pseudonymise(text)
    expect(pseudonymisedText).not.toContain('06 12 34 56 78')
    expect(pseudonymisedText).not.toContain('07 98 76 54 32')
    expect(replacementCount).toBeGreaterThanOrEqual(2)
  })

  it('returns replacementCount equal to total replacements made', () => {
    const text = 'Email : a@b.com. Tél : 06 11 22 33 44. NIR : 185037511604219.'
    const { replacementCount } = pseudonymise(text)
    expect(replacementCount).toBeGreaterThanOrEqual(3)
  })

  it('handles very long documents without throwing', () => {
    const longText = 'TSH : 2.4 mUI/L. Résultats normaux. '.repeat(500)
    expect(() => pseudonymise(longText)).not.toThrow()
  })
})

// ─────────────────────────────────────────────────────────────
// Document classifier
// ─────────────────────────────────────────────────────────────
describe('classifyDocument', () => {
  it('classifies lab results as "analyses"', () => {
    const text = 'Résultats d\'analyses biologiques. TSH : 2.4. Hémoglobine : 12.5 g/dL.'
    expect(classifyDocument(text)).toBe('analyses')
  })

  it('classifies scan report as "imagerie"', () => {
    const text = 'Compte-rendu d\'échographie pelvienne. Utérus de taille normale.'
    expect(classifyDocument(text)).toBe('imagerie')
  })

  it('classifies consultation note as "comptes_rendus"', () => {
    const text = 'Compte-rendu de consultation gynécologique. Motif : dysménorrhée.'
    expect(classifyDocument(text)).toBe('comptes_rendus')
  })

  it('classifies prescription as "ordonnances"', () => {
    const text = 'Ordonnance médicale. Ibuprofène 400mg à prendre 3 comprimés par jour.'
    expect(classifyDocument(text)).toBe('ordonnances')
  })

  it('classifies vaccination record as "vaccins"', () => {
    const text = 'Carnet de vaccination. Vaccin ROR effectué. Rappel DTP à jour.'
    expect(classifyDocument(text)).toBe('vaccins')
  })

  it('classifies medical history as "antecedents"', () => {
    const text = 'Antécédents médicaux : endométriose diagnostiquée en 2019. Terrain allergique.'
    expect(classifyDocument(text)).toBe('antecedents')
  })

  it('returns "autre" for unrecognised documents', () => {
    const text = 'Bonjour, veuillez trouver ci-joint les informations demandées.'
    expect(classifyDocument(text)).toBe('autre')
  })

  it('handles empty string without throwing', () => {
    expect(() => classifyDocument('')).not.toThrow()
    expect(classifyDocument('')).toBe('autre')
  })
})
