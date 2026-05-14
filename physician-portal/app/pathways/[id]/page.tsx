import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSupabase, type ClinicalPathway, type PathwayStatus } from '../../../lib/supabase'

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

async function loadPathway(id: string): Promise<ClinicalPathway | null> {
  const { data, error } = await getSupabase()
    .from('clinical_pathways')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`Failed to load pathway: ${error.message}`)
  return data
}

export default async function PathwayDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const pathway = await loadPathway(id)
  if (!pathway) notFound()

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Link
        href="/"
        className="text-sm text-zinc-600 transition hover:text-fuchsia-600"
      >
        ← Tous les parcours
      </Link>

      <header className="mt-6 mb-8 border-b border-zinc-200 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-wide text-zinc-500">
              {pathway.pathway_key} · v{pathway.version}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900">
              {pathway.title}
            </h1>
            {pathway.description && (
              <p className="mt-2 text-sm text-zinc-600">{pathway.description}</p>
            )}
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[pathway.status]}`}
          >
            {STATUS_LABELS[pathway.status]}
          </span>
        </div>
      </header>

      {pathway.change_summary && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">
            Résumé du changement
          </h2>
          <p className="mt-1 text-sm text-zinc-600">{pathway.change_summary}</p>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">
          Contenu du parcours
        </h2>
        <pre className="mt-2 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-xs leading-relaxed text-zinc-800">
          {JSON.stringify(pathway.content, null, 2)}
        </pre>
      </section>

      <footer className="mt-10 text-xs text-zinc-500">
        Créé le {new Date(pathway.created_at).toLocaleDateString('fr-FR')}
        {pathway.deployed_at && (
          <> · Déployé le {new Date(pathway.deployed_at).toLocaleDateString('fr-FR')}</>
        )}
      </footer>
    </main>
  )
}
