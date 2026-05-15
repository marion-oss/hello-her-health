// Anoqi — Consent copy.
//
// Shared FR/EN copy block for the full-page ConsentScreen and the
// bottom-up ConsentSheet rendered from ChatScreen after the user's
// first message on the skip-and-chat path. Both surfaces present the
// same legal text — one source of truth.

export const CONSENT_TERMS_URL = 'https://anoqi.health/terms'
export const CONSENT_PRIVACY_URL = 'https://anoqi.health/privacy'

export const CONSENT_COPY = {
  fr: {
    title: 'Avant de commencer',
    subtitle:
      "Anoqi traite des sujets sensibles. Voici comment tes données restent à toi — et ce qui change si tu choisis d'aider la recherche.",
    step: 'Étape 2 sur 3',
    termsLabel: "J'accepte les ",
    termsLink: "Conditions d'utilisation",
    termsAnd: ' et la ',
    privacyLink: 'Politique de confidentialité',
    healthLabel:
      "J'accepte que mes questions de santé soient traitées pour me fournir des réponses.",
    healthNote: 'Tes données restent sur ton appareil. Jamais liées à ton nom.',
    researchLabel:
      'Aide à personnaliser tes recommandations et soutiens la recherche en santé féminine avec des partenaires accrédités.',
    researchNote: "Tout ce qui t'identifie est retiré avant tout partage.",
    learnMore: 'En savoir plus',
    optional: 'Optionnel',
    cta: 'Accepter et continuer',
    ctaDisabled: 'Coche les deux requis pour continuer',
  },
  en: {
    title: 'Before we start',
    subtitle:
      "Anoqi handles sensitive topics. Here's how your data stays yours — and what changes if you choose to help research.",
    step: 'Step 2 of 3',
    termsLabel: 'I agree to the ',
    termsLink: 'Terms of Service',
    termsAnd: ' and ',
    privacyLink: 'Privacy Policy',
    healthLabel:
      'I agree to my health questions being processed to provide answers.',
    healthNote: 'Your data stays on your device. Never tied to your name.',
    researchLabel:
      "Help personalise your recommendations and support women's health research with vetted partners.",
    researchNote: 'Everything that identifies you is removed before any sharing.',
    learnMore: 'Learn more',
    optional: 'Optional',
    cta: 'Accept & continue',
    ctaDisabled: 'Check both required to continue',
  },
} as const
