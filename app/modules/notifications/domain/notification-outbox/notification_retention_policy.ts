export const NOTIFICATION_STANDARD_RETENTION_CLASS = 'notification_standard_180d'
export const NOTIFICATION_STANDARD_RETENTION_MS = 180 * 24 * 60 * 60 * 1_000
export const NOTIFICATION_PROCESSED_WORK_RETENTION_MS = 30 * 24 * 60 * 60 * 1_000
export const NOTIFICATION_TOMBSTONE_RETENTION_MS = 90 * 24 * 60 * 60 * 1_000
export const NOTIFICATION_RETIRED_INDEX_GRACE_MS = 24 * 60 * 60 * 1_000

export function notificationRetentionDeadline(
  retentionClass: string,
  occurredAt: Date | string
): Date {
  if (retentionClass !== NOTIFICATION_STANDARD_RETENTION_CLASS) {
    throw new RangeError(`Unsupported notification retention class: ${retentionClass}`)
  }
  const occurrence = occurredAt instanceof Date ? occurredAt : new Date(occurredAt)
  if (Number.isNaN(occurrence.getTime())) {
    throw new RangeError('Notification retention occurrence must be a valid timestamp')
  }
  return new Date(occurrence.getTime() + NOTIFICATION_STANDARD_RETENTION_MS)
}
