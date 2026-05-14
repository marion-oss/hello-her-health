import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (client) return client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Set both in .env.local (dev) and in Vercel project settings (prod).',
    )
  }

  client = createClient(url, anonKey)
  return client
}

export type PathwayStatus = 'draft' | 'in_review' | 'approved' | 'live' | 'archived'

export type ClinicalPathway = {
  id: string
  pathway_key: string
  version: string
  version_number: number
  status: PathwayStatus
  title: string
  description: string | null
  content: Record<string, unknown>
  change_summary: string | null
  regulatory_notes: string | null
  created_at: string
  updated_at: string
  approved_at: string | null
  deployed_at: string | null
}
