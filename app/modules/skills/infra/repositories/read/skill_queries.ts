import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  SKILL_DISPLAY_TYPES,
  SKILL_RUBRIC_VERSION_STATUSES,
} from '#modules/skills/constants/skill_constants'
import Skill from '#modules/skills/infra/models/skill'

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

export const findActiveByName = async (
  name: string,
  trx?: TransactionClientContract
): Promise<Skill | null> => {
  const query = trx ? Skill.query({ client: trx }) : Skill.query()
  return query
    .whereRaw('LOWER(skill_name) = ?', [name.trim().toLowerCase()])
    .where('is_active', true)
    .first()
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
  trx?: TransactionClientContract
): Promise<Skill> => {
  if (trx) {
    return Skill.create(payload, { client: trx })
  }

  return Skill.create(payload)
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
