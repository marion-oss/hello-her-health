/**
 * anoqi — MainNavigator
 *
 * Root navigator for authenticated / post-onboarding users.
 * Rendered by App.tsx once 'anoqi_onboarding_done' is set.
 *
 * Screen hierarchy (stack):
 *   Home          — dashboard, always at the bottom of the stack
 *   Chat          — full-screen conversation, pushed from Home hero CTA
 *   ─ ─ ─ ─ ─ ─ ─ future screens ─ ─ ─ ─ ─ ─ ─
 *   Documents     — document list + upload (V2)
 *   Summary       — single doctor-ready summary view (V2)
 *   Settings      — profile, language, data management (V2)
 *
 * Navigation from screens:
 *   navigation.navigate('Chat')              — from HomeScreen hero CTA
 *   navigation.navigate('Summary', { id })   — from ChatScreen banner (V2)
 *   navigation.navigate('Documents')         — from HomeScreen documents row (V2)
 *   navigation.navigate('Settings')          — from HomeScreen header icon (V2)
 *
 * All screens use headerShown: false and manage their own safe-area / header.
 */

import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import { HomeScreen } from '../screens/home/HomeScreen'
import { ChatScreen } from '../screens/chat/ChatScreen'

// ─────────────────────────────────────────────────────────────────────────────
// Param list — extend here when new screens are added
// ─────────────────────────────────────────────────────────────────────────────

export type MainStackParamList = {
  Home:      undefined
  Chat:      undefined
  // V2 screens — uncomment and implement when ready:
  // Documents: undefined
  // Summary:   { id: string }
  // Settings:  undefined
}

const Stack = createNativeStackNavigator<MainStackParamList>()

// ─────────────────────────────────────────────────────────────────────────────
// Navigator
// ─────────────────────────────────────────────────────────────────────────────

export function MainNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown:  false,
        animation:    'slide_from_right',
        contentStyle: { backgroundColor: '#FFF8F5' },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  )
}
