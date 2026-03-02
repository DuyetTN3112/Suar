import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'
import type { UserTalentExplainabilityProjectionV1 } from '#modules/users/types/user_profile_data'

export interface TalentExplainabilitySummary {
  reviewedSkillsCount: number
  importedSkillsCount: number
  underDisputeSkillsCount: number
  latestConfidenceSignal: 'low' | 'medium' | 'high' | null
}

function projectionCorruption(
  userId: string,
  reason:
    | 'invalid_json'
    | 'unexpected_trust_data_shape'
    | 'unexpected_projection_shape'
    | 'invalid_projection_contract'
): PersistedDataIntegrityException {
  return new PersistedDataIntegrityException(
    'Persisted talent explainability data violates its storage contract',
    {
      table: 'users',
      field: 'trust_data.talent_explainability_v1',
      record_id: userId,
      reason,
    }
  )
}

export function readTalentExplainabilityProjection(
  value: unknown,
  userId: string
): UserTalentExplainabilityProjectionV1 | null {
  if (value === null || value === undefined) return null

  let trustData: unknown = value
  if (typeof value === 'string') {
    try {
      trustData = JSON.parse(value) as unknown
    } catch {
      throw projectionCorruption(userId, 'invalid_json')
    }
  }

  if (typeof trustData !== 'object' || trustData === null || Array.isArray(trustData)) {
    throw projectionCorruption(userId, 'unexpected_trust_data_shape')
  }

  const projection = (trustData as Record<string, unknown>)['talent_explainability_v1']
  if (projection === undefined || projection === null) return null
  if (typeof projection !== 'object' || Array.isArray(projection)) {
    throw projectionCorruption(userId, 'unexpected_projection_shape')
  }

  const record = projection as Record<string, unknown>
  const confidence = record['latest_confidence_signal']
  if (
    record['contract_version'] !== 1 ||
    !Number.isSafeInteger(record['under_dispute_skills_count']) ||
    (record['under_dispute_skills_count'] as number) < 0 ||
    (confidence !== null &&
      confidence !== 'low' &&
      confidence !== 'medium' &&
      confidence !== 'high') ||
    typeof record['source_revision'] !== 'string' ||
    !/^\d+$/.test(record['source_revision']) ||
    typeof record['projected_at'] !== 'string' ||
    Number.isNaN(Date.parse(record['projected_at']))
  ) {
    throw projectionCorruption(userId, 'invalid_projection_contract')
  }

  return record as unknown as UserTalentExplainabilityProjectionV1
}
