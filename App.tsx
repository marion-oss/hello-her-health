/**
 * anoqi — App.tsx
 *
 * Root entry point. Wires together:
 *   • expo-font   — loads BricolageGrotesque-ExtraBold + DMSans variants
 *   • expo-splash-screen — holds splash until fonts are ready
 *   • NavigationContainer — single navigation tree
 *   • OnboardingProvider  — shared language + objective state
 *   • Gate logic — shows OnboardingNavigator until 'anoqi_onboarding_done'
 *     is set in AsyncStorage, then swaps to MainNavigator permanently
 *
 * Onboarding completion:
 *   Any screen can call markOnboardingDone() (from this file, or call
 *   AsyncStorage.setItem('anoqi_onboarding_done', 'true') directly) and
 *   then invoke the onComplete prop on OnboardingNavigator — the gate
 *   here re-reads the flag and swaps navigators.
 *
 * Font assets in assets/fonts/ (variable fonts — one file per family):
 *   BricolageGrotesque.ttf   — covers all weights incl. 800 (ExtraBold)
 *   DMSans.ttf               — covers 400 (Regular), 500 (Medium), 700 (Bold)
 *
 * Install required packages (if not already in package.json):
 *   npx expo install expo-font expo-splash-screen @react-navigation/native
 *   npx expo install @react-navigation/native-stack
 *   npx expo install react-native-screens react-native-safe-area-context
 */

import React, { useState, useEffect, useCallback } from 'react'
import { View, StyleSheet } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { NavigationContainer } from '@react-navigation/native'
import * as Font from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'

import { OnboardingProvider }  from './app/context/OnboardingContext'
import { OnboardingNavigator } from './app/screens/onboarding/OnboardingNavigator'
import { MainNavigator }       from './app/navigation/MainNavigator'

// Keep the splash screen visible while fonts load
SplashScreen.preventAutoHideAsync()

const ONBOARDING_KEY = 'anoqi_onboarding_done'

// ─────────────────────────────────────────────────────────────────────────────
// Root component
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [appReady,       setAppReady]       = useState(false)
  const [onboardingDone, setOnboardingDone] = useState(false)

  // ── Bootstrap: load fonts + check onboarding flag in parallel ──────────────
  useEffect(() => {
    async function bootstrap() {
      try {
        const [, flag] = await Promise.all([
          Font.loadAsync({
            // Variable fonts — one file per family covers all weights.
            // We register under the names used in StyleSheets so no
            // screen-level changes are needed. fontWeight in each
            // StyleSheet selects the correct axis on platforms that
            // support variable fonts (iOS 14+, Android 8+).
            'BricolageGrotesque-ExtraBold': require('./assets/fonts/BricolageGrotesque.ttf'),
            'DMSans-Regular':               require('./assets/fonts/DMSans.ttf'),
            'DMSans-Medium':                require('./assets/fonts/DMSans.ttf'),
            'DMSans-Bold':                  require('./assets/fonts/DMSans.ttf'),
          }),
          AsyncStorage.getItem(ONBOARDING_KEY),
        ])

        if (flag === 'true') setOnboardingDone(true)
      } catch (e) {
        // Font load failures are non-fatal — the OS will fall back to system fonts
        console.warn('App bootstrap warning:', e)
      } finally {
        setAppReady(true)
      }
    }

    bootstrap()
  }, [])

  // ── Hide splash once layout is ready ──────────────────────────────────────
  const onLayoutRootView = useCallback(async () => {
    if (appReady) {
      await SplashScreen.hideAsync()
    }
  }, [appReady])

  if (!appReady) return null

  // ── Onboarding completion handler ─────────────────────────────────────────
  async function handleOnboardingComplete() {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true')
    setOnboardingDone(true)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root} onLayout={onLayoutRootView}>
      <NavigationContainer>
        <OnboardingProvider onComplete={handleOnboardingComplete}>
          {onboardingDone
            ? <MainNavigator />
            : <OnboardingNavigator />
          }
        </OnboardingProvider>
      </NavigationContainer>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFF8F5',
  },
})
