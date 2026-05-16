export const ERROR_EVENT_RETENTION_BATCH_LIMIT = 1_000
export const ERROR_EVENT_RETENTION_COUNT_CAP = 10_001

const DAY_MS = 24 * 60 * 60 * 1_000

export function resolveErrorEventRetentionCutoff(now: Date, retentionDays: number): Date {
  if (Number.isNaN(now.getTime())) {
    throw new RangeError('Error-event retention now must be a valid date')
  }
  if (!Number.isSafeInteger(retentionDays) || retentionDays < 1 || retentionDays > 365) {
    throw new RangeError('Error-event retention days must be between 1 and 365')
  }
  return new Date(now.getTime() - retentionDays * DAY_MS)
}

export function requireErrorEventRetentionBatchSize(batchSize: number): void {
  if (
    !Number.isSafeInteger(batchSize) ||
    batchSize < 1 ||
    batchSize > ERROR_EVENT_RETENTION_BATCH_LIMIT
  ) {
    throw new RangeError(
      `Error-event retention batchSize must be between 1 and ${String(
        ERROR_EVENT_RETENTION_BATCH_LIMIT
      )}`
    )
  }
}

export function normalizeErrorEventRetentionReason(reason: string): string {
  const normalized = reason.trim()
  if (normalized.length < 10 || normalized.length > 500) {
    throw new RangeError('Error-event retention reason must contain 10-500 characters')
  }
  return normalized
}

export function requireErrorEventRetentionConfirmation(confirmation: string): void {
  if (confirmation !== 'PURGE') {
    throw new RangeError('Error-event retention confirmation must be PURGE')
  }
}

export function summarizeErrorEventRetentionDueCount(boundedCount: number): {
  dueCount: number
  countCapped: boolean
} {
  return {
    dueCount: Math.min(boundedCount, ERROR_EVENT_RETENTION_COUNT_CAP - 1),
    countCapped: boundedCount >= ERROR_EVENT_RETENTION_COUNT_CAP,
  }
}
