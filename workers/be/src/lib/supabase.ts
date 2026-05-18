/**
 * anoqi — service-role Supabase client factory
 *
 * Creates a SupabaseClient bound to the project's service-role key. Service
 * role bypasses RLS — required for chat / documents / summaries handlers
 * that read and write across user-scoped tables.
 *
 * NEVER expose the resulting client to untrusted code paths or log its
 * options. The service role can read and write any row in the database.
 *
 * Singleton: clients are cached at module scope. On Cloudflare Workers, the
 * isolate is reused across requests for ~minutes, so reusing the client lets
 * the underlying HTTP keep-alive pool warm. We invalidate only if the URL /
 * service-role key change (e.g. after `wrangler secret put`).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface SupabaseEnv {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

let cachedClient: SupabaseClient | null = null
let cachedKey:    string | null = null

export function getServiceClient(env: SupabaseEnv): SupabaseClient {
  const key = `${env.SUPABASE_URL}::${env.SUPABASE_SERVICE_ROLE_KEY}`
  if (cachedClient && cachedKey === key) return cachedClient
  cachedClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
  cachedKey = key
  return cachedClient
}
