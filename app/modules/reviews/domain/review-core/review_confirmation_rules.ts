import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type { ReviewConfirmationEntry } from '#modules/reviews/types/review_confirmation_entry'

function isReviewConfirmationEntry(value: unknown): value is ReviewConfirmationEntry {
  if (typeof value !== 'object' || value === null) return false

  const entry = value as Record<string, unknown>
  return (
    typeof entry['user_id'] === 'string' &&
    entry['user_id'].trim().length > 0 &&
    (entry['action'] === 'confirmed' || entry['action'] === 'disputed') &&
    typeof entry['created_at'] === 'string' &&
    !Number.isNaN(Date.parse(entry['created_at']))
  )
}

export function parseReviewConfirmations(value: unknown): ReviewConfirmationEntry[] {
  if (value === null || value === undefined) return []

  let parsed: unknown
  try {
    parsed = typeof value === 'string' ? (JSON.parse(value) as unknown) : value
  } catch (error) {
    throw new InvariantViolationException(
      'Review session contains malformed confirmation JSON',
      { cause: error }
    )
  }

  if (!Array.isArray(parsed) || !parsed.every(isReviewConfirmationEntry)) {
    throw new InvariantViolationException(
      'Review session contains malformed confirmation entries'
    )
  }

  return parsed
}

export function latestRevieweeConfirmationAction(
  confirmations: unknown,
  revieweeUserId: string
): 'confirmed' | 'disputed' | null {
  const matching = parseReviewConfirmations(confirmations)
    .filter((entry) => entry.user_id === revieweeUserId)
    .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))

  return matching[0]?.action ?? null
}
