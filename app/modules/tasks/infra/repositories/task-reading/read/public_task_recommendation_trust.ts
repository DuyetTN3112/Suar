import { DateTime } from 'luxon'

import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'

export function parsePersistedTaskRecommendationTrustData(
  value: unknown,
  userId: string
): Record<string, unknown> {
  if (value === null || value === undefined) {
    return {}
  }

  let parsed: unknown = value
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value) as unknown
    } catch {
      throw new PersistedDataIntegrityException(
        'Persisted task recommendation trust data contains malformed JSON',
        {
          table: 'users',
          field: 'trust_data',
          record_id: userId,
          reason: 'invalid_json',
        }
      )
    }
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new PersistedDataIntegrityException(
      'Persisted task recommendation trust data has an invalid shape',
      {
        table: 'users',
        field: 'trust_data',
        record_id: userId,
        reason: 'unexpected_shape',
      }
    )
  }

  const record = parsed as Record<string, unknown>
  const calculatedScore = record['calculated_score']
  if (
    calculatedScore !== undefined &&
    (typeof calculatedScore !== 'number' || !Number.isFinite(calculatedScore))
  ) {
    throw new PersistedDataIntegrityException(
      'Persisted task recommendation trust score has an invalid type',
      {
        table: 'users',
        field: 'trust_data.calculated_score',
        record_id: userId,
        reason: 'invalid_calculated_score',
      }
    )
  }
  return record
}

export function toDateMillis(value: unknown): number {
  if (value instanceof Date) {
    return value.getTime()
  }

  if (typeof value === 'object' && value !== null && 'toMillis' in value) {
    return (value as { toMillis: () => number }).toMillis()
  }

  if (typeof value === 'string') {
    return new Date(value).getTime()
  }

  return 0
}

export function currentSqlTimestamp(): string {
  return DateTime.now().toSQL()
}
