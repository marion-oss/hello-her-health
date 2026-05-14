import Link from 'next/link'
import { getSupabase, type ClinicalPathway, type PathwayStatus } from '../lib/supabase'

export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<PathwayStatus, string> = {
  draft: 'bg-amber-100 text-amber-900 ring-amber-200',
  in_review: 'bg-sky-100 text-sky-900 ring-sky-200',
  approved: 'bg-emerald-100 text-emerald-900 ring-emerald-200',
  live: 'bg-fuchsia-100 text-fuchsia-900 ring-fuchsia-300',
  archived: 'bg-zinc-200 text-zinc-700 ring-zinc-300',
}

const STATUS_LABELS: Record<PathwayStatus, string> = {
  draft: 'Brouillon',
  in_review: 'En revue',
  approved: 'Approuvé',
  live: 'En production',
  archived: 'Archivé',
}

async function loadPathways(): Promise<ClinicalPathway[]> {
  const { data, error } = await getSupabase()
    .from('clinical_pathways')
    .select('*')
    .neq('status', 'archived')
    .order('pathway_key', { ascending: true })
    .order('version_number', { ascending: false })

  if (error) {
    throw new Error(`Failed to load pathways: ${error.message}`)
  }
  return data ?? []
}

export default async function HomePage() {
  const pathways = await loadPathways()

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-10">
        <p className="text-sm font-medium uppercase tracking-wide text-fuchsia-600">
          Anoqi
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900">
          Parcours cliniques
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Aperçu en lecture seule des parcours en revue clinique.{' '}
          Les modifications passent par un workflow d&apos;approbation
          (v1, à venir).
        </p>
      </header>

      {pathways.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-600">
          Aucun parcours actif pour l&apos;instant.
        </p>
      ) : (
        <ul className="space-y-3">
          {pathways.map((p) => (
            <li key={p.id}>
              <Link
                href={`/pathways/${p.id}`}
                className="block rounded-lg border border-zinc-200 bg-white p-5 transition hover:border-fuchsia-300 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-mono text-xs uppercase tracking-wide text-zinc-500">
                      {p.pathway_key} · v{p.version}
                    </p>
                    <h2 className="mt-1 text-lg font-medium text-zinc-900">
                      {p.title}
                    </h2>
                    {p.description && (
                      <p className="mt-1 text-sm text-zinc-600">{p.description}</p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[p.status]}`}
                  >
                    {STATUS_LABELS[p.status]}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
