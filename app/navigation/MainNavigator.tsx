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
 *     ├─ Home      — dashboard
 *     ├─ Chat      — full-screen conversation
 *     ├─ Documents — placeholder
 *     └─ Profile   — language toggle
 *
 * Navigation from screens:
 *   navigation.navigate('Chat')        — switches tab from Home
 *   navigation.navigate('Profile')     — switches tab
 *   navigation.navigate('Documents')   — switches tab
 *
 * All screens use headerShown: false and manage their own safe-area / header.
 */

import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'

import { HomeScreen }      from '../screens/home/HomeScreen'
import { ChatScreen }      from '../screens/chat/ChatScreen'
import { DocumentsScreen } from '../screens/documents/DocumentsScreen'
import { ProfileScreen }   from '../screens/profile/ProfileScreen'
import { LiquidTabBar }    from '../components'

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
      <Tabs.Screen name="Home"      component={HomeScreen}      />
      <Tabs.Screen name="Chat"      component={ChatScreen}      />
      <Tabs.Screen name="Documents" component={DocumentsScreen} />
      <Tabs.Screen name="Profile"   component={ProfileScreen}   />
    </Tabs.Navigator>
  )
}
