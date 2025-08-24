import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import Skill from '#modules/skills/infra/models/skill'

export const activeSkills = () => {
  return Skill.query().where('is_active', true).orderBy('sort_order', 'asc')
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
    .where('display_type', 'spider_chart')
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

export const findByIds = async (
  ids: string[],
  trx?: TransactionClientContract
): Promise<Skill[]> => {
  if (ids.length === 0) return []
  const query = trx ? Skill.query({ client: trx }) : Skill.query()
  return query.whereIn('id', ids)
}
