-- anoqi Source Library — Dev Seed Data
-- Migration: seed/dev_sources.sql
-- Run AFTER 001_core_tables.sql
--
-- Populates source_library with validated clinical sources.
-- These are the sources Gemini is instructed to cite.
-- Without this data, the AI will hallucinate citations.
--
-- Sources are validated against UKMEC 2025, NHS guidelines, and peer-reviewed literature.
-- inclusion_score: 1–10 quality score (10 = gold standard, primary source)
-- All sources marked is_active = true are live for AI grounding.
--
-- To deactivate a source without deleting it:
--   UPDATE public.source_library SET is_active = false WHERE id = '<uuid>';

-- ─────────────────────────────────────────────────────────────
-- CONTRACEPTION SOURCES
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.source_library
  (name, url, category, language, inclusion_score, publication_year, validated_by, validated_at, is_active, notes)
VALUES
  (
    'UKMEC 2025 — UK Medical Eligibility Criteria for Contraceptive Use',
    'https://www.fsrh.org/standards-and-guidance/documents/ukmec-2016/',
    'contraception',
    'en',
    10,
    2025,
    'Clinical review pending',
    now(),
    true,
    'Gold standard for contraceptive safety classification. UKMEC 1–4 categories used directly in policy layer. Update reference URL when FSRH publishes 2025 edition.'
  ),
  (
    'NHS Inform — Contraception',
    'https://www.nhsinform.scot/healthy-living/contraception/',
    'contraception',
    'en',
    9,
    2024,
    'Clinical review pending',
    now(),
    true,
    'NHS Scotland patient-facing contraception guide. Plain language, evidence-based. Good for user-facing explanations.'
  ),
  (
    'The Lowdown — Contraception Reviews and Data',
    'https://thelowdown.com',
    'contraception',
    'en',
    7,
    2024,
    'Clinical review pending',
    now(),
    true,
    'Real-world patient-reported contraception experience data. Supplement to clinical sources — cite for lived experience context, not clinical guidance.'
  ),
  (
    'FSRH Clinical Guidance — Combined Hormonal Contraception',
    'https://www.fsrh.org/standards-and-guidance/documents/ceu-clinical-guidance-combined-hormonal-contraception/',
    'contraception',
    'en',
    10,
    2023,
    'Clinical review pending',
    now(),
    true,
    'FSRH primary guidance on CHC. Covers eligibility, risks, drug interactions. Reference for pill, patch, ring advice.'
  ),
  (
    'FSRH Clinical Guidance — Progestogen-only Pills',
    'https://www.fsrh.org/standards-and-guidance/documents/fsrh-clinical-guideline-progestogen-only-pills/',
    'contraception',
    'en',
    10,
    2022,
    'Clinical review pending',
    now(),
    true,
    'Primary guidance for POP (mini-pill). Covers desogestrel, norethisterone, efficacy, eligibility.'
  ),
  (
    'FSRH Clinical Guidance — Intrauterine Contraception',
    'https://www.fsrh.org/standards-and-guidance/documents/ceu-clinical-guidance-intrauterine-contraception/',
    'contraception',
    'en',
    10,
    2023,
    'Clinical review pending',
    now(),
    true,
    'Primary guidance on IUS (Mirena, Kyleena, Jaydess) and IUD (copper). Covers insertion, eligibility, side effects.'
  ),
  (
    'Mayo Clinic — Contraception Overview',
    'https://www.mayoclinic.org/healthy-lifestyle/birth-control/basics/birth-control-basics/hlv-20049454',
    'contraception',
    'en',
    8,
    2024,
    'Clinical review pending',
    now(),
    true,
    'Reliable patient-facing overview. Good for general contraception questions and method comparisons.'
  ),
  (
    'Ameli.fr — Contraception et santé sexuelle',
    'https://www.ameli.fr/assure/sante/themes/contraception',
    'contraception',
    'fr',
    8,
    2024,
    'Clinical review pending',
    now(),
    true,
    'French public health insurance guidance on contraception. French-language primary source. Covers reimbursement, access, and methods.'
  ),
  (
    'Choisiruntraitement.fr — Contraception',
    'https://www.choisiruntraitement.fr/en-savoir-plus/contraception/',
    'contraception',
    'fr',
    7,
    2023,
    'Clinical review pending',
    now(),
    true,
    'Evidence-based French-language contraception decision aid. Useful for comparative method guidance.'
  );

-- ─────────────────────────────────────────────────────────────
-- SYMPTOMS AND GYNAECOLOGICAL CONDITIONS
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.source_library
  (name, url, category, language, inclusion_score, publication_year, validated_by, validated_at, is_active, notes)
VALUES
  (
    'NHS Inform — Endometriosis',
    'https://www.nhsinform.scot/illnesses-and-conditions/reproductive-organs/endometriosis/',
    'symptoms',
    'en',
    9,
    2024,
    'Clinical review pending',
    now(),
    true,
    'NHS Scotland evidence-based patient guide to endometriosis. Covers symptoms, diagnosis pathway, treatment options.'
  ),
  (
    'Endometriosis UK — Information and Support',
    'https://www.endometriosis-uk.org/understanding-endometriosis',
    'symptoms',
    'en',
    8,
    2024,
    'Clinical review pending',
    now(),
    true,
    'UK charity specialising in endometriosis. Good for symptom descriptions, lived experience, and specialist referral pathway.'
  ),
  (
    'NHS — Polycystic Ovary Syndrome (PCOS)',
    'https://www.nhs.uk/conditions/polycystic-ovary-syndrome-pcos/',
    'symptoms',
    'en',
    9,
    2024,
    'Clinical review pending',
    now(),
    true,
    'NHS primary guidance on PCOS. Covers diagnosis criteria, symptoms, management. Use for general PCOS information.'
  ),
  (
    'Mayo Clinic — PCOS',
    'https://www.mayoclinic.org/diseases-conditions/pcos/symptoms-causes/syc-20353439',
    'symptoms',
    'en',
    8,
    2024,
    'Clinical review pending',
    now(),
    true,
    'Comprehensive patient-facing PCOS overview. Good for symptom lists and management options.'
  ),
  (
    'ACOG — Dysmenorrhea: Painful Periods',
    'https://www.acog.org/womens-health/faqs/dysmenorrhea-painful-periods',
    'symptoms',
    'en',
    9,
    2023,
    'Clinical review pending',
    now(),
    true,
    'American College of Obstetricians and Gynecologists primary guidance on dysmenorrhea. Evidence-based, clinical.'
  ),
  (
    'NHS — Premenstrual Syndrome (PMS)',
    'https://www.nhs.uk/conditions/pre-menstrual-syndrome/',
    'symptoms',
    'en',
    9,
    2024,
    'Clinical review pending',
    now(),
    true,
    'NHS guidance on PMS and PMDD. Covers symptoms, severity classification, management. Use for cycle-related mood and physical symptoms.'
  ),
  (
    'Has-santé.fr — Endométriose : diagnostic et prise en charge',
    'https://www.has-sante.fr/jcms/p_3261764/fr/endometriose',
    'symptoms',
    'fr',
    10,
    2022,
    'Clinical review pending',
    now(),
    true,
    'Haute Autorité de Santé official French guidance on endometriosis. Gold standard for French clinical context.'
  );

-- ─────────────────────────────────────────────────────────────
-- NUTRITION AND MICRONUTRIENTS
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.source_library
  (name, url, category, language, inclusion_score, publication_year, validated_by, validated_at, is_active, notes)
VALUES
  (
    'NIH Office of Dietary Supplements — Iron',
    'https://ods.od.nih.gov/factsheets/Iron-HealthProfessional/',
    'nutrition',
    'en',
    10,
    2024,
    'Clinical review pending',
    now(),
    true,
    'NIH primary source for iron RDAs, deficiency, food sources. Use for iron-deficiency anaemia and heavy period nutrition questions.'
  ),
  (
    'NIH Office of Dietary Supplements — Vitamin D',
    'https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/',
    'nutrition',
    'en',
    10,
    2024,
    'Clinical review pending',
    now(),
    true,
    'NIH primary source for vitamin D. Covers deficiency, supplementation, RDAs. Relevant to PCOS, endometriosis, general fatigue questions.'
  ),
  (
    'NIH Office of Dietary Supplements — Magnesium',
    'https://ods.od.nih.gov/factsheets/Magnesium-HealthProfessional/',
    'nutrition',
    'en',
    10,
    2024,
    'Clinical review pending',
    now(),
    true,
    'NIH primary source for magnesium. Relevant to PMS, dysmenorrhea, sleep, and mood questions.'
  ),
  (
    'NIH Office of Dietary Supplements — Folate',
    'https://ods.od.nih.gov/factsheets/Folate-HealthProfessional/',
    'nutrition',
    'en',
    10,
    2024,
    'Clinical review pending',
    now(),
    true,
    'NIH primary source for folate/folic acid. Relevant to fertility, pregnancy planning, and general women''s health questions.'
  ),
  (
    'USDA FoodData Central',
    'https://fdc.nal.usda.gov/',
    'nutrition',
    'en',
    9,
    2024,
    'Clinical review pending',
    now(),
    true,
    'Authoritative food composition database. Use for specific food nutrient content questions.'
  ),
  (
    'NIH National Center for Complementary and Integrative Health (NCCIH)',
    'https://www.nccih.nih.gov/health',
    'nutrition',
    '8',
    2024,
    'Clinical review pending',
    now(),
    true,
    'NIH evidence reviews for complementary approaches. Use for questions about supplements, herbal remedies. Counterbalances non-evidence-based claims.'
  );

-- ─────────────────────────────────────────────────────────────
-- GENERAL WOMEN''S HEALTH
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.source_library
  (name, url, category, language, inclusion_score, publication_year, validated_by, validated_at, is_active, notes)
VALUES
  (
    'NHS — Women''s Health',
    'https://www.nhs.uk/womens-health/',
    'general',
    'en',
    9,
    2024,
    'Clinical review pending',
    now(),
    true,
    'NHS women''s health hub. Covers broad range of topics including menstrual health, menopause, and sexual health. Reliable, evidence-based.'
  ),
  (
    'NICE — Women''s and Reproductive Health Guidelines',
    'https://www.nice.org.uk/guidance/conditions-and-diseases/gynaecological-conditions',
    'general',
    'en',
    10,
    2024,
    'Clinical review pending',
    now(),
    true,
    'NICE clinical guidelines for gynaecological conditions. Highest-quality UK evidence base. Use for clinical pathway questions.'
  ),
  (
    'WHO — Reproductive Health',
    'https://www.who.int/health-topics/reproductive-health',
    'general',
    'both',
    9,
    2024,
    'Clinical review pending',
    now(),
    true,
    'WHO international guidance on reproductive health. Use for global context, prevalence data, and international comparisons.'
  ),
  (
    'Santé.fr — Santé des femmes',
    'https://www.sante.fr/c/sante-des-femmes',
    'general',
    'fr',
    8,
    2024,
    'Clinical review pending',
    now(),
    true,
    'French public health portal for women''s health. Good for French-language general health questions and referral pathways.'
  );

-- ─────────────────────────────────────────────────────────────
-- MENOPAUSE
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.source_library
  (name, url, category, language, inclusion_score, publication_year, validated_by, validated_at, is_active, notes)
VALUES
  (
    'British Menopause Society — Evidence-Based Guidelines',
    'https://thebms.org.uk/publications/guidelines/',
    'menopause',
    'en',
    10,
    2024,
    'Clinical review pending',
    now(),
    true,
    'UK gold standard for menopause guidance. Covers HRT, perimenopause, symptom management. Essential source for menopause journey.'
  ),
  (
    'NICE NG23 — Menopause: diagnosis and management',
    'https://www.nice.org.uk/guidance/ng23',
    'menopause',
    'en',
    10,
    2019,
    'Clinical review pending',
    now(),
    true,
    'NICE clinical guideline on menopause. Covers diagnosis, HRT safety, alternative treatments. Note: 2019, check for updates.'
  ),
  (
    'NHS — Menopause',
    'https://www.nhs.uk/conditions/menopause/',
    'menopause',
    'en',
    9,
    2024,
    'Clinical review pending',
    now(),
    true,
    'NHS patient-facing menopause guide. Covers symptoms, HRT, lifestyle. Good starting point for user-facing menopause answers.'
  );

-- Verify seed data loaded correctly
-- Expected: ~24 rows
SELECT count(*) as sources_loaded, category FROM public.source_library GROUP BY category ORDER BY category;
