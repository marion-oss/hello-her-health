/**
 * anoqi — Supabase client singleton
 *
 * Reads EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
 * from the environment (.env file at repo root).
 *
 * EXPO_PUBLIC_* variables are automatically inlined by the Expo bundler
 * (SDK 49+). They are safe to ship — the anon key is designed to be public.
 * Never put your service_role key here.
 *
 * .env file (git-ignored):
 *   EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *
 * Required packages (run once):
 *   npx expo install @supabase/supabase-js react-native-url-polyfill
 *   npx expo install @react-native-async-storage/async-storage
 */

import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const envUrl = process.env.EXPO_PUBLIC_SUPABASE_URL  ?? ''
const envKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

if (__DEV__ && (!envUrl || !envKey)) {
  console.warn(
    '[anoqi] Supabase env vars missing — using placeholder client.\n' +
    'Auth calls will fail. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env file.'
  )
}

// Fall back to a syntactically-valid placeholder URL so createClient doesn't
// throw at module load when env vars are missing (e.g. local design preview).
// Any actual auth call will fail with a network error, which is fine — the
// UI is what we're previewing here.
const supabaseUrl = envUrl || 'https://placeholder.supabase.co'
const supabaseKey = envKey || 'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage:           AsyncStorage,
    autoRefreshToken:  true,
    persistSession:    true,
    detectSessionInUrl: false,   // not a web app
  },
})
