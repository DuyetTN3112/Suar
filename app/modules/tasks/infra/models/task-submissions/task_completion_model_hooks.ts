import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'

// Shared Lucid column hooks keep the append-only completion records consistent.

export function prepareTaskCompletionJsonColumn(value: unknown): unknown {
  if (value === null || value === undefined || typeof value === 'string') {
    return value
  }
  return JSON.stringify(value)
}

export function consumeTaskCompletionJsonColumn<T>(value: unknown): T {
  if (typeof value !== 'string') {
    return value as T
  }
  try {
    return JSON.parse(value) as T
  } catch {
    return value as T
  }
}

export function rejectTaskCompletionRecordMutation(recordName: string): never {
  throw new InvariantViolationException(
    `${recordName} records are immutable; create a correction revision instead`
  )
}
