/**
 * anoqi — MainNavigator
 *
 * Root navigator for authenticated / post-onboarding users.
 * Rendered by App.tsx once 'anoqi_onboarding_done' is set.
 *
 * Topology:
 *   RootStack
 *     ├─ MainTabs (the floating LiquidTabBar)
 *     │    ├─ Home    — dashboard
 *     │    ├─ Chat    — full-screen conversation
 *     │    └─ Profile — language toggle
 *     └─ Objective    — focus picker, slides in from the right on demand
 *
 * Navigation from screens:
 *   navigation.navigate('Chat')                  — switches tab from Home
 *   navigation.navigate('Objective', { mode: 'change' })  — from Home focus pill
 *   navigation.navigate('Summary', { id })       — V2
 *   navigation.navigate('Documents')             — V2
 *
 * All screens use headerShown: false and manage their own safe-area / header.
 */

import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'

import { useTheme } from '../theme'
import { HomeScreen }       from '../screens/home/HomeScreen'
import { ChatScreen }       from '../screens/chat/ChatScreen'
import { DocumentsScreen }  from '../screens/documents/DocumentsScreen'
import { ProfileScreen }    from '../screens/profile/ProfileScreen'
import { ObjectiveScreen }  from '../screens/onboarding/ObjectiveScreen'
import { LiquidTabBar }     from '../components'

// ─────────────────────────────────────────────────────────────────────────────
// Param lists
// ─────────────────────────────────────────────────────────────────────────────

export type MainTabsParamList = {
  Home:      undefined
  Chat:      undefined
  Documents: undefined
  Profile:   undefined
}

export type MainStackParamList = {
  Main:      undefined
  Objective: { mode?: 'change' } | undefined
  // V2 screens — uncomment and implement when ready:
  // Documents: undefined
  // Summary:   { id: string }
}

const Tabs  = createBottomTabNavigator<MainTabsParamList>()
const Stack = createNativeStackNavigator<MainStackParamList>()

// ─────────────────────────────────────────────────────────────────────────────
// Tab navigator — wrapped by the stack so modal-style routes (Objective) can
// slide in on top of the floating tab bar.
// ─────────────────────────────────────────────────────────────────────────────

function MainTabs() {
  return (
    <Tabs.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        // sceneStyle.backgroundColor is undefined-safe; rely on each screen.
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

// ─────────────────────────────────────────────────────────────────────────────
// Root stack
// ─────────────────────────────────────────────────────────────────────────────

export function MainNavigator() {
  const theme = useTheme()
  return (
    <Stack.Navigator
      initialRouteName="Main"
      screenOptions={{
        headerShown:  false,
        animation:    'slide_from_right',
        contentStyle: { backgroundColor: theme.colors.bg.canvas },
      }}
    >
      <Stack.Screen name="Main"      component={MainTabs}       />
      <Stack.Screen name="Objective" component={ObjectiveScreen} />
    </Stack.Navigator>
  )
}
