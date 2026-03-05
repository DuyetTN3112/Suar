import { CACHE_MAX_KEY_BYTES } from '#modules/cache/public_contracts/cache_contract'
import type { CacheInvalidationOutboxReplaySelector } from '#modules/cache/public_contracts/cache_invalidation_outbox_types'

const utf8Encoder = new TextEncoder()

export type CacheInvalidationOutboxStatus = 'pending' | 'leased' | 'processed' | 'dead_letter'

export interface CacheInvalidationOutboxJob {
  id: string
  sequence: number
  sourceTable: string
  sourceOperation: 'INSERT' | 'UPDATE' | 'DELETE'
  sourcePrimaryKey: string
  patterns: unknown
  attemptCount: number
  leaseToken: string
  lockedUntil: Date
}

export interface CacheInvalidationOutboxClaimInput {
  workerId: string
  batchSize: number
  leaseDurationMs: number
  now: Date
}

export interface CacheInvalidationOutboxLeaseMutationInput {
  jobId: string
  leaseToken: string
  now: Date
}

export interface CacheInvalidationOutboxHeartbeatInput extends CacheInvalidationOutboxLeaseMutationInput {
  leaseDurationMs: number
}

export interface CacheInvalidationOutboxFailureInput extends CacheInvalidationOutboxLeaseMutationInput {
  errorClass: string
  errorMessage: string
}

export interface CacheInvalidationOutboxRetryInput extends CacheInvalidationOutboxFailureInput {
  availableAt: Date
}

export interface CacheInvalidationOutboxReplayRow {
  id: string
  sequence: number
  previousStatus: 'dead_letter'
}

export interface CacheInvalidationOutboxRepository {
  claimBatch(input: CacheInvalidationOutboxClaimInput): Promise<CacheInvalidationOutboxJob[]>
  heartbeat(input: CacheInvalidationOutboxHeartbeatInput): Promise<boolean>
  acknowledge(input: CacheInvalidationOutboxLeaseMutationInput): Promise<boolean>
  retry(input: CacheInvalidationOutboxRetryInput): Promise<boolean>
  deadLetter(input: CacheInvalidationOutboxFailureInput): Promise<boolean>
}

export interface CachePatternInvalidator {
  deleteByPattern(pattern: string): Promise<void>
}

export class InvalidCacheInvalidationPayloadError extends Error {}

const MAX_PATTERN_COUNT = 64
const MAX_REPLAY_BATCH = 100
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ERROR_CLASS_PATTERN = /^[A-Za-z0-9_.:-]{1,200}$/

function normalizeReplaySequence(value: number | undefined, name: string): number | undefined {
  if (value === undefined) {
    return undefined
  }
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive safe integer`)
  }
  return value
}

export function normalizeCacheInvalidationReplaySelector(
  selector: CacheInvalidationOutboxReplaySelector
): CacheInvalidationOutboxReplaySelector {
  if (selector.ids !== undefined && !Array.isArray(selector.ids)) {
    throw new RangeError(
      `Replay selector ids must be an array with at most ${MAX_REPLAY_BATCH} UUIDs`
    )
  }
  const ids =
    selector.ids === undefined
      ? undefined
      : [...new Set(selector.ids.map((id) => id.trim().toLowerCase()))]
  if (
    ids !== undefined &&
    (ids.length < 1 || ids.length > MAX_REPLAY_BATCH || ids.some((id) => !UUID_PATTERN.test(id)))
  ) {
    throw new RangeError(
      `Replay selector ids must contain between 1 and ${MAX_REPLAY_BATCH} valid UUIDs`
    )
  }

  const fromSequence = normalizeReplaySequence(selector.fromSequence, 'fromSequence')
  const toSequence = normalizeReplaySequence(selector.toSequence, 'toSequence')
  if ((fromSequence === undefined) !== (toSequence === undefined)) {
    throw new RangeError('Replay selector requires both fromSequence and toSequence')
  }
  if (
    fromSequence !== undefined &&
    toSequence !== undefined &&
    (fromSequence > toSequence || toSequence - fromSequence + 1 > MAX_REPLAY_BATCH)
  ) {
    throw new RangeError(
      `Replay sequence range must be ordered and contain at most ${MAX_REPLAY_BATCH} positions`
    )
  }
  if (ids === undefined && fromSequence === undefined) {
    throw new RangeError('Replay requires explicit ids or a bounded sequence range')
  }

  const errorClass = selector.errorClass?.trim()
  if (errorClass !== undefined && !ERROR_CLASS_PATTERN.test(errorClass)) {
    throw new RangeError('Replay errorClass must contain 1 to 200 safe characters')
  }

  return {
    ...(ids === undefined ? {} : { ids }),
    ...(fromSequence === undefined ? {} : { fromSequence }),
    ...(toSequence === undefined ? {} : { toSequence }),
    ...(errorClass === undefined ? {} : { errorClass }),
  }
}

export function normalizeCacheInvalidationReplayRequest(
  selector: CacheInvalidationOutboxReplaySelector,
  reason: string
): { selector: CacheInvalidationOutboxReplaySelector; reason: string } {
  const normalizedReason = reason.trim()
  if (normalizedReason.length < 10 || normalizedReason.length > 500) {
    throw new RangeError(
      'Cache invalidation outbox replay reason must contain 10 to 500 characters'
    )
  }

  return {
    selector: normalizeCacheInvalidationReplaySelector(selector),
    reason: normalizedReason,
  }
}

export function normalizeCacheInvalidationPatterns(value: unknown): string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_PATTERN_COUNT) {
    throw new InvalidCacheInvalidationPayloadError(
      `Cache invalidation patterns must contain between 1 and ${MAX_PATTERN_COUNT} entries`
    )
  }

  const normalized = new Set<string>()
  for (const candidate of value) {
    if (
      typeof candidate !== 'string' ||
      candidate.length === 0 ||
      candidate.includes('\0') ||
      utf8Encoder.encode(candidate).byteLength > CACHE_MAX_KEY_BYTES
    ) {
      throw new InvalidCacheInvalidationPayloadError(
        `Cache invalidation patterns must be non-empty strings up to ${CACHE_MAX_KEY_BYTES} UTF-8 bytes`
      )
    }
    if (candidate.startsWith('suar:cache:')) {
      throw new InvalidCacheInvalidationPayloadError(
        'Cache invalidation patterns must use logical keys, not the physical Redis prefix'
      )
    }
    normalized.add(candidate)
  }

  return [...normalized].sort()
}
