import db from '@adonisjs/lucid/services/db'
import type { DatabaseId } from '#types/database'
import type {
  FeaturedSkillReviewRow,
  TaskAssignmentMetricsRow,
  TopReviewedSkillRow,
  UserCreatedAtRow,
  UserSkillAggregationRow,
} from './types.js'
import {
  isRecord,
  toNullableDatabaseId,
  toNullableNumber,
  toNullableString,
} from './shared.js'

export const findTaskAssignmentsForMetrics = async (
  userId: DatabaseId
): Promise<TaskAssignmentMetricsRow[]> => {
  return db
    .from('task_assignments as ta')
    .join('tasks as t', 't.id', 'ta.task_id')
    .where('ta.assignee_id', userId)
    .whereNull('t.deleted_at')
    .select(
      'ta.id',
      'ta.task_id',
      'ta.assignee_id',
      'ta.assignment_status',
      'ta.estimated_hours',
      'ta.actual_hours',
      'ta.assigned_at',
      'ta.completed_at',
      't.due_date as task_due_date'
    )
}

export const findUserSkillsForAggregation = async (
  userId: DatabaseId
): Promise<UserSkillAggregationRow[]> => {
  return db
    .from('user_skills as us')
    .join('skills as s', 's.id', 'us.skill_id')
    .where('us.user_id', userId)
    .select(
      's.id as skill_id',
      's.skill_name',
      'us.level_code',
      'us.avg_percentage',
      'us.total_reviews',
      's.category_code'
    )
}

export const findTopReviewedSkills = async (
  userId: DatabaseId,
  limit: number = 2
): Promise<TopReviewedSkillRow[]> => {
  return db
    .from('user_skills as us')
    .join('skills as s', 's.id', 'us.skill_id')
    .where('us.user_id', userId)
    .whereNotNull('us.avg_percentage')
    .orderBy('us.total_reviews', 'desc')
    .orderBy('us.avg_percentage', 'desc')
    .limit(limit)
    .select('us.skill_id', 's.skill_name', 'us.level_code', 'us.avg_percentage', 'us.total_reviews')
}

export const findReviewForSkill = async (
  revieweeId: DatabaseId,
  skillId: DatabaseId
): Promise<FeaturedSkillReviewRow | null> => {
  const reviewRaw = (await db
    .from('skill_reviews as sr')
    .join('review_sessions as rs', 'rs.id', 'sr.review_session_id')
    .leftJoin('task_assignments as ta', 'ta.id', 'rs.task_assignment_id')
    .join('users as reviewer', 'reviewer.id', 'sr.reviewer_id')
    .where('rs.reviewee_id', revieweeId)
    .where('sr.skill_id', skillId)
    .orderBy('sr.created_at', 'desc')
    .select(
      'reviewer.username as reviewer_name',
      'sr.reviewer_type as reviewer_role',
      'rs.overall_quality_score as rating',
      'sr.comment',
      'ta.task_id'
    )
    .first()) as unknown

  if (!isRecord(reviewRaw)) {
    return null
  }

  return {
    reviewer_name: toNullableString(reviewRaw.reviewer_name),
    reviewer_role: toNullableString(reviewRaw.reviewer_role),
    rating: toNullableNumber(reviewRaw.rating),
    comment: toNullableString(reviewRaw.comment),
    task_id: toNullableDatabaseId(reviewRaw.task_id),
  }
}

export const findTaskTitleById = async (taskId: DatabaseId): Promise<string | null> => {
  const taskRaw = (await db.from('tasks').where('id', taskId).select('title').first()) as unknown

  if (!isRecord(taskRaw)) {
    return null
  }

  return toNullableString(taskRaw.title)
}

export const findUserCreatedAt = async (
  userId: DatabaseId
): Promise<UserCreatedAtRow | null> => {
  const rowRaw = (await db.from('users').where('id', userId).select('created_at').first()) as unknown

  if (!isRecord(rowRaw)) {
    return null
  }

  const createdAtValue = rowRaw.created_at
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
