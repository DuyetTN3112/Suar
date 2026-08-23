import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'

/** Guards projection assembly against dangling persisted catalog references. */
export function assertUserSkillCatalogFactsComplete(
  userId: string,
  persistedSkillIds: readonly string[],
  catalogFactIds: readonly string[]
): void {
  const catalogIds = new Set(catalogFactIds)
  const missingSkillIds = new Set(
    persistedSkillIds.filter((skillId) => !catalogIds.has(skillId))
  )

  if (missingSkillIds.size === 0) {
    return
  }

  throw new PersistedDataIntegrityException(
    'Persisted user skills reference catalog facts that are unavailable',
    {
      table: 'user_skills',
      relation: 'skills',
      record_scope: 'user',
      record_id: userId,
      expected_fact_count: new Set(persistedSkillIds).size,
      actual_fact_count: catalogIds.size,
      missing_fact_count: missingSkillIds.size,
      reason: 'missing_catalog_fact',
    }
  )
}
