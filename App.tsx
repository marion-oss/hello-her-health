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
import { View, StyleSheet, Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import * as Font from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'

import {
  DMSerifDisplay_400Regular,
  DMSerifDisplay_400Regular_Italic,
} from '@expo-google-fonts/dm-serif-display'

import { OnboardingProvider }  from './app/context/OnboardingContext'
import { OnboardingNavigator } from './app/screens/onboarding/OnboardingNavigator'
import { MainNavigator }       from './app/navigation/MainNavigator'
import { ThemeProvider, lightColors } from './app/theme'

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
            // DM Serif Display — editorial display family, paired with DM Sans
            // (same designer family). Two variants: regular + italic, used for
            // mavie-style emphasis on one word per heading.
            'DMSerifDisplay-Regular': DMSerifDisplay_400Regular,
            'DMSerifDisplay-Italic':  DMSerifDisplay_400Regular_Italic,
            // DM Sans — body. Variable fonts: one TTF covers all weights via
            // the fontWeight axis on iOS 14+ / Android 8+.
            'DMSans-Regular': require('./assets/fonts/DMSans.ttf'),
            'DMSans-Medium':  require('./assets/fonts/DMSans.ttf'),
            'DMSans-Bold':    require('./assets/fonts/DMSans.ttf'),
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

  // Locked to light mode — Anoqi's editorial aesthetic is light-only.
  const colors = lightColors

  if (!appReady) return null

  // ── Onboarding completion handler ─────────────────────────────────────────
  async function handleOnboardingComplete() {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true')
    setOnboardingDone(true)
  }

  // Mirror the Anoqi role tokens into React Navigation's theme so screens
  // mounted by the nav container pick up canvas + ink without extra plumbing.
  const navTheme = {
    ...DefaultTheme,
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
  // position: 'fixed' so its photograph fills the viewport edge to edge.
  // Native is untouched — phones already have the right aspect.
  return (
    <View
      style={[styles.root, { backgroundColor: colors.bg.canvas }]}
      onLayout={onLayoutRootView}
    >
      <View style={[styles.appShell, { backgroundColor: colors.bg.canvas }]}>
        <ThemeProvider mode="light">
          <NavigationContainer theme={navTheme}>
            <OnboardingProvider onComplete={handleOnboardingComplete}>
              {onboardingDone
                ? <MainNavigator />
                : <OnboardingNavigator />
              }
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
