import { Buffer } from 'node:buffer'

import {
  TASK_METADATA_CANONICAL_NAMESPACES,
  type TaskMetadataAssignmentAccessContext,
  type TaskMetadataAssignmentSourceReader,
  type TaskMetadataCanonicalAssignmentSource,
  type TaskMetadataCanonicalNamespace,
  type TaskMetadataEntitySource,
  type TaskMetadataNamespaceSource,
} from '#modules/tasks/actions/ports/outbound/task_metadata_assignment_source_reader'
import type {
  MetadataAssignmentProvider,
  MetadataAssignmentQuery,
  MetadataAssignmentResult,
} from '#modules/taxonomy/public_contracts/taxonomy-governance/metadata_assignment_provider'
import {
  createTaxonomyCompletenessReport,
  type TaxonomyCompletenessReport,
  type TaxonomyDiagnostic,
} from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_diagnostics'

type EntityTaxonomyAssignment = MetadataAssignmentResult['assignments'][number]
type FreeFormTag = MetadataAssignmentResult['freeFormTags'][number]
type FreeFormTagScope = Omit<FreeFormTag, 'displayValue' | 'normalizedValue'>

const TASK_RESOURCE = 'task'
const ASSIGNMENT_SCHEMA_VERSION = 1
const PUBLIC_VISIBILITIES = new Set(['external', 'all'])
const SUPPORTED_NAMESPACES = new Set<string>(TASK_METADATA_CANONICAL_NAMESPACES)

export interface TaskMetadataProviderVersions {
  readonly assignmentSchemaVersion: number
  readonly sourceRevisions: Readonly<Record<string, string>>
  readonly enrichmentVersions: Readonly<Record<string, number>>
}

export interface TaskMetadataAssignmentResult extends MetadataAssignmentResult {
  readonly completeness: readonly TaxonomyCompletenessReport[]
  readonly providerVersions: TaskMetadataProviderVersions
}

function emptyResult(): TaskMetadataAssignmentResult {
  return {
    assignments: [],
    freeFormTags: [],
    taxonomyVersions: {},
    diagnostics: [],
    completeness: [],
    providerVersions: {
      assignmentSchemaVersion: ASSIGNMENT_SCHEMA_VERSION,
      sourceRevisions: {},
      enrichmentVersions: {},
    },
  }
}

function stringSet(value: unknown): ReadonlySet<string> {
  if (!Array.isArray(value)) return new Set()
  return new Set(
    value.filter((candidate): candidate is string => typeof candidate === 'string' && !!candidate)
  )
}

function isVisible(
  source: TaskMetadataEntitySource,
  context: TaskMetadataAssignmentAccessContext | undefined
): boolean {
  if (source.deleted) return false
  if (PUBLIC_VISIBILITIES.has(source.visibility)) return true

  const authorizedTaskIds = stringSet(context?.attributes?.['authorizedTaskIds'])
  if (authorizedTaskIds.has(source.entityId)) return true

  const authorizedOrganizationIds = stringSet(context?.attributes?.['authorizedOrganizationIds'])
  return authorizedOrganizationIds.has(source.organizationId)
}

function selectedNamespaces(
  query: MetadataAssignmentQuery
): readonly TaskMetadataCanonicalNamespace[] {
  const requested = query.namespaces ?? TASK_METADATA_CANONICAL_NAMESPACES
  return [
    ...new Set(
      requested.filter((namespace): namespace is TaskMetadataCanonicalNamespace =>
        SUPPORTED_NAMESPACES.has(namespace)
      )
    ),
  ].sort()
}

function normalizeTaxonomyMatchValue(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en-US')
}

function canonicalTaxonomyRef(ref: EntityTaxonomyAssignment['term']): string {
  return `${ref.namespace}:${ref.termId}`
}

function normalizeFreeFormTag(value: string, scope: FreeFormTagScope): FreeFormTag {
  const displayValue = value.normalize('NFKC').trim().replace(/\s+/gu, ' ')
  return {
    ...scope,
    displayValue,
    normalizedValue: normalizeTaxonomyMatchValue(displayValue),
  }
}

function canonicalTermId(value: string): string | null {
  const normalized = normalizeTaxonomyMatchValue(value)
  if (normalized.length === 0) return null
  if (/^[a-z0-9][a-z0-9._-]*$/u.test(normalized)) return normalized
  return `encoded-${Buffer.from(normalized, 'utf8').toString('hex')}`
}

function assignmentPriority(assignment: EntityTaxonomyAssignment): readonly number[] {
  const review = {
    reviewed: 5,
    pending: 4,
    disputed: 3,
    expired: 2,
    rejected: 1,
  }[assignment.reviewState]
  const provenance = {
    explicit: 4,
    imported: 3,
    derived: 2,
    suggested: 1,
  }[assignment.provenance]
  return [review, provenance, assignment.confidence ?? -1]
}

function isPreferred(
  candidate: EntityTaxonomyAssignment,
  current: EntityTaxonomyAssignment
): boolean {
  const candidatePriority = assignmentPriority(candidate)
  const currentPriority = assignmentPriority(current)
  for (const [index, candidateValue] of candidatePriority.entries()) {
    const difference = candidateValue - (currentPriority[index] ?? -1)
    if (difference !== 0) return difference > 0
  }
  return (candidate.sourceId ?? '').localeCompare(current.sourceId ?? '') < 0
}

function assignmentFromSource(
  entityId: string,
  namespace: TaskMetadataNamespaceSource,
  source: TaskMetadataCanonicalAssignmentSource
): EntityTaxonomyAssignment | null {
  const termId = canonicalTermId(source.termId)
  if (!termId) return null

  return {
    resource: TASK_RESOURCE,
    entityId,
    term: { namespace: namespace.namespace, termId },
    provenance: source.provenance,
    reviewState: source.reviewState,
    ...(source.confidence === undefined ? {} : { confidence: source.confidence }),
    sourceType: source.sourceType,
    ...(source.sourceId === undefined ? {} : { sourceId: source.sourceId }),
    ...(source.evidenceRefs === undefined ? {} : { evidenceRefs: source.evidenceRefs }),
    ...(source.validFrom === undefined ? {} : { validFrom: source.validFrom }),
    ...(source.validUntil === undefined ? {} : { validUntil: source.validUntil }),
    taxonomyVersion: namespace.taxonomyVersion,
    ...(source.enrichmentVersion === undefined && namespace.enrichmentVersion === undefined
      ? {}
      : { enrichmentVersion: source.enrichmentVersion ?? namespace.enrichmentVersion }),
  }
}

function invalidAssignmentDiagnostic(code: TaxonomyDiagnostic['code']): TaxonomyDiagnostic {
  return {
    code,
    severity: 'error',
    path: 'assignments',
    message: 'A task metadata assignment was excluded because its envelope is invalid',
  }
}

function validTimestamp(value: string | undefined): boolean {
  if (value === undefined) return true
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/u.exec(
      value
    )
  if (!match || !Number.isFinite(Date.parse(value))) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6])
  const daysInMonth =
    Number.isSafeInteger(year) && Number.isSafeInteger(month) && month >= 1 && month <= 12
      ? new Date(Date.UTC(year, month, 0)).getUTCDate()
      : 0
  return day >= 1 && day <= daysInMonth && hour <= 23 && minute <= 59 && second <= 59
}

function validateAssignmentEnvelope(assignment: EntityTaxonomyAssignment): TaxonomyDiagnostic[] {
  const diagnostics: TaxonomyDiagnostic[] = []
  if (!['explicit', 'imported', 'derived', 'suggested'].includes(assignment.provenance)) {
    diagnostics.push(invalidAssignmentDiagnostic('invalid_assignment_provenance'))
  }
  if (
    !['reviewed', 'pending', 'disputed', 'rejected', 'expired'].includes(assignment.reviewState)
  ) {
    diagnostics.push(invalidAssignmentDiagnostic('invalid_assignment_review_state'))
  }
  if (!assignment.resource.trim() || !assignment.entityId.trim() || !assignment.sourceType.trim()) {
    diagnostics.push(invalidAssignmentDiagnostic('missing_assignment_field'))
  }
  if (!Number.isSafeInteger(assignment.taxonomyVersion) || assignment.taxonomyVersion < 1) {
    diagnostics.push(invalidAssignmentDiagnostic('invalid_version'))
  }
  if (
    assignment.enrichmentVersion !== undefined &&
    (!Number.isSafeInteger(assignment.enrichmentVersion) || assignment.enrichmentVersion < 1)
  ) {
    diagnostics.push(invalidAssignmentDiagnostic('invalid_version'))
  }
  if (
    assignment.confidence !== undefined &&
    (!Number.isFinite(assignment.confidence) ||
      assignment.confidence < 0 ||
      assignment.confidence > 1)
  ) {
    diagnostics.push(invalidAssignmentDiagnostic('confidence_out_of_range'))
  }
  if (!validTimestamp(assignment.validFrom) || !validTimestamp(assignment.validUntil)) {
    diagnostics.push(invalidAssignmentDiagnostic('invalid_validity_timestamp'))
  } else if (
    assignment.validFrom !== undefined &&
    assignment.validUntil !== undefined &&
    Date.parse(assignment.validFrom) > Date.parse(assignment.validUntil)
  ) {
    diagnostics.push(invalidAssignmentDiagnostic('validity_window_inverted'))
  }
  return diagnostics
}

function collectAssignments(
  sources: readonly TaskMetadataEntitySource[],
  namespaces: ReadonlySet<string>,
  diagnostics: TaxonomyDiagnostic[]
): EntityTaxonomyAssignment[] {
  const assignments = new Map<string, EntityTaxonomyAssignment>()

  for (const entity of sources) {
    for (const namespace of entity.namespaces) {
      if (!namespaces.has(namespace.namespace)) continue
      for (const source of namespace.assignments) {
        const assignment = assignmentFromSource(entity.entityId, namespace, source)
        if (!assignment) {
          diagnostics.push(invalidAssignmentDiagnostic('invalid_term_id'))
          continue
        }
        const validation = validateAssignmentEnvelope(assignment)
        if (validation.length > 0) {
          diagnostics.push(...validation)
          continue
        }
        const key = `${assignment.resource}:${assignment.entityId}:${canonicalTaxonomyRef(assignment.term)}`
        const current = assignments.get(key)
        if (!current || isPreferred(assignment, current)) assignments.set(key, assignment)
      }
    }
  }

  return [...assignments.values()].sort((left, right) => {
    return (
      left.entityId.localeCompare(right.entityId) ||
      canonicalTaxonomyRef(left.term).localeCompare(canonicalTaxonomyRef(right.term))
    )
  })
}

function collectTags(sources: readonly TaskMetadataEntitySource[]): FreeFormTag[] {
  const tags = new Map<string, FreeFormTag>()
  for (const entity of sources) {
    for (const source of entity.freeFormTags) {
      const tag = normalizeFreeFormTag(source.value, {
        resource: TASK_RESOURCE,
        entityId: entity.entityId,
        tagSpace: source.tagSpace,
        sourceType: source.sourceType,
        ...(source.sourceId === undefined ? {} : { sourceId: source.sourceId }),
      })
      if (!tag.normalizedValue) continue
      const key = `${tag.entityId}:${tag.tagSpace}:${tag.normalizedValue}`
      if (!tags.has(key)) tags.set(key, tag)
    }
  }
  return [...tags.values()].sort((left, right) => {
    return (
      left.entityId.localeCompare(right.entityId) ||
      left.tagSpace.localeCompare(right.tagSpace) ||
      left.normalizedValue.localeCompare(right.normalizedValue) ||
      left.displayValue.localeCompare(right.displayValue)
    )
  })
}

export class TaskMetadataAssignmentProvider implements MetadataAssignmentProvider<TaskMetadataAssignmentAccessContext> {
  constructor(private readonly reader: TaskMetadataAssignmentSourceReader) {}

  async getAssignments(
    query: MetadataAssignmentQuery,
    accessContext?: TaskMetadataAssignmentAccessContext
  ): Promise<TaskMetadataAssignmentResult> {
    if (query.resource !== TASK_RESOURCE) return emptyResult()
    const entityIds = [...new Set(query.entityIds.filter((entityId) => entityId.trim().length > 0))]
    const namespaces = selectedNamespaces(query)
    if (entityIds.length === 0 || namespaces.length === 0) return emptyResult()

    const requestedEntities = new Set(entityIds)
    const requestedNamespaces = new Set<string>(namespaces)
    const loaded = await this.reader.loadVisibleTaskMetadata(
      { entityIds, ...(query.namespaces === undefined ? {} : { namespaces }) },
      accessContext
    )
    const visible = loaded
      .filter(
        (source) => requestedEntities.has(source.entityId) && isVisible(source, accessContext)
      )
      .sort((left, right) => left.entityId.localeCompare(right.entityId))
    if (visible.length === 0) return emptyResult()

    const diagnostics: TaxonomyDiagnostic[] = []
    const taxonomyVersions: Record<string, number> = {}
    const enrichmentVersions: Record<string, number> = {}
    const sourceRevisions: Record<string, string> = {}
    const completeness: TaxonomyCompletenessReport[] = []

    for (const source of visible) {
      sourceRevisions[source.entityId] = source.sourceRevision
      for (const namespace of [...source.namespaces].sort((left, right) =>
        left.namespace.localeCompare(right.namespace)
      )) {
        if (!requestedNamespaces.has(namespace.namespace)) continue
        taxonomyVersions[namespace.namespace] = namespace.taxonomyVersion
        if (namespace.enrichmentVersion !== undefined) {
          enrichmentVersions[namespace.namespace] = namespace.enrichmentVersion
        }
        completeness.push(
          createTaxonomyCompletenessReport({
            resource: TASK_RESOURCE,
            entityId: source.entityId,
            namespace: namespace.namespace,
            state: namespace.state,
            taxonomyVersion: namespace.taxonomyVersion,
            ...(namespace.enrichmentVersion === undefined
              ? {}
              : { enrichmentVersion: namespace.enrichmentVersion }),
            projectedAt: source.projectedAt,
            ...(namespace.unresolvedCount === undefined
              ? {}
              : { unresolvedCount: namespace.unresolvedCount }),
            ...(namespace.belowThresholdCount === undefined
              ? {}
              : { belowThresholdCount: namespace.belowThresholdCount }),
          })
        )
      }
    }

    return {
      assignments: collectAssignments(visible, requestedNamespaces, diagnostics),
      freeFormTags: query.namespaces === undefined ? collectTags(visible) : [],
      taxonomyVersions,
      diagnostics,
      completeness,
      providerVersions: {
        assignmentSchemaVersion: ASSIGNMENT_SCHEMA_VERSION,
        sourceRevisions,
        enrichmentVersions,
      },
    }
  }
}
