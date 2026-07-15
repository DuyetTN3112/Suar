import type { MetadataAssignmentResult } from '#modules/taxonomy/public_contracts/taxonomy-governance/metadata_assignment_provider'
import type { TaxonomyCompletenessReport } from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_diagnostics'
import { canonicalTaxonomyRef } from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_term_contracts'

interface TaskMetadataProviderVersions {
  readonly assignmentSchemaVersion: number
  readonly sourceRevisions: Readonly<Record<string, string>>
  readonly enrichmentVersions: Readonly<Record<string, number>>
}

export interface TaskSearchCanonicalMetadata {
  canonical_term_ids: string[]
  canonical_term_ids_known: true
  canonical_term_ids_count: number
  canonical_term_ids_by_namespace: Record<string, string[]>
  assignment_provenance: string[]
  assignment_review_states: string[]
  taxonomy_versions: string[]
  taxonomy_versions_by_namespace: Record<string, number>
  taxonomy_completeness: string[]
  taxonomy_completeness_by_namespace: Record<string, TaxonomyCompletenessReport>
  metadata_assignment_schema_version: number
  metadata_source_revisions: string[]
  metadata_enrichment_versions_by_namespace: Record<string, number>
}

type TaskMetadataProjectionResult = Pick<
  MetadataAssignmentResult,
  'assignments' | 'taxonomyVersions'
> & {
  readonly completeness?: readonly TaxonomyCompletenessReport[]
  readonly providerVersions?: TaskMetadataProviderVersions
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)]
}

export function projectTaskCanonicalMetadata(
  result: TaskMetadataProjectionResult
): TaskSearchCanonicalMetadata {
  const assignmentsByNamespace = new Map<string, string[]>()
  const canonicalTermIds: string[] = []
  const provenance: string[] = []
  const reviewStates: string[] = []

  for (const assignment of result.assignments) {
    const ref = canonicalTaxonomyRef(assignment.term)
    canonicalTermIds.push(ref)
    provenance.push(assignment.provenance)
    reviewStates.push(assignment.reviewState)
    const namespaceRefs = assignmentsByNamespace.get(assignment.term.namespace) ?? []
    namespaceRefs.push(ref)
    assignmentsByNamespace.set(assignment.term.namespace, namespaceRefs)
  }

  const canonicalTermIdsByNamespace = Object.fromEntries(
    [...assignmentsByNamespace.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([namespace, refs]) => [namespace, unique(refs)])
  )
  const taxonomyVersionsByNamespace = Object.fromEntries(
    Object.entries(result.taxonomyVersions).sort(([left], [right]) => left.localeCompare(right))
  )
  const completenessByNamespace = Object.fromEntries(
    [...(result.completeness ?? [])]
      .sort((left, right) => left.namespace.localeCompare(right.namespace))
      .map((report) => [report.namespace, report])
  )
  const completeness = Object.entries(completenessByNamespace).map(
    ([namespace, report]) => `${namespace}:${report.state}`
  )
  const providerVersions = result.providerVersions
  const metadataSourceRevisions = Object.entries(providerVersions?.sourceRevisions ?? {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([entityId, revision]) => `${entityId}:${revision}`)
  const metadataEnrichmentVersionsByNamespace = Object.fromEntries(
    Object.entries(providerVersions?.enrichmentVersions ?? {}).sort(([left], [right]) =>
      left.localeCompare(right)
    )
  )

  return {
    canonical_term_ids: unique(canonicalTermIds),
    canonical_term_ids_known: true,
    canonical_term_ids_count: unique(canonicalTermIds).length,
    canonical_term_ids_by_namespace: canonicalTermIdsByNamespace,
    assignment_provenance: unique(provenance),
    assignment_review_states: unique(reviewStates),
    taxonomy_versions: Object.entries(taxonomyVersionsByNamespace).map(
      ([namespace, version]) => `${namespace}:${version}`
    ),
    taxonomy_versions_by_namespace: taxonomyVersionsByNamespace,
    taxonomy_completeness: completeness,
    taxonomy_completeness_by_namespace: completenessByNamespace,
    metadata_assignment_schema_version: providerVersions?.assignmentSchemaVersion ?? 1,
    metadata_source_revisions: metadataSourceRevisions,
    metadata_enrichment_versions_by_namespace: metadataEnrichmentVersionsByNamespace,
  }
}
