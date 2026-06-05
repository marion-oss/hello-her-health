/**
 * anoqi — Vertex AI service-account OAuth (Workers-native, no Node crypto).
 *
 * Mints a Google OAuth 2.0 access token from the service-account JSON stored
 * in the VERTEX_SA_JSON secret. Signs the JWT assertion using the Web Crypto
 * API (RSASSA-PKCS1-v1_5 over SHA-256) — works inside Cloudflare Workers
 * because Workers has crypto.subtle but no Node 'crypto' module.
 *
 * Tokens are cached per Worker isolate for their natural ~1h lifetime, with
 * a 60s safety margin. Each isolate keeps its own cache; we deliberately
 * don't share via KV because the per-request token-mint cost (~80ms) is
 * cheaper than a KV round-trip, and tokens are user-scoped to this SA.
 *
 * Why this exists (vs an API key): Vertex AI's prediction endpoint
 * (aiplatform.googleapis.com) only accepts OAuth2 bearer tokens. AI Studio's
 * generativelanguage.googleapis.com accepts API keys, but its quotas are
 * usage-tiered and start near free-tier limits even on a billing-enabled
 * project — which is why /chat was 429-ing on common topics (PMOS, energy)
 * before this migration.
 *
 * Production-grade alternative (post-pilot): Workload Identity Federation,
 * which would let the Worker auth to GCP without a long-lived SA key. The
 * org policy iam.disableServiceAccountKeyCreation is currently overridden
 * at the project level (reverberant-kit-491312-e8) to allow this; revisit
 * when scale or security review demands.
 */

interface ServiceAccountJSON {
  client_email:    string
  private_key:     string
  private_key_id?: string
  token_uri:       string  // typically https://oauth2.googleapis.com/token
}

interface CachedToken {
  accessToken: string
  expiresAt:   number  // ms epoch
}

const GCP_SCOPE = 'https://www.googleapis.com/auth/cloud-platform'
const SAFETY_MARGIN_MS = 60_000

// Per-isolate cache. Workers isolate lifetime varies; expect frequent
// re-mints on cold start, but warm isolates reuse for ~1h.
let cachedToken: CachedToken | null = null
let cachedKey:   { kid: string | undefined; key: CryptoKey } | null = null

/**
 * Returns a valid Google access token for the cloud-platform scope.
 * Throws if the SA JSON is malformed or the token exchange fails.
 */
export async function getVertexAccessToken(saJson: string): Promise<string> {
  const now = Date.now()
  if (cachedToken && cachedToken.expiresAt > now + SAFETY_MARGIN_MS) {
    return cachedToken.accessToken
  }

  const sa = JSON.parse(saJson) as ServiceAccountJSON

  // ── Build JWT ────────────────────────────────────────────────────────
  const nowSec = Math.floor(now / 1000)
  const header = { alg: 'RS256', typ: 'JWT', kid: sa.private_key_id }
  const claims = {
    iss:   sa.client_email,
    scope: GCP_SCOPE,
    aud:   sa.token_uri,
    iat:   nowSec,
    exp:   nowSec + 3600,
  }

  const headerB64 = b64url(encode(JSON.stringify(header)))
  const claimsB64 = b64url(encode(JSON.stringify(claims)))
  const signingInput = `${headerB64}.${claimsB64}`

  // Cache the imported CryptoKey across mints — importKey is slow.
  if (!cachedKey || cachedKey.kid !== sa.private_key_id) {
    cachedKey = {
      kid: sa.private_key_id,
      key: await importPkcs8(sa.private_key),
    }
  }

  const sigBuf = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cachedKey.key,
    encode(signingInput),
  )
  const sigB64 = b64url(new Uint8Array(sigBuf))
  const jwt = `${signingInput}.${sigB64}`

  // ── Exchange JWT for access token ────────────────────────────────────
  const resp = await fetch(sa.token_uri, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:
      'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer' +
      `&assertion=${encodeURIComponent(jwt)}`,
  })

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => '')
    throw new Error(`[vertexAuth] token exchange failed ${resp.status}: ${errBody.slice(0, 240)}`)
  }

  const json = await resp.json<{ access_token: string; expires_in: number }>()
  cachedToken = {
    accessToken: json.access_token,
    expiresAt:   now + (json.expires_in * 1000),
  }
  return json.access_token
}

// ── PEM → CryptoKey ───────────────────────────────────────────────────
async function importPkcs8(pem: string): Promise<CryptoKey> {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '')
  const der = base64ToBytes(body)
  return crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}

// ── small helpers ─────────────────────────────────────────────────────
function encode(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

function b64url(bytes: Uint8Array): string {
  // btoa expects a binary string; build it without splitting surrogates.
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
