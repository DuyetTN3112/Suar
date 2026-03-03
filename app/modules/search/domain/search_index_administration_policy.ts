import type {
  SearchIndexCleanupCandidate,
  SearchIndexCleanupPolicy,
  SearchIndexDescriptor,
  SearchIndexGenerationRecord,
  SearchIndexInventory,
  SearchIndexRollbackPlanData,
} from '#modules/search/domain/search_index_administration'
import { SearchIndexAdministrationError } from '#modules/search/domain/search_index_administration_error'

export const SEARCH_INDEX_CLEANUP_CONFIRMATION = 'DELETE_RETIRED_SEARCH_INDICES'
export const SEARCH_INDEX_ROLLBACK_CONFIRMATION = 'ROLLBACK_SEARCH_INDEX'

function compareNewestFirst(
  left: SearchIndexGenerationRecord,
  right: SearchIndexGenerationRecord
): number {
  const leftTime = left.createdAt ? Date.parse(left.createdAt) : Number.NEGATIVE_INFINITY
  const rightTime = right.createdAt ? Date.parse(right.createdAt) : Number.NEGATIVE_INFINITY
  if (leftTime !== rightTime) {
    return rightTime - leftTime
  }
  return right.indexName.localeCompare(left.indexName)
}

export function resolveSearchIndexDescriptors(
  descriptors: readonly SearchIndexDescriptor[],
  target: string
): SearchIndexDescriptor[] {
  if (target === 'all') {
    return [...descriptors]
  }

  const descriptor = descriptors.find((candidate) => candidate.target === target)
  if (!descriptor) {
    throw new SearchIndexAdministrationError(
      'SEARCH_INDEX_TARGET_UNKNOWN',
      `Unknown Search index target: ${target}`
    )
  }
  return [descriptor]
}

export function resolveExactSearchIndexDescriptor(
  descriptors: readonly SearchIndexDescriptor[],
  target: string
): SearchIndexDescriptor {
  const resolved = resolveSearchIndexDescriptors(descriptors, target)
  if (resolved.length !== 1) {
    throw new SearchIndexAdministrationError(
      'SEARCH_INDEX_CLEANUP_POLICY_INVALID',
      'Search index mutation requires one exact index target'
    )
  }
  const descriptor = resolved[0]
  if (!descriptor) {
    throw new SearchIndexAdministrationError(
      'SEARCH_INDEX_TARGET_UNKNOWN',
      `Unknown Search index target: ${target}`
    )
  }
  return descriptor
}

export function normalizeSearchIndexCleanupPolicy(
  input: {
    retainRetired?: number
    olderThanHours?: number
  },
  now: Date
): SearchIndexCleanupPolicy {
  const retainRetired = input.retainRetired ?? 2
  const olderThanHours = input.olderThanHours ?? 24
  if (
    !Number.isSafeInteger(retainRetired) ||
    retainRetired < 1 ||
    retainRetired > 20 ||
    !Number.isSafeInteger(olderThanHours) ||
    olderThanHours < 1 ||
    olderThanHours > 24 * 365
  ) {
    throw new SearchIndexAdministrationError(
      'SEARCH_INDEX_CLEANUP_POLICY_INVALID',
      'Search cleanup retain must be 1-20 and older-than-hours must be 1-8760'
    )
  }

  return {
    retainRetired,
    olderThanHours,
    cutoff: new Date(now.getTime() - olderThanHours * 60 * 60 * 1000),
  }
}

export function buildSearchIndexCleanupCandidates(
  inventories: readonly SearchIndexInventory[],
  policy: SearchIndexCleanupPolicy
): SearchIndexCleanupCandidate[] {
  const candidates: SearchIndexCleanupCandidate[] = []
  for (const inventory of inventories) {
    const retiredAliasFree = inventory.generations
      .filter(
        (generation) =>
          !generation.active && generation.aliases.length === 0 && generation.createdAt !== null
      )
      .sort(compareNewestFirst)

    for (const generation of retiredAliasFree.slice(policy.retainRetired)) {
      const createdAt = generation.createdAt
      if (createdAt && Date.parse(createdAt) <= policy.cutoff.getTime()) {
        candidates.push({
          target: inventory.target,
          aliasName: inventory.aliasName,
          indexName: generation.indexName,
          documentCount: generation.documentCount,
          createdAt,
        })
      }
    }
  }
  return candidates
}

export function buildSearchIndexCleanupPlanTokenPayload(input: {
  policy: Pick<SearchIndexCleanupPolicy, 'retainRetired' | 'olderThanHours'>
  inventories: readonly SearchIndexInventory[]
  candidates: readonly SearchIndexCleanupCandidate[]
}): unknown {
  return {
    version: 1,
    retainRetired: input.policy.retainRetired,
    olderThanHours: input.policy.olderThanHours,
    inventories: [...input.inventories]
      .sort((left, right) => left.target.localeCompare(right.target))
      .map((inventory) => ({
        target: inventory.target,
        aliasName: inventory.aliasName,
        activeIndexNames: [...inventory.activeIndexNames].sort(),
        generations: [...inventory.generations]
          .sort((left, right) => left.indexName.localeCompare(right.indexName))
          .map((generation) => ({
            indexName: generation.indexName,
            active: generation.active,
            writeIndex: generation.writeIndex,
            aliases: [...generation.aliases].sort(),
            documentCount: generation.documentCount,
            createdAt: generation.createdAt,
          })),
      })),
    candidates: [...input.candidates]
      .sort((left, right) => left.indexName.localeCompare(right.indexName))
      .map((candidate) => ({
        target: candidate.target,
        aliasName: candidate.aliasName,
        indexName: candidate.indexName,
        documentCount: candidate.documentCount,
        createdAt: candidate.createdAt,
      })),
  }
}

export function assertSearchIndexCleanupApplyPolicy(input: {
  reason?: string
  confirmation?: string
}): void {
  validateOperationalReason(input.reason)
  if (input.confirmation !== SEARCH_INDEX_CLEANUP_CONFIRMATION) {
    throw new SearchIndexAdministrationError(
      'SEARCH_INDEX_CLEANUP_CONFIRMATION_REQUIRED',
      `Search cleanup requires exact confirmation ${SEARCH_INDEX_CLEANUP_CONFIRMATION}`
    )
  }
}

export function assertSearchIndexRollbackApplyPolicy(input: {
  reason?: string
  confirmation?: string
  allowUnverifiedRollbackApply: boolean
}): void {
  validateOperationalReason(input.reason)
  if (input.confirmation !== SEARCH_INDEX_ROLLBACK_CONFIRMATION) {
    throw new SearchIndexAdministrationError(
      'SEARCH_INDEX_ROLLBACK_CONFIRMATION_REQUIRED',
      `Search rollback requires exact confirmation ${SEARCH_INDEX_ROLLBACK_CONFIRMATION}`
    )
  }
  if (!input.allowUnverifiedRollbackApply) {
    throw new SearchIndexAdministrationError(
      'SEARCH_INDEX_ROLLBACK_ELIGIBILITY_UNPROVEN',
      'Search rollback apply is gated until durable catch-up and reconciliation eligibility is proven'
    )
  }
}

export function buildSearchIndexRollbackPlan(
  descriptor: SearchIndexDescriptor,
  inventory: SearchIndexInventory,
  input: {
    expectedCurrentIndexName: string
    rollbackIndexName: string
    allowEmpty?: boolean
  }
): SearchIndexRollbackPlanData {
  if (
    inventory.activeIndexNames.length !== 1 ||
    inventory.activeIndexNames[0] !== input.expectedCurrentIndexName
  ) {
    throw new SearchIndexAdministrationError(
      'SEARCH_INDEX_ROLLBACK_CURRENT_MISMATCH',
      'Search rollback current index confirmation does not match the active alias'
    )
  }

  const current = inventory.generations.find(
    (generation) => generation.indexName === input.expectedCurrentIndexName
  )
  const rollback = inventory.generations.find(
    (generation) => generation.indexName === input.rollbackIndexName
  )
  if (
    !current ||
    !current.active ||
    !rollback ||
    rollback.active ||
    rollback.aliases.length > 0
  ) {
    throw new SearchIndexAdministrationError(
      'SEARCH_INDEX_ROLLBACK_TARGET_INVALID',
      'Search rollback target must be an existing alias-free retired generation'
    )
  }
  if (current.documentCount > 0 && rollback.documentCount === 0 && input.allowEmpty !== true) {
    throw new SearchIndexAdministrationError(
      'SEARCH_INDEX_ROLLBACK_EMPTY_TARGET',
      'Search rollback to an empty generation requires explicit allow-empty approval'
    )
  }

  return {
    target: descriptor.target,
    aliasName: descriptor.aliasName,
    previousIndexName: current.indexName,
    rollbackIndexName: rollback.indexName,
    previousDocumentCount: current.documentCount,
    rollbackDocumentCount: rollback.documentCount,
  }
}

function validateOperationalReason(reason: string | undefined): void {
  const normalized = reason?.trim() ?? ''
  if (normalized.length < 10 || normalized.length > 500) {
    throw new SearchIndexAdministrationError(
      'SEARCH_INDEX_CLEANUP_POLICY_INVALID',
      'Search index operation reason must contain 10 to 500 characters'
    )
  }
}
