/**
 * anoqi — AccountScreen
 *
 * Step 5 of onboarding — final, optional step.
 *
 * Accepts an optional `mode` route param:
 *   'login'  — opened directly from WelcomeScreen "I already have an account"
 *              (skips steps 2–4 entirely for returning users)
 *   'signup' — jump straight to sign-up form
 *   'choose' — default: show the three-way choice (default)
 *
 * Three paths:
 *   A) Create account (email + password) → full experience, history saved
 *   B) Login → skip all onboarding, go straight to Home
 *   C) Continue anonymously → session-based, claimable later via /auth/claim
 *
 * Auth via Supabase — signUp / signInWithPassword (stubbed, ready to wire).
 *
 * Brand palette: Fuchsia #FF0472 | Coral #FF6B3D | Navy #000E28
 *                Cream #FFF3EE | Off White #FFF8F5 | Pink #FFB0CC
 */

import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import { useOnboarding } from '../../context/OnboardingContext'
import type { OnboardingStackParamList } from './OnboardingNavigator'

// import { supabase } from '../../lib/supabase'

type AuthMode = 'choose' | 'signup' | 'login'

const COPY = {
  fr: {
    title: 'Ton espace sécurisé',
    subtitle: 'Crée un compte pour retrouver tes résumés depuis n\'importe quel appareil.',
    createAccount: 'Créer un compte',
    login: 'J\'ai déjà un compte',
    continueAnon: 'Continuer sans compte',
    anonNote: 'Tes données restent sur cet appareil. Tu peux créer un compte plus tard.',
    emailPlaceholder: 'Ton adresse email',
    passwordPlaceholder: 'Mot de passe (8 caractères minimum)',
    passwordConfirmPlaceholder: 'Confirme ton mot de passe',
    signupCta: 'Créer mon compte',
    loginCta: 'Me connecter',
    loginPrompt: 'Déjà un compte ? ',
    loginLink: 'Se connecter',
    signupPrompt: 'Pas encore de compte ? ',
    signupLink: 'S\'inscrire',
    errorPasswordMatch: 'Les mots de passe ne correspondent pas',
    errorPasswordLength: 'Le mot de passe doit contenir au moins 8 caractères',
    errorEmailInvalid: 'Adresse email invalide',
    privacyNote: 'Tes données sont hébergées en Europe (UE) et ne sont jamais vendues.',
  },
  en: {
    title: 'Your secure space',
    subtitle: 'Create an account to access your summaries from any device.',
    createAccount: 'Create an account',
    login: 'I already have an account',
    continueAnon: 'Continue without an account',
    anonNote: 'Your data stays on this device. You can create an account later.',
    emailPlaceholder: 'Your email address',
    passwordPlaceholder: 'Password (minimum 8 characters)',
    passwordConfirmPlaceholder: 'Confirm your password',
    signupCta: 'Create my account',
    loginCta: 'Log in',
    loginPrompt: 'Already have an account? ',
    loginLink: 'Log in',
    signupPrompt: 'No account yet? ',
    signupLink: 'Sign up',
    errorPasswordMatch: 'Passwords do not match',
    errorPasswordLength: 'Password must be at least 8 characters',
    errorEmailInvalid: 'Invalid email address',
    privacyNote: 'Your data is hosted in Europe (EU) and never sold.',
  },
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export function AccountScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<RouteProp<OnboardingStackParamList, 'Account'>>()
  const { language, objective } = useOnboarding()
  const copy = COPY[language]

  // Allow WelcomeScreen to open this directly in login mode
  const initialMode: AuthMode = (route.params?.mode as AuthMode) ?? 'choose'
  const [mode, setMode] = useState<AuthMode>(initialMode)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Whether this screen was reached by skipping onboarding (direct login)
  const isDirectLogin = initialMode === 'login'
  // Progress step: only show dots when inside the onboarding flow
  const showProgress = !isDirectLogin

  function handleContinueAnonymously() {
    // In production: generate UUID, store in AsyncStorage
    // const sessionId = uuid(); await AsyncStorage.setItem('anoqi_session_id', sessionId)
    navigation.navigate('Home')
  }

  function validateForm(): string | null {
    if (!validateEmail(email)) return copy.errorEmailInvalid
    if (password.length < 8) return copy.errorPasswordLength
    if (mode === 'signup' && password !== passwordConfirm) return copy.errorPasswordMatch
    return null
  }

  async function handleSubmit() {
    const validationError = validateForm()
    if (validationError) { setError(validationError); return }
    setError(null)
    setLoading(true)
    try {
      if (mode === 'signup') {
        // const { error: authError } = await supabase.auth.signUp({
        //   email: email.trim(), password,
        //   options: { data: { language, objective: objective ?? 'general' } }
        // })
        // if (authError) throw authError
        navigation.navigate('Home')
      } else {
        // const { error: authError } = await supabase.auth.signInWithPassword({
        //   email: email.trim(), password,
        // })
        // if (authError) throw authError
        navigation.navigate('Home')
      }
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Choose mode ────────────────────────────────────────────────
  if (mode === 'choose') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>

          {showProgress && (
            <View style={styles.progressRow}>
              <View style={[styles.dot, styles.dotDone]} />
              <View style={[styles.dot, styles.dotDone]} />
              <View style={[styles.dot, styles.dotDone]} />
              <View style={[styles.dot, styles.dotDone]} />
              <View style={[styles.dot, styles.dotActive]} />
            </View>
          )}

          <View style={styles.header}>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.subtitle}>{copy.subtitle}</Text>
          </View>

          <View style={styles.chooseActions}>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => setMode('signup')}
              accessibilityRole="button"
            >
              <Text style={styles.ctaText}>{copy.createAccount}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setMode('login')}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryText}>{copy.login}</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.anonButton}
              onPress={handleContinueAnonymously}
              accessibilityRole="button"
            >
              <Text style={styles.anonText}>{copy.continueAnon}</Text>
            </TouchableOpacity>
            <Text style={styles.anonNote}>{copy.anonNote}</Text>
          </View>

          <Text style={styles.privacyNote}>{copy.privacyNote}</Text>
        </View>
      </SafeAreaView>
    )
  }

  // ── Sign up / Login form ───────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.formScrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>

          {showProgress && (
            <View style={styles.progressRow}>
              <View style={[styles.dot, styles.dotDone]} />
              <View style={[styles.dot, styles.dotDone]} />
              <View style={[styles.dot, styles.dotDone]} />
              <View style={[styles.dot, styles.dotDone]} />
              <View style={[styles.dot, styles.dotActive]} />
            </View>
          )}

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              // If opened directly from Welcome (login mode), go back there
              if (isDirectLogin && mode === initialMode) {
                navigation.goBack()
              } else {
                setMode('choose')
                setError(null)
              }
            }}
            accessibilityRole="button"
          >
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>
              {mode === 'signup' ? copy.createAccount : copy.login}
            </Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder={copy.emailPlaceholder}
              placeholderTextColor="#BBBBBB"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              returnKeyType="next"
            />

            <TextInput
              style={styles.input}
              placeholder={copy.passwordPlaceholder}
              placeholderTextColor="#BBBBBB"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete={mode === 'signup' ? 'new-password' : 'password'}
              returnKeyType={mode === 'signup' ? 'next' : 'done'}
              onSubmitEditing={mode === 'login' ? handleSubmit : undefined}
            />

            {mode === 'signup' && (
              <TextInput
                style={styles.input}
                placeholder={copy.passwordConfirmPlaceholder}
                placeholderTextColor="#BBBBBB"
                value={passwordConfirm}
                onChangeText={setPasswordConfirm}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            )}

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.ctaButton, loading && styles.ctaButtonLoading]}
              onPress={handleSubmit}
              disabled={loading}
              accessibilityRole="button"
            >
              {loading
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.ctaText}>
                    {mode === 'signup' ? copy.signupCta : copy.loginCta}
                  </Text>
              }
            </TouchableOpacity>

            <View style={styles.switchRow}>
              <Text style={styles.switchPrompt}>
                {mode === 'signup' ? copy.loginPrompt : copy.signupPrompt}
              </Text>
              <TouchableOpacity
                onPress={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(null) }}
              >
                <Text style={styles.switchLink}>
                  {mode === 'signup' ? copy.loginLink : copy.signupLink}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.privacyNote}>{copy.privacyNote}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFF8F5',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
  },
  formScrollContent: {
    flexGrow: 1,
  },

  // Progress
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E8DDD9',
  },
  dotDone: {
    backgroundColor: '#FF6B3D',
  },
  dotActive: {
    backgroundColor: '#FF0472',
    width: 24,
  },

  // Header
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontFamily: 'BricolageGrotesque-ExtraBold',
    color: '#000E28',
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'DMSans-Regular',
    color: '#777777',
    lineHeight: 22,
  },

  // Choose mode
  chooseActions: {
    flex: 1,
    gap: 12,
  },
  ctaButton: {
    backgroundColor: '#FF0472',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaButtonLoading: {
    opacity: 0.7,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'BricolageGrotesque-ExtraBold',
    letterSpacing: -0.3,
  },
  secondaryButton: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FF0472',
    backgroundColor: 'transparent',
  },
  secondaryText: {
    color: '#FF0472',
    fontSize: 17,
    fontFamily: 'DMSans-Medium',
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#EDE5E0',
  },
  anonButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  anonText: {
    fontSize: 15,
    fontFamily: 'DMSans-Regular',
    color: '#888888',
  },
  anonNote: {
    fontSize: 12,
    fontFamily: 'DMSans-Regular',
    color: '#BBBBBB',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: -4,
  },
  privacyNote: {
    fontSize: 12,
    fontFamily: 'DMSans-Regular',
    color: '#AAAAAA',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },

  // Back
  backButton: {
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 20,
    color: '#FF0472',
    paddingVertical: 4,
  },

  // Form
  form: {
    gap: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EDE5E0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 16 : 12,
    fontSize: 15,
    fontFamily: 'DMSans-Regular',
    color: '#000E28',
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'DMSans-Regular',
    color: '#CC3A3A',
    textAlign: 'center',
    marginTop: -4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  switchPrompt: {
    fontSize: 14,
    fontFamily: 'DMSans-Regular',
    color: '#888888',
  },
  switchLink: {
    fontSize: 14,
    fontFamily: 'DMSans-Medium',
    color: '#FF0472',
    fontWeight: '600',
  },
})
