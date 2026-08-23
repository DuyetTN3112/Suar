import type { TaxonomyCompletenessReport, TaxonomyDiagnostic } from './taxonomy_diagnostics.js'
import type { TaxonomyAccessContext } from './taxonomy_provider.js'
import type { EntityTaxonomyAssignment, FreeFormTag } from './taxonomy_term_contracts.js'

export interface MetadataAssignmentQuery {
  readonly resource: string
  readonly entityIds: readonly string[]
  readonly namespaces?: readonly string[]
}

export interface MetadataAssignmentResult {
  readonly assignments: readonly EntityTaxonomyAssignment[]
  readonly freeFormTags: readonly FreeFormTag[]
  readonly taxonomyVersions: Readonly<Record<string, number>>
  readonly diagnostics: readonly TaxonomyDiagnostic[]
  readonly completeness?: readonly TaxonomyCompletenessReport[]
  readonly providerVersions?: {
    readonly assignmentSchemaVersion: number
    readonly sourceRevisions: Readonly<Record<string, string>>
    readonly enrichmentVersions: Readonly<Record<string, number>>
  }
}

export interface MetadataAssignmentProvider<TAccessContext = TaxonomyAccessContext> {
  getAssignments(
    query: MetadataAssignmentQuery,
    accessContext?: TAccessContext
  ): Promise<MetadataAssignmentResult>
}
