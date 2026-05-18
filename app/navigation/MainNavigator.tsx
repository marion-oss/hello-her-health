/**
 * anoqi — MainNavigator
 *
 * Root navigator for authenticated / post-onboarding users.
 * Rendered by App.tsx once 'anoqi_onboarding_done' is set.
 *
 * Topology — tabs only. The Objective screen lives in the OnboardingNavigator
 * exclusively; if you want to change focus later, do it through a future
 * Settings flow rather than reopening the onboarding step.
 *
 *   MainTabs (the floating LiquidTabBar)
 *     ├─ Home      — dashboard            (eager — landing tab)
 *     ├─ Chat      — full-screen chat     (React.lazy)
 *     ├─ Documents — placeholder          (React.lazy)
 *     └─ Profile   — language toggle      (React.lazy)
 *
 * Navigation from screens:
 *   navigation.navigate('Chat')        — switches tab from Home
 *   navigation.navigate('Profile')     — switches tab
 *   navigation.navigate('Documents')   — switches tab
 *
 * All screens use headerShown: false and manage their own safe-area / header.
 *
 * Code splitting: Home stays in the main bundle so the landing tab paints
 * without an extra network round trip. Chat / Documents / Profile load on
 * first tab focus — bottom-tabs already lazy-mounts non-initial routes, so the
 * dynamic imports below only fire when the user taps the tab.
 */

import React, { lazy, Suspense } from 'react'
import { View } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'

import { HomeScreen }      from '../screens/home/HomeScreen'
import { LiquidTabBar }    from '../components'
import { useTheme }        from '../theme'

const LazyChatScreen = lazy(() =>
  import('../screens/chat/ChatScreen').then((m) => ({ default: m.ChatScreen })),
)
const LazyDocumentsScreen = lazy(() =>
  import('../screens/documents/DocumentsScreen').then((m) => ({ default: m.DocumentsScreen })),
)
const LazyProfileScreen = lazy(() =>
  import('../screens/profile/ProfileScreen').then((m) => ({ default: m.ProfileScreen })),
)

// Suspense fallback — a void-canvas-colored fill so the swap from main bundle
// to chunk is invisible. No spinner: the chunk is tiny once tree-shaken, and a
// spinner would flash briefly then yank to content.
function ScreenFallback() {
  const theme = useTheme()
  return <View style={{ flex: 1, backgroundColor: theme.colors.bg.canvas }} />
}

function ChatScreenLazy() {
  return (
    <Suspense fallback={<ScreenFallback />}>
      <LazyChatScreen />
    </Suspense>
  )
}

function DocumentsScreenLazy() {
  return (
    <Suspense fallback={<ScreenFallback />}>
      <LazyDocumentsScreen />
    </Suspense>
  )
}

function ProfileScreenLazy() {
  return (
    <Suspense fallback={<ScreenFallback />}>
      <LazyProfileScreen />
    </Suspense>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Param list
// ─────────────────────────────────────────────────────────────────────────────

export type MainTabsParamList = {
  Home:      undefined
  Chat:      undefined
  Documents: undefined
  Profile:   undefined
}

const Tabs = createBottomTabNavigator<MainTabsParamList>()

// ─────────────────────────────────────────────────────────────────────────────
// Tab navigator
// ─────────────────────────────────────────────────────────────────────────────

export function MainNavigator() {
  return (
    <Tabs.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <LiquidTabBar {...props} />}
    >
      <Tabs.Screen name="Home"      component={HomeScreen}          />
      <Tabs.Screen name="Chat"      component={ChatScreenLazy}      />
      <Tabs.Screen name="Documents" component={DocumentsScreenLazy} />
      <Tabs.Screen name="Profile"   component={ProfileScreenLazy}   />
    </Tabs.Navigator>
  )
}
