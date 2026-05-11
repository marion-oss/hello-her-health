/**
 * anoqi — OnboardingNavigator
 *
 * React Navigation stack for the 3-step onboarding flow.
 * Rendered at app root ONLY when the user has not yet completed onboarding.
 *
 * Screen order:
 *   Welcome → Objective → Consent → Account → (Home)
 *
 * HowItWorks was removed — anoqi's intro message in ChatScreen
 * covers the "how it works" explanation at the right moment.
 *
 * Skip logic (no re-showing onboarding screens once done):
 *   • Returning users who tap "I already have an account" on Welcome
 *     are sent directly to Account with mode='login', bypassing steps 2–4.
 *   • Once onboarding is marked complete (call markOnboardingDone() from
 *     AccountScreen or the anonymous path), the root navigator in App.tsx
 *     replaces this stack with MainNavigator — onboarding never shows again.
 *
 * Usage in App.tsx / root navigator:
 *
 *   import { OnboardingNavigator } from './screens/onboarding/OnboardingNavigator'
 *   import { OnboardingProvider }  from '../context/OnboardingContext'
 *
 *   function Root() {
 *     const [onboardingDone, setOnboardingDone] = useState(false)
 *
 *     useEffect(() => {
 *       AsyncStorage.getItem('anoqi_onboarding_done').then(v => {
 *         if (v === 'true') setOnboardingDone(true)
 *       })
 *     }, [])
 *
 *     return (
 *       <OnboardingProvider>
 *         {onboardingDone
 *           ? <MainNavigator />
 *           : <OnboardingNavigator onComplete={() => setOnboardingDone(true)} />}
 *       </OnboardingProvider>
 *     )
 *   }
 *
 * Note: OnboardingProvider must wrap this navigator so all screens can
 * access shared language + objective state.
 */

import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import { WelcomeScreen }   from './WelcomeScreen'
import { ObjectiveScreen } from './ObjectiveScreen'
import { ConsentScreen }   from './ConsentScreen'
import { AccountScreen }   from './AccountScreen'

export type OnboardingStackParamList = {
  Welcome:   undefined
  Objective: undefined
  Consent:   undefined
  /**
   * mode:
   *   'choose'  — three-way pick (default, from Consent screen)
   *   'login'   — direct login, opened from WelcomeScreen (skips steps 2–3)
   *   'signup'  — jump straight to sign-up form
   */
  Account: { mode?: 'choose' | 'login' | 'signup' } | undefined
}

const Stack = createNativeStackNavigator<OnboardingStackParamList>()

type Props = {
  /** Called when the user completes or skips onboarding so the root
   *  navigator can swap in MainNavigator and persist the flag. */
  onComplete?: () => void
}

export function OnboardingNavigator(_props: Props) {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#FFF8F5' },
      }}
    >
      <Stack.Screen name="Welcome"   component={WelcomeScreen}   />
      <Stack.Screen name="Objective" component={ObjectiveScreen} />
      <Stack.Screen name="Consent"   component={ConsentScreen}   />
      <Stack.Screen
        name="Account"
        component={AccountScreen}
        /**
         * When navigating directly from Welcome ("I already have an account"),
         * no back-swipe should take you through the onboarding steps you skipped.
         * gestureEnabled: false is enforced by the screen itself via initialMode.
         */
      />
    </Stack.Navigator>
  )
}
