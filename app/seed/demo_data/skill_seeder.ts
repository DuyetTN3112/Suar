import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { SeedRuntime } from './seed_runtime.js'
import { findRow } from './seed_utils.js'

export async function seedSkills(
  runtime: SeedRuntime,
  trx: TransactionClientContract
): Promise<Record<string, string>> {
  const skillSpecs = [
    ['typescript', 'TypeScript', 'technical'],
    ['svelte', 'Svelte', 'technical'],
    ['postgresql', 'PostgreSQL', 'technical'],
    ['mongodb', 'MongoDB', 'technical'],
    ['devops', 'DevOps', 'technical'],
    ['testing', 'Testing & QA', 'delivery'],
    ['code_review', 'Code Review', 'delivery'],
    ['communication', 'Communication', 'soft_skill'],
    ['problem_solving', 'Problem Solving', 'soft_skill'],
    ['leadership', 'Leadership', 'soft_skill'],
  ] as const

  const result: Record<string, string> = {}

  for (const [code, name, category] of skillSpecs) {
    const existing = await findRow(trx, 'skills', { skill_code: code })
    const id = existing?.id ?? runtime.uuid()
    const payload = {
      category_code: category,
      display_type: 'spider_chart',
      skill_code: code,
      skill_name: name,
      description: `${name} - seeded demo skill for UI verification`,
      icon_url: `https://cdn.suar.local/skills/${code}.svg`,
      is_active: true,
      sort_order: Object.keys(result).length,
      created_at: runtime.isoDaysAgo(90),
      updated_at: runtime.isoDaysAgo(1),
    }

    if (existing) {
      await trx.from('skills').where('id', id).update(payload)
    } else {
      await trx
        .insertQuery()
        .table('skills')
        .insert({ id, ...payload })
    }

    result[code] = id
  }

  return result
}
