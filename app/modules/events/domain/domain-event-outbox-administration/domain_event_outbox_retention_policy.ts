export const DOMAIN_EVENT_OUTBOX_RETENTION_BATCH_LIMIT = 1_000
export const DOMAIN_EVENT_OUTBOX_RETENTION_COUNT_CAP = 10_001

const MAX_RETENTION_DAYS = 3_650
const DAY_MS = 24 * 60 * 60 * 1_000

export function resolveDomainEventOutboxRetentionCutoffs(input: {
  now: Date
  processedRetentionDays: number
  replayHistoryRetentionDays: number
}): {
  processedBefore: Date
  replayHistoryBefore: Date
} {
  requireRetentionDays('processedRetentionDays', input.processedRetentionDays)
  requireRetentionDays('replayHistoryRetentionDays', input.replayHistoryRetentionDays)
  if (input.replayHistoryRetentionDays < input.processedRetentionDays) {
    throw new RangeError(
      'replayHistoryRetentionDays must be greater than or equal to processedRetentionDays'
    )
  }
  if (Number.isNaN(input.now.getTime())) {
    throw new RangeError('Domain event outbox retention time must be valid')
  }
  return {
    processedBefore: new Date(
      input.now.getTime() - input.processedRetentionDays * DAY_MS
    ),
    replayHistoryBefore: new Date(
      input.now.getTime() - input.replayHistoryRetentionDays * DAY_MS
    ),
  }
}

export function requireDomainEventOutboxRetentionMutation(input: {
  batchSize: number
  reason: string
  confirmation: string
}): { reason: string } {
  if (
    !Number.isSafeInteger(input.batchSize) ||
    input.batchSize < 1 ||
    input.batchSize > DOMAIN_EVENT_OUTBOX_RETENTION_BATCH_LIMIT
  ) {
    throw new RangeError(
      `batchSize must be between 1 and ${DOMAIN_EVENT_OUTBOX_RETENTION_BATCH_LIMIT}`
    )
  }
  const reason = input.reason.trim()
  if (reason.length < 10 || reason.length > 500) {
    throw new RangeError('reason must contain 10 to 500 characters')
  }
  if (input.confirmation !== 'PURGE') {
    throw new RangeError('confirmation must be PURGE')
  }
  return { reason }
}

export function summarizeDomainEventOutboxRetentionCounts(counts: {
  processedRows: number
  replayHistoryRows: number
}): {
  dueProcessedRows: number
  dueReplayHistoryRows: number
  processedCountCapped: boolean
  replayHistoryCountCapped: boolean
} {
  return {
    dueProcessedRows: Math.min(
      counts.processedRows,
      DOMAIN_EVENT_OUTBOX_RETENTION_COUNT_CAP - 1
    ),
    dueReplayHistoryRows: Math.min(
      counts.replayHistoryRows,
      DOMAIN_EVENT_OUTBOX_RETENTION_COUNT_CAP - 1
    ),
    processedCountCapped:
      counts.processedRows >= DOMAIN_EVENT_OUTBOX_RETENTION_COUNT_CAP,
    replayHistoryCountCapped:
      counts.replayHistoryRows >= DOMAIN_EVENT_OUTBOX_RETENTION_COUNT_CAP,
  }
}

function requireRetentionDays(name: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_RETENTION_DAYS) {
    throw new RangeError(`${name} must be between 1 and ${MAX_RETENTION_DAYS}`)
  }
}

