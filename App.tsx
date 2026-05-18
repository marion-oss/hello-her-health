/**
 * anoqi — App.tsx
 *
 * Root entry point. Wires together:
 *   • expo-font   — loads Cormorant Garamond (display) + Inter (body)
 *   • expo-splash-screen — holds splash until fonts are ready
 *   • NavigationContainer — single navigation tree
 *   • OnboardingProvider  — shared language + objective state
 *   • Gate logic — shows OnboardingNavigator until 'anoqi_onboarding_done'
 *     is set in AsyncStorage, then swaps to MainNavigator permanently
 *
 * Anoqi is dark-only. The app locks to its Sanctuary palette regardless of
 * OS-level light/dark preference — see app.json `userInterfaceStyle: "dark"`.
 *
 * Onboarding completion:
 *   Any screen can call markOnboardingDone() (from this file, or call
 *   AsyncStorage.setItem('anoqi_onboarding_done', 'true') directly) and
 *   then invoke the onComplete prop on OnboardingNavigator — the gate
 *   here re-reads the flag and swaps navigators.
 */

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { View, StyleSheet, Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import * as Font from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'

import {
  CormorantGaramond_400Regular,
  CormorantGaramond_400Regular_Italic,
  CormorantGaramond_500Medium,
  CormorantGaramond_500Medium_Italic,
} from '@expo-google-fonts/cormorant-garamond'

import {
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter'

import { OnboardingProvider }  from './app/context/OnboardingContext'
import { MainNavigator }       from './app/navigation/MainNavigator'
import { ThemeProvider, darkColors } from './app/theme'
import { BreathingForm } from './app/components'

// OnboardingNavigator is only rendered for first-time users; returning users
// (vast majority) skip the entire chunk. Metro emits a separate JS file for
// this dynamic import, gated behind the AsyncStorage onboarding flag.
const LazyOnboardingNavigator = lazy(() =>
  import('./app/screens/onboarding/OnboardingNavigator').then((m) => ({
    default: m.OnboardingNavigator,
  })),
)

// Web-only dev escape hatch: append ?test=breath to the URL to render the
// BreathingForm in isolation on the void canvas (no glass card, no Liquid
// Ember, no navigation). Useful for checking the form's composition.
const isBreathTest =
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  window.location.search.includes('test=breath')

// Keep the splash screen visible while fonts load
SplashScreen.preventAutoHideAsync()

const ONBOARDING_KEY = 'anoqi_onboarding_done'

export default function App() {
  const [appReady,       setAppReady]       = useState(false)
  const [onboardingDone, setOnboardingDone] = useState(false)

  useEffect(() => {
    // Fonts load in the background — we render with system fallbacks first so
    // first paint isn't blocked on ~3 MB of woff downloads. Brief FOUT on the
    // very first visit; cached forever after. Display: Cormorant Garamond,
    // Body: Inter. Generous line-height is enforced in typography.ts.
    Font.loadAsync({
      'CormorantGaramond-Regular':      CormorantGaramond_400Regular,
      'CormorantGaramond-Italic':       CormorantGaramond_400Regular_Italic,
      'CormorantGaramond-Medium':       CormorantGaramond_500Medium,
      'CormorantGaramond-MediumItalic': CormorantGaramond_500Medium_Italic,
      'Inter-Light':    Inter_300Light,
      'Inter-Regular':  Inter_400Regular,
      'Inter-Medium':   Inter_500Medium,
      'Inter-SemiBold': Inter_600SemiBold,
    }).catch((e) => {
      // Non-fatal — system fonts cover it.
      console.warn('Font load failed:', e)
    })

    // The only thing we actually need before mounting a navigator is the
    // onboarding flag — it decides which navigator goes in.
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((flag) => {
        if (flag === 'true') setOnboardingDone(true)
      })
      .catch((e) => console.warn('App bootstrap warning:', e))
      .finally(() => setAppReady(true))
  }, [])

  const onLayoutRootView = useCallback(async () => {
    if (appReady) {
      await SplashScreen.hideAsync()
    }
  }, [appReady])

  // Locked to dark mode — Anoqi's Sanctuary palette is dark-first.
  const colors = darkColors

  if (!appReady) return null

  async function handleOnboardingComplete() {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true')
    setOnboardingDone(true)
  }

  // Mirror role tokens into React Navigation's theme so navigator-mounted
  // screens pick up Void + Warm White without per-screen plumbing.
  const navTheme = {
    ...DefaultTheme,
    dark: true,
    colors: {
      ...DefaultTheme.colors,
      background: colors.bg.canvas,
      card:       colors.bg.surface,
      text:       colors.text.primary,
      border:     colors.border.subtle,
      primary:    colors.accent.primary,
      notification: colors.accent.celebration,
    },
  }

  // On web, constrain content screens to 60% of the viewport width and
  // center them. The Welcome screen escapes the column on its own via
  // position: 'fixed' so its iridescent background fills the viewport
  // edge to edge. Native is untouched.
  // ?test=breath — isolated BreathingForm preview, no chrome.
  if (isBreathTest) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#0D0D12',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onLayout={onLayoutRootView}
      >
        <BreathingForm size={900} />
      </View>
    )
  }

  return (
    <View
      style={[styles.root, { backgroundColor: colors.bg.canvas }]}
      onLayout={onLayoutRootView}
    >
      {/* appShell is transparent — the root View already provides the void
          canvas. A solid background here creates a visible "column"
          boundary against the position:fixed BreathingForm rendering in
          the void on each side. */}
      <View style={styles.appShell}>
        <ThemeProvider mode="dark">
          <NavigationContainer theme={navTheme}>
            <OnboardingProvider onComplete={handleOnboardingComplete}>
              {onboardingDone ? (
                <MainNavigator />
              ) : (
                <Suspense
                  fallback={<View style={{ flex: 1, backgroundColor: colors.bg.canvas }} />}
                >
                  <LazyOnboardingNavigator />
                </Suspense>
              )}
            </OnboardingProvider>
          </NavigationContainer>
        </ThemeProvider>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    ...Platform.select({
      web: { alignItems: 'center' as const },
      default: {},
    }),
  },
  appShell: {
    flex: 1,
    ...Platform.select({
      web: {
        width: '60%' as const,
        maxWidth: 1200,
        minWidth: 360,
      },
      default: { width: '100%' as const },
    }),
  },
})
