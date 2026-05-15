// Anoqi — AccountScreen.
//
// Segmented control with three tabs (signup / login / anonymous). The selected
// pill slides between tabs. Anonymous tab shows a Cotton Rose info card with a
// sage ShieldCheck icon and a CTA. Forms use sage focus rings.

import React, { useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  View,
} from 'react-native'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'

import { useOnboarding } from '../../context/OnboardingContext'
import type { OnboardingStackParamList } from './OnboardingNavigator'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../theme'
import {
  BackHeader,
  Button,
  Icon,
  Input,
  ProgressBar,
  SegmentedControl,
  Text,
} from '../../components'

type AuthMode = 'signup' | 'login' | 'anon'

const COPY = {
  fr: {
    title: 'Ton espace sécurisé',
    subtitle:
      "Crée un compte pour retrouver tes résumés depuis n'importe quel appareil.",
    step: 'Étape 3 sur 3',
    tabs: {
      signup: 'Crée un compte',
      login: 'Connecte-toi',
      anon: 'Anonyme',
    },
    email: 'Email',
    emailPlaceholder: 'toi@exemple.fr',
    password: 'Mot de passe',
    passwordPlaceholder: '8 caractères minimum',
    passwordConfirm: 'Confirme le mot de passe',
    birthYear: 'Année de naissance',
    birthYearPlaceholder: 'ex. 1985',
    country: 'Pays',
    countryPlaceholder: 'ex. France',
    signupCta: 'Créer mon compte',
    loginCta: 'Me connecter',
    anonTitle: 'Continue sans compte',
    anonBody:
      "Tes données restent sur cet appareil et ne sont jamais liées à ton nom. Tu pourras créer un compte plus tard si tu changes d'avis.",
    anonCta: 'Continuer en anonyme',
    privacy: 'Tes données sont hébergées en Europe (UE) et ne sont jamais vendues.',
    errorPasswordMatch: 'Les mots de passe ne correspondent pas',
    errorPasswordLength: 'Le mot de passe doit contenir au moins 8 caractères',
    errorEmailInvalid: 'Adresse email invalide',
    errorBirthYearInvalid: 'Année de naissance invalide',
  },
  en: {
    title: 'Your secure space',
    subtitle: 'Create an account to access your summaries from any device.',
    step: 'Step 3 of 3',
    tabs: {
      signup: 'Sign up',
      login: 'Log in',
      anon: 'Anonymous',
    },
    email: 'Email',
    emailPlaceholder: 'you@example.com',
    password: 'Password',
    passwordPlaceholder: 'Minimum 8 characters',
    passwordConfirm: 'Confirm password',
    birthYear: 'Birth year',
    birthYearPlaceholder: 'e.g. 1985',
    country: 'Country',
    countryPlaceholder: 'e.g. United Kingdom',
    signupCta: 'Create my account',
    loginCta: 'Log in',
    anonTitle: 'Continue without an account',
    anonBody:
      "Your data stays on this device and is never linked to your name. You can create an account later if you change your mind.",
    anonCta: 'Continue anonymously',
    privacy: 'Your data is hosted in Europe (EU) and never sold.',
    errorPasswordMatch: 'Passwords do not match',
    errorPasswordLength: 'Password must be at least 8 characters',
    errorEmailInvalid: 'Invalid email address',
    errorBirthYearInvalid: 'Invalid birth year',
  },
} as const

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}
function validateBirthYear(year: string) {
  const y = parseInt(year, 10)
  return /^\d{4}$/.test(year) && y >= 1920 && y <= new Date().getFullYear() - 16
}

export function AccountScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<RouteProp<OnboardingStackParamList, 'Account'>>()
  const { language, objective, setBirthYear, setCountry, markDone } = useOnboarding()
  const theme = useTheme()
  const copy = COPY[language]

  const initialMode: AuthMode =
    (route.params?.mode as AuthMode | undefined) === 'login' ? 'login' : 'signup'
  const isDirectLogin = route.params?.mode === 'login'

  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [birthYearInput, setBirthYearInput] = useState('')
  const [countryInput, setCountryInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function validateForm() {
    if (!validateEmail(email)) return copy.errorEmailInvalid
    if (password.length < 8) return copy.errorPasswordLength
    if (mode === 'signup' && password !== passwordConfirm) return copy.errorPasswordMatch
    if (mode === 'signup' && birthYearInput && !validateBirthYear(birthYearInput))
      return copy.errorBirthYearInvalid
    return null
  }

  async function handleSubmit() {
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setLoading(true)
    try {
      if (mode === 'signup') {
        if (birthYearInput && validateBirthYear(birthYearInput)) {
          setBirthYear(parseInt(birthYearInput, 10))
        }
        if (countryInput.trim()) setCountry(countryInput.trim())
        const { error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              language,
              objective: objective ?? 'general',
              birth_year: birthYearInput ? parseInt(birthYearInput, 10) : null,
              country: countryInput.trim() || null,
            },
          },
        })
        if (authError) throw authError
        markDone()
      } else if (mode === 'login') {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (authError) throw authError
        markDone()
      }
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleAnonymous() {
    markDone()
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.canvas }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {isDirectLogin ? <BackHeader onBack={() => navigation.goBack()} /> : null}

        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: theme.spacing[6],
            paddingTop: isDirectLogin ? theme.spacing[2] : theme.spacing[5],
            paddingBottom: theme.spacing[6],
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!isDirectLogin ? (
            <View style={{ marginBottom: theme.spacing[8] }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginBottom: theme.spacing[2],
                }}
              >
                <Text variant="eyebrow" tone="secondary" style={{ textTransform: 'uppercase' }}>
                  anoqi
                </Text>
                <Text variant="eyebrow" tone="tertiary" style={{ textTransform: 'uppercase' }}>
                  {copy.step}
                </Text>
              </View>
              <ProgressBar progress={1} />
            </View>
          ) : null}

          <Text variant="h1" tone="primary" style={{ marginBottom: theme.spacing[3] }}>
            {copy.title}
          </Text>
          <Text variant="bodyLg" tone="secondary" style={{ marginBottom: theme.spacing[6] }}>
            {copy.subtitle}
          </Text>

          <View style={{ marginBottom: theme.spacing[6] }}>
            <SegmentedControl<AuthMode>
              value={mode}
              onChange={(v) => {
                setMode(v)
                setError(null)
              }}
              options={[
                { value: 'signup', label: copy.tabs.signup },
                { value: 'login',  label: copy.tabs.login },
                { value: 'anon',   label: copy.tabs.anon },
              ]}
            />
          </View>

          {mode === 'anon' ? (
            <View
              style={{
                backgroundColor: theme.colors.bg.surfaceMuted,
                borderRadius: theme.radii.lg,
                borderWidth: 1,
                borderColor: theme.colors.border.subtle,
                padding: theme.spacing[5],
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: theme.spacing[3],
                  gap: theme.spacing[3],
                }}
              >
                <Icon
                  name="ShieldCheck"
                  size={20}
                  color={theme.colors.accent.success}
                  strokeWidth={1.8}
                />
                <Text variant="h4" tone="primary">
                  {copy.anonTitle}
                </Text>
              </View>
              <Text variant="body" tone="secondary" style={{ marginBottom: theme.spacing[5] }}>
                {copy.anonBody}
              </Text>
              <Button
                label={copy.anonCta}
                size="md"
                fullWidth
                variant="primary"
                onPress={handleAnonymous}
              />
            </View>
          ) : (
            <View style={{ gap: theme.spacing[4] }}>
              <Input
                label={copy.email}
                placeholder={copy.emailPlaceholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                returnKeyType="next"
              />
              <Input
                label={copy.password}
                placeholder={copy.passwordPlaceholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete={mode === 'signup' ? 'new-password' : 'password'}
                returnKeyType={mode === 'signup' ? 'next' : 'done'}
                onSubmitEditing={mode === 'login' ? handleSubmit : undefined}
              />

              {mode === 'signup' ? (
                <>
                  <Input
                    label={copy.passwordConfirm}
                    value={passwordConfirm}
                    onChangeText={setPasswordConfirm}
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="new-password"
                    returnKeyType="next"
                  />
                  <Input
                    label={copy.birthYear}
                    placeholder={copy.birthYearPlaceholder}
                    value={birthYearInput}
                    onChangeText={setBirthYearInput}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                  <Input
                    label={copy.country}
                    placeholder={copy.countryPlaceholder}
                    value={countryInput}
                    onChangeText={setCountryInput}
                    autoCapitalize="words"
                  />
                </>
              ) : null}

              {error ? (
                <Text variant="caption" tone="danger" align="center">
                  {error}
                </Text>
              ) : null}

              <Button
                label={mode === 'signup' ? copy.signupCta : copy.loginCta}
                size="lg"
                fullWidth
                loading={loading}
                onPress={handleSubmit}
              />
            </View>
          )}

          <Text
            variant="caption"
            tone="tertiary"
            align="center"
            style={{ marginTop: theme.spacing[8] }}
          >
            {copy.privacy}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
