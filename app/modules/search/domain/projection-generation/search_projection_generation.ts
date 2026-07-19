import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'

export type SearchProjectionGenerationStatus = 'building' | 'catching_up' | 'validating' | 'ready' | 'active' | 'failed' | 'requires_repair'

export interface SearchProjectionGeneration {
  readonly id: string
  readonly target: string
  readonly generation: string
  readonly physicalIndexName: string
  readonly status: SearchProjectionGenerationStatus
  readonly sourceEntityRevision: string
  readonly contextVersion: string
  readonly taxonomyVersions: Readonly<Record<string, number>>
  readonly enrichmentVersion: string
  readonly checkpoint: string | null
  readonly documentCount: number | null
  readonly completenessChecksum: string | null
  readonly createdAt: string
  readonly updatedAt: string
}

export function createSearchProjectionGeneration(input: {
  readonly id: string
  readonly target: string
  readonly generation: string
  readonly physicalIndexName: string
  readonly sourceEntityRevision: string
  readonly contextVersion: string
  readonly taxonomyVersions: Readonly<Record<string, number>>
  readonly enrichmentVersion: string
  readonly now: string
}): SearchProjectionGeneration {
  if (!input.id || !input.target || !input.generation || !input.physicalIndexName || !input.sourceEntityRevision || !input.contextVersion || !input.enrichmentVersion) throw new InvariantViolationException('invalid_search_projection_generation')
  if (Object.values(input.taxonomyVersions).some((version) => !Number.isSafeInteger(version) || version < 1)) throw new InvariantViolationException('invalid_search_projection_taxonomy_version')
  return { ...input, status: 'building', checkpoint: null, documentCount: null, completenessChecksum: null, createdAt: input.now, updatedAt: input.now }
}

export function advanceSearchProjectionGeneration(generation: SearchProjectionGeneration, nextStatus: SearchProjectionGenerationStatus, now = generation.updatedAt): SearchProjectionGeneration {
  if (!allowedTransitions[generation.status].includes(nextStatus)) throw new InvariantViolationException('illegal_projection_generation_transition')
  return { ...generation, status: nextStatus, updatedAt: now }
}

export function recordSearchProjectionCheckpoint(generation: SearchProjectionGeneration, input: { readonly sourceRevision: string; readonly checkpoint: string; readonly now: string }): SearchProjectionGeneration {
  if (compareRevision(input.sourceRevision, generation.sourceEntityRevision) < 0) throw new InvariantViolationException('checkpoint_regression')
  if (!input.checkpoint) throw new InvariantViolationException('invalid_projection_checkpoint')
  return { ...generation, sourceEntityRevision: input.sourceRevision, checkpoint: input.checkpoint, updatedAt: input.now }
}

export function validateSearchProjectionGeneration(generation: SearchProjectionGeneration, input: { readonly expectedDocumentCount: number; readonly actualDocumentCount: number; readonly expectedChecksum: string; readonly actualChecksum: string; readonly eventGap: boolean }): 'ready' | 'requires_repair' {
  if (generation.status !== 'validating') throw new InvariantViolationException('projection_generation_not_validating')
  if (!Number.isSafeInteger(input.expectedDocumentCount) || input.expectedDocumentCount < 0 || input.actualDocumentCount !== input.expectedDocumentCount || input.actualChecksum !== input.expectedChecksum || input.eventGap) return 'requires_repair'
  return 'ready'
}

const allowedTransitions: Record<SearchProjectionGenerationStatus, readonly SearchProjectionGenerationStatus[]> = {
  building: ['catching_up', 'failed', 'requires_repair'],
  catching_up: ['validating', 'failed', 'requires_repair'],
  validating: ['ready', 'failed', 'requires_repair'],
  ready: ['active', 'failed', 'requires_repair'],
  active: ['failed', 'requires_repair'],
  failed: ['building', 'requires_repair'],
  requires_repair: ['building', 'failed'],
}

function compareRevision(left: string, right: string): number {
  const leftNumber = trailingNumber(left)
  const rightNumber = trailingNumber(right)
  if (leftNumber !== null && rightNumber !== null) return leftNumber - rightNumber
  return left.localeCompare(right)
}

function trailingNumber(value: string): number | null {
  const match = /(?:^|[-_:])([0-9]+)$/u.exec(value)
  return match?.[1] === undefined ? null : Number(match[1])
}
