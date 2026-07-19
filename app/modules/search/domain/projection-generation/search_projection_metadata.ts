import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'

export type SearchProjectionCoverageState =
  | 'available'
  | 'known_empty'
  | 'missing'
  | 'unresolved'
  | 'below_threshold'
  | 'stale'
  | 'private_unavailable'

export type PublicSearchProjectionCoverage =
  | 'available'
  | 'known_empty'
  | 'incomplete'
  | 'unavailable'

export interface SearchProjectionMetadata {
  readonly state: SearchProjectionCoverageState
  readonly sourceRevision: string | null
  readonly projectionVersion: string
  readonly taxonomyVersions: Readonly<Record<string, number>>
  readonly updatedAt: string | null
}

export interface PublicSearchProjectionMetadata {
  readonly coverage: PublicSearchProjectionCoverage
  readonly projectionVersion: string
  readonly taxonomyVersions: Readonly<Record<string, number>>
  readonly updatedAt: string | null
}

export function createSearchProjectionMetadata(input: SearchProjectionMetadata): SearchProjectionMetadata {
  if (!input.projectionVersion || !Object.values(input.taxonomyVersions).every((version) => Number.isSafeInteger(version) && version > 0)) {
    throw new InvariantViolationException('invalid_search_projection_metadata')
  }
  if (input.state === 'available' && input.sourceRevision === null) {
    throw new InvariantViolationException('available_projection_metadata_requires_source_revision')
  }
  return { ...input }
}

export function toPublicSearchProjectionMetadata(input: SearchProjectionMetadata): PublicSearchProjectionMetadata {
  const coverage = input.state === 'available'
    ? 'available'
    : input.state === 'known_empty'
      ? 'known_empty'
      : input.state === 'private_unavailable'
        ? 'unavailable'
        : 'incomplete'

  return {
    coverage,
    projectionVersion: input.projectionVersion,
    taxonomyVersions: input.taxonomyVersions,
    updatedAt: input.updatedAt,
  }
}
