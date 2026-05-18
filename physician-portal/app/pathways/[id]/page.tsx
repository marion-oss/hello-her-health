import { notFound } from 'next/navigation'
import { getSupabase, type ClinicalPathway } from '../../../lib/supabase'
import { PathwayHeader } from '../../../components/PathwayHeader'
import { Card } from '../../../components/Card'
import { JsonViewer } from '../../../components/JsonViewer'

export const dynamic = 'force-dynamic'

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
      <PathwayHeader
        pathwayKey={pathway.pathway_key}
        version={pathway.version}
        title={pathway.title}
        description={pathway.description}
        status={pathway.status}
      />

      {pathway.change_summary && (
        <section className="mb-8">
          <Card variant="quiet" className="p-5">
            <p className="eyebrow" style={{ color: 'var(--text-secondary)' }}>
              Résumé du changement
            </p>
            <p
              className="mt-2 text-sm leading-relaxed"
              style={{ color: 'var(--text-primary)' }}
            >
              {pathway.change_summary}
            </p>
          </Card>
        </section>
      )}

      <section>
        <p className="eyebrow mb-3" style={{ color: 'var(--text-secondary)' }}>
          Contenu du parcours
        </p>
        <JsonViewer data={pathway.content} />
      </section>

      <footer
        className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs"
        style={{ color: 'var(--text-tertiary)' }}
      >
        <span className="inline-flex items-center gap-2">
          <span className="eyebrow" style={{ color: 'var(--text-secondary)' }}>
            Créé le
          </span>
          <span>{new Date(pathway.created_at).toLocaleDateString('fr-FR')}</span>
        </span>
        {pathway.deployed_at && (
          <span className="inline-flex items-center gap-2">
            <span className="eyebrow" style={{ color: 'var(--text-secondary)' }}>
              Déployé le
            </span>
            <span>{new Date(pathway.deployed_at).toLocaleDateString('fr-FR')}</span>
          </span>
        )}
      </footer>
    </main>
  )
}
