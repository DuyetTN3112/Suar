import { canonicalTaxonomyRef } from '#modules/taxonomy/domain/taxonomy-governance/taxonomy_term'
import type {
  MetadataAssignmentProvider,
  MetadataAssignmentQuery,
  MetadataAssignmentResult,
} from '#modules/taxonomy/public_contracts/taxonomy-governance/metadata_assignment_provider'

export interface MetadataAssignmentProviderConformanceFixture {
  provider: MetadataAssignmentProvider
  authorizedQuery: MetadataAssignmentQuery
  hiddenQuery: MetadataAssignmentQuery
  unknownQuery: MetadataAssignmentQuery
  wrongResourceQuery: MetadataAssignmentQuery
  unknownNamespaceQuery: MetadataAssignmentQuery
  authorizedResult: MetadataAssignmentResult
  emptyResult: MetadataAssignmentResult
}

export interface MetadataAssignmentProviderConformanceReport {
  authorizedAssignmentCount: number
  authorizedTaxonomyNamespaceCount: number
}

function stableValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableValue(record[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function hasNoVisibleData(result: MetadataAssignmentResult): boolean {
  return (
    result.assignments.length === 0 &&
    result.freeFormTags.length === 0 &&
    Object.keys(result.taxonomyVersions).length === 0
  )
}

function coreResult(result: MetadataAssignmentResult): MetadataAssignmentResult {
  return {
    assignments: result.assignments,
    freeFormTags: result.freeFormTags,
    taxonomyVersions: result.taxonomyVersions,
    diagnostics: result.diagnostics,
  }
}

function assertAssignmentEnvelope(
  result: MetadataAssignmentResult,
  query: MetadataAssignmentQuery
): void {
  const keys = result.assignments.map(
    (assignment) =>
      `${assignment.resource}:${assignment.entityId}:${canonicalTaxonomyRef(assignment.term)}`
  )
  invariant(new Set(keys).size === keys.length, 'canonical assignment refs must not be duplicated')
  invariant(
    result.assignments.every(
      (assignment) =>
        assignment.resource === query.resource && query.entityIds.includes(assignment.entityId)
    ),
    'assignments must belong to the requested resource and entities'
  )
  invariant(
    Object.values(result.taxonomyVersions).every(
      (version) => Number.isSafeInteger(version) && version > 0
    ),
    'reported taxonomy versions must be positive integers'
  )
  invariant(
    result.freeFormTags.every(
      (tag) =>
        !result.assignments.some(
          (assignment) =>
            assignment.entityId === tag.entityId &&
            canonicalTaxonomyRef(assignment.term) === `${tag.tagSpace}:${tag.normalizedValue}`
        )
    ),
    'free-form tags must remain separate from canonical assignments'
  )
}

export async function assertMetadataAssignmentProviderConformance(
  fixture: MetadataAssignmentProviderConformanceFixture
): Promise<MetadataAssignmentProviderConformanceReport> {
  const authorized = await fixture.provider.getAssignments(fixture.authorizedQuery)
  const hidden = await fixture.provider.getAssignments(fixture.hiddenQuery)
  const unknown = await fixture.provider.getAssignments(fixture.unknownQuery)
  const wrongResource = await fixture.provider.getAssignments(fixture.wrongResourceQuery)
  const unknownNamespace = await fixture.provider.getAssignments(fixture.unknownNamespaceQuery)

  invariant(authorized.assignments.length > 0, 'authorized metadata probes must preserve visible assignments')
  invariant(
    stableValue(coreResult(authorized)) === stableValue(fixture.authorizedResult),
    'authorized envelope must match the fixture'
  )
  assertAssignmentEnvelope(authorized, fixture.authorizedQuery)
  invariant(
    stableValue(coreResult(hidden)) === stableValue(coreResult(unknown)),
    'hidden and unknown metadata probes must be indistinguishable'
  )
  invariant(
    stableValue(coreResult(hidden)) === stableValue(fixture.emptyResult),
    'hidden metadata must be suppressed'
  )
  invariant(hasNoVisibleData(hidden), 'hidden and unknown metadata probes must fail closed')
  invariant(
    stableValue(coreResult(wrongResource)) === stableValue(coreResult(hidden)),
    'wrong-resource probes must be indistinguishable'
  )
  invariant(hasNoVisibleData(wrongResource), 'wrong-resource probes must fail closed')
  invariant(
    stableValue(coreResult(unknownNamespace)) === stableValue(coreResult(hidden)),
    'unknown namespace probes must be indistinguishable'
  )
  invariant(hasNoVisibleData(unknownNamespace), 'unknown namespace probes must fail closed')

  return {
    authorizedAssignmentCount: authorized.assignments.length,
    authorizedTaxonomyNamespaceCount: Object.keys(authorized.taxonomyVersions).length,
  }
}
