import Link from 'next/link'
import { getSupabase, type ClinicalPathway } from '../lib/supabase'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { EmptyState } from '../components/EmptyState'

export const dynamic = 'force-dynamic'

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
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-peony-600">
          Anoqi
        </p>
        <h1
          className="mt-2 text-4xl tracking-tight text-ink-900"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 800, lineHeight: 1.05 }}
        >
          Parcours cliniques
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-teal-700">
          Aperçu en lecture seule des parcours en revue clinique.{' '}
          Les modifications passent par un workflow d&apos;approbation
          (v1, à venir).
        </p>
      </header>

      {pathways.length === 0 ? (
        <EmptyState
          title="Aucun parcours actif"
          body="Aucun parcours n'est en revue clinique pour l'instant. Revenez bientôt — les premières fiches arrivent."
        />
      ) : (
        <ul className="space-y-3">
          {pathways.map((p) => (
            <li key={p.id}>
              <Card variant="quiet" className="pathway-card overflow-hidden">
                <Link href={`/pathways/${p.id}`} className="block p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-mono text-xs uppercase tracking-[0.14em] text-teal-700">
                        {p.pathway_key} · v{p.version}
                      </p>
                      <h2
                        className="mt-2 text-lg tracking-tight text-ink-900"
                        style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}
                      >
                        {p.title}
                      </h2>
                      {p.description && (
                        <p className="mt-1.5 text-sm leading-relaxed text-teal-700">
                          {p.description}
                        </p>
                      )}
                    </div>
                    <Badge status={p.status} />
                  </div>
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <style>{`
        .pathway-card {
          transition: border-color 180ms ease, box-shadow 180ms ease, background-color 180ms ease;
        }
        .pathway-card:hover {
          border-color: var(--border-strong) !important;
          box-shadow: var(--shadow-md) !important;
          background-color: var(--rose-100) !important;
        }
      `}</style>
    </main>
  )
}
