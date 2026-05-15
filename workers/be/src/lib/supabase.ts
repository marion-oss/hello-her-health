/**
 * anoqi — service-role Supabase client factory
 *
 * Creates a SupabaseClient bound to the project's service-role key. Service
 * role bypasses RLS — required for chat / documents / summaries handlers
 * that read and write across user-scoped tables.
 *
 * NEVER expose the resulting client to untrusted code paths or log its
 * options. The service role can read and write any row in the database.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface SupabaseEnv {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

export function getServiceClient(env: SupabaseEnv): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
}
