import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import Skill from '#modules/skills/infra/models/skill-catalog/skill'
import {
  SKILL_DISPLAY_TYPES,
  SKILL_RUBRIC_VERSION_STATUSES,
} from '#modules/skills/public_contracts/skill_constants'

export const activeSkills = () => {
  return Skill.query().where('is_active', true).orderBy('sort_order', 'asc')
}

export const activeSkillsWithPublishedRubrics = () => {
  return activeSkills().preload('rubric_versions', (query) => {
    void query.where('status', SKILL_RUBRIC_VERSION_STATUSES.PUBLISHED).orderBy('version', 'desc')
  })
}

export const searchActiveSkillsWithPublishedRubrics = (keyword: string, limit?: number) => {
  const query = activeSkillsWithPublishedRubrics().where((builder) => {
    const term = `%${keyword.trim()}%`
    void builder
      .whereILike('skill_name', term)
      .orWhereILike('skill_code', term)
      .orWhereILike('description', term)
  })

  if (limit && limit > 0) {
    void query.limit(limit)
  }

  return query
}

export const byCategory = (categoryCode: string) => {
  return Skill.query()
    .where('category_code', categoryCode)
    .where('is_active', true)
    .orderBy('sort_order', 'asc')
}

export const findActiveSkillIdsByCategoryCodes = async (
  categoryCodes: string[]
): Promise<{ id: string }[]> => {
  if (categoryCodes.length === 0) return []

  const skills = await Skill.query()
    .where('is_active', true)
    .whereIn('category_code', categoryCodes)
    .select('id')

  return skills.map((skill) => ({ id: skill.id }))
}

export const findSkillIdsByCategoryCodes = async (
  categoryCodes: string[]
): Promise<{ id: string }[]> => {
  if (categoryCodes.length === 0) return []

  const skills = await Skill.query().whereIn('category_code', categoryCodes).select('id')
  return skills.map((skill) => ({ id: skill.id }))
}

export const getSpiderChartSkillIds = async (
  trx?: TransactionClientContract
): Promise<{ id: string }[]> => {
  const query = trx ? Skill.query({ client: trx }) : Skill.query()
  const skills = await query
    .where('display_type', SKILL_DISPLAY_TYPES.SPIDER_CHART)
    .where('is_active', true)
    .select('id')

  return skills.map((skill) => ({ id: skill.id }))
}

export const findActiveByIds = async (
  ids: string[],
  trx?: TransactionClientContract
): Promise<Skill[]> => {
  if (ids.length === 0) return []
  const query = trx ? Skill.query({ client: trx }) : Skill.query()
  return query.whereIn('id', ids).where('is_active', true)
}

export const findActiveByNormalizedName = async (
  name: string,
  trx?: TransactionClientContract
): Promise<Skill | null> => {
  const query = trx ? Skill.query({ client: trx }) : Skill.query()
  return query
    .whereRaw('LOWER(skill_name) = ?', [name.trim().toLowerCase()])
    .where('is_active', true)
    .orderBy('created_at', 'asc')
    .orderBy('id', 'asc')
    .first()
}

export const findInactiveByNormalizedName = async (
  name: string,
  trx?: TransactionClientContract
): Promise<Skill[]> => {
  const query = trx ? Skill.query({ client: trx }) : Skill.query()
  return query
    .whereRaw('LOWER(skill_name) = ?', [name.trim().toLowerCase()])
    .where('is_active', false)
    .orderBy('created_at', 'asc')
    .orderBy('id', 'asc')
}

export const findByCode = async (
  skillCode: string,
  trx?: TransactionClientContract
): Promise<Skill | null> => {
  const query = trx ? Skill.query({ client: trx }) : Skill.query()
  return query.where('skill_code', skillCode).first()
}

export const findByIds = async (
  ids: string[],
  trx?: TransactionClientContract
): Promise<Skill[]> => {
  if (ids.length === 0) return []
  const query = trx ? Skill.query({ client: trx }) : Skill.query()
  return query.whereIn('id', ids)
}

export const findActiveByIdsWithPublishedRubrics = async (
  ids: string[],
  trx?: TransactionClientContract
): Promise<Skill[]> => {
  if (ids.length === 0) return []

  const query = trx ? Skill.query({ client: trx }) : Skill.query()
  return query
    .whereIn('id', ids)
    .where('is_active', true)
    .preload('rubric_versions', (rubricQuery) => {
      void rubricQuery
        .where('status', SKILL_RUBRIC_VERSION_STATUSES.PUBLISHED)
        .orderBy('version', 'desc')
    })
}
