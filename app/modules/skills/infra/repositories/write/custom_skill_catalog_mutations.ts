import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import Skill from '#modules/skills/infra/models/skill'

interface MaxSortOrderRow {
  max_sort_order: string | number | null
}

const CUSTOM_SKILL_CATALOG_MUTATION_LOCK = 'suar.skills.user_declared_catalog.mutation.v1'

export const lockCustomSkillCatalogMutation = async (
  trx: TransactionClientContract
): Promise<void> => {
  // PostgreSQL-specific by design. A hash collision can only add harmless serialization;
  // the stable namespace keeps the lock target explicit and independent of user input.
  await trx.rawQuery('SELECT pg_advisory_xact_lock(hashtext(?))', [
    CUSTOM_SKILL_CATALOG_MUTATION_LOCK,
  ])
}

export const reactivateCustomSkill = async (
  skill: Skill,
  payload: {
    skill_name: string
    category_code: string
    display_type: string
  },
  trx: TransactionClientContract
): Promise<Skill> => {
  skill.useTransaction(trx)
  skill.merge({
    ...payload,
    is_active: true,
  })
  await skill.save()
  return skill
}

export const nextCustomSkillSortOrder = async (
  trx: TransactionClientContract
): Promise<number> => {
  const maxSortRow = (await trx
    .from('skills')
    .max('sort_order as max_sort_order')
    .first()) as MaxSortOrderRow | undefined
  const maxSortOrder = Number(maxSortRow?.max_sort_order ?? 0)
  return Number.isFinite(maxSortOrder) ? maxSortOrder + 1 : 0
}

export const createCustomSkill = async (
  payload: {
    id: string
    skill_code: string
    skill_name: string
    category_code: string
    display_type: string
    description: string | null
    icon_url: string | null
    is_active: boolean
    sort_order: number
  },
  trx: TransactionClientContract
): Promise<Skill> => {
  return Skill.create(payload, { client: trx })
}
