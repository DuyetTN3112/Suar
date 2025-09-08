import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { SeedRuntime } from './seed_runtime.js'
import { applyWhere, findRow } from './seed_utils.js'
import type { SeededUser, UserKey } from './types.js'
import { SEED_USER_SKILLS_SPECS } from './user_skills_specs.js'

export async function seedUserSkills(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  users: Record<UserKey, SeededUser>,
  skills: Record<string, string>
): Promise<void> {
  const rows = SEED_USER_SKILLS_SPECS

  for (const row of rows) {
    const skillId = runtime.requireValue(skills[row.skill], `user-skill:${row.skill}`)
    const where = {
      user_id: users[row.user].id,
      skill_id: skillId,
    }
    const existing = await findRow(trx, 'user_skills', where)
    const payload = {
      level_code: row.level,
      total_reviews: row.totalReviews,
      avg_score: Math.min(5, Math.round((row.avgPercentage / 20) * 100) / 100),
      last_reviewed_at: row.source === 'reviewed' ? runtime.isoDaysAgo(1) : null,
      avg_percentage: row.avgPercentage,
      last_calculated_at: runtime.isoDaysAgo(1),
      source: row.source,
      created_at: runtime.isoDaysAgo(40),
      updated_at: runtime.isoDaysAgo(1),
    }

    if (existing) {
      await applyWhere(trx.from('user_skills'), where).update(payload)
    } else {
      await trx
        .insertQuery()
        .table('user_skills')
        .insert({ id: runtime.uuid(), ...where, ...payload })
    }
  }
}
