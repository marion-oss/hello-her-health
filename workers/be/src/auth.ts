/**
 * anoqi — request authentication
 *
 * Mirrors the auth pattern used in api/functions/*: parse the Authorization
 * bearer token from the request and validate it via Supabase's auth API.
 *
 * Returns the user's UUID if the token is valid, null otherwise. Callers
 * decide whether to reject (POST /documents, POST /summaries — auth required)
 * or fall through to anonymous-session handling (POST /chat).
 *
 * Why call supabase.auth.getUser instead of verifying the JWT locally:
 *   The current Supabase Edge Function code does the same thing. Local
 *   JWKS verification is faster (no roundtrip) but adds a dependency and
 *   a key-rotation surface. Mirror the existing pattern; revisit only if
 *   latency becomes a measured problem.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Extract and validate a bearer token from a request.
 * Returns the user's UUID, or null if missing/invalid.
 */
export async function getUserIdFromRequest(
  request: Request,
  supabase: SupabaseClient,
): Promise<string | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader) return null

  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null

  try {
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) return null
    return data.user.id
  } catch (e) {
    console.error('[auth] getUser threw:', e)
    return null
  }
}
