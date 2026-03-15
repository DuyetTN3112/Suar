import db from '@adonisjs/lucid/services/db'

import { isRecord } from './shared.js'
import type {
  TopReviewedSkillRow,
  UserCreatedAtRow,
  UserSkillAggregationRow,
} from './types.js'

export const findUserSkillsForAggregation = async (
  userId: string
): Promise<UserSkillAggregationRow[]> => {
  return db
    .from('user_skills as us')
    .where('us.user_id', userId)
    .select('us.avg_percentage', 'us.total_reviews')
}

export const findTopReviewedSkills = async (
  userId: string,
  limit = 2
): Promise<TopReviewedSkillRow[]> => {
  return db
    .from('user_skills as us')
    .where('us.user_id', userId)
    .whereNotNull('us.avg_percentage')
    .orderBy('us.total_reviews', 'desc')
    .orderBy('us.avg_percentage', 'desc')
    .limit(limit)
    .select(
      'us.skill_id',
      'us.verified_public_proficiency_code',
      'us.avg_percentage',
      'us.total_reviews'
    )
}

export const findUserCreatedAt = async (userId: string): Promise<UserCreatedAtRow | null> => {
  const rowRaw = (await db
    .from('users')
    .where('id', userId)
    .select('created_at')
    .first()) as unknown

  if (!isRecord(rowRaw)) {
    return null
  }

  const createdAtValue = rowRaw['created_at']
  if (createdAtValue instanceof Date) {
    return { created_at: createdAtValue }
  }

  if (typeof createdAtValue === 'string') {
    const parsed = new Date(createdAtValue)
    if (!Number.isNaN(parsed.getTime())) {
      return { created_at: parsed }
    }
  }

  return null
}
