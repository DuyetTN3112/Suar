import type { MetadataAssignmentResult } from '#modules/taxonomy/public_contracts/taxonomy-governance/metadata_assignment_provider'
import type { MetadataKnowledgeState } from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_diagnostics'
import type { TaxonomyAccessContext } from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_provider'

type CanonicalAssignment = MetadataAssignmentResult['assignments'][number]

export const TASK_METADATA_CANONICAL_NAMESPACES = [
  'business-domains',
  'problem-categories',
  'skills',
  'task-types',
  'technologies',
] as const

export type TaskMetadataCanonicalNamespace = (typeof TASK_METADATA_CANONICAL_NAMESPACES)[number]

export type TaskMetadataAssignmentAccessContext = TaxonomyAccessContext

export interface TaskMetadataCanonicalAssignmentSource {
  readonly termId: string
  readonly provenance: CanonicalAssignment['provenance']
  readonly reviewState: CanonicalAssignment['reviewState']
  readonly confidence?: number
  readonly sourceType: string
  readonly sourceId?: string
  readonly evidenceRefs?: readonly string[]
  readonly validFrom?: string
  readonly validUntil?: string
  readonly enrichmentVersion?: number
}

export interface TaskMetadataNamespaceSource {
  readonly namespace: TaskMetadataCanonicalNamespace
  readonly state: MetadataKnowledgeState
  readonly taxonomyVersion: number
  readonly enrichmentVersion?: number
  readonly unresolvedCount?: number
  readonly belowThresholdCount?: number
  readonly assignments: readonly TaskMetadataCanonicalAssignmentSource[]
}

export interface TaskMetadataFreeFormTagSource {
  readonly value: string
  readonly tagSpace: string
  readonly sourceType: string
  readonly sourceId?: string
}

export interface TaskMetadataEntitySource {
  readonly entityId: string
  readonly organizationId: string
  readonly visibility: string
  readonly deleted: boolean
  readonly sourceRevision: string
  readonly projectedAt: string
  readonly namespaces: readonly TaskMetadataNamespaceSource[]
  readonly freeFormTags: readonly TaskMetadataFreeFormTagSource[]
}

export interface TaskMetadataAssignmentSourceQuery {
  readonly entityIds: readonly string[]
  readonly namespaces?: readonly TaskMetadataCanonicalNamespace[]
}

export interface TaskMetadataAssignmentSourceReader {
  loadVisibleTaskMetadata(
    query: TaskMetadataAssignmentSourceQuery,
    accessContext?: TaskMetadataAssignmentAccessContext
  ): Promise<readonly TaskMetadataEntitySource[]>
}

export interface TaskMetadataTaxonomyVersionSnapshot {
  readonly taxonomyVersions: Readonly<Record<string, number>>
  readonly enrichmentVersions?: Readonly<Record<string, number>>
}

export interface TaskMetadataTaxonomyVersionReader {
  getVersions(
    namespaces: readonly TaskMetadataCanonicalNamespace[]
  ): Promise<TaskMetadataTaxonomyVersionSnapshot>
}
