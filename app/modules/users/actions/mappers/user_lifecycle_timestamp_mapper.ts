import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'

/** Maps a persisted lifecycle value into the canonical application event timestamp. */
export function serializeUserLifecycleTimestamp(
  value: string | { toISO(): string | null } | null | undefined,
  fieldName: 'created_at' | 'updated_at' | 'deleted_at'
): string {
  const raw = typeof value === 'string' ? value : value?.toISO()
  if (!raw) {
    throw new InvariantViolationException(
      `Persisted user is missing its ${fieldName} timestamp`
    )
  }

  const timestamp = new Date(raw)
  if (Number.isNaN(timestamp.getTime())) {
    throw new InvariantViolationException(
      `Persisted user has an invalid ${fieldName} timestamp`
    )
  }
  return timestamp.toISOString()
}
