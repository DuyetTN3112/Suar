import { testId } from '../test_utils.js'

import FlaggedReview from '#infra/reviews/models/flagged_review'
import ReverseReview from '#infra/reviews/models/reverse_review'
import ReviewSession from '#infra/reviews/models/review_session'
import SkillReview from '#infra/reviews/models/skill_review'
import Skill from '#infra/skills/models/skill'
import UserSkill from '#infra/users/models/user_skill'
import type { ReviewConfirmationEntry } from '#types/database'

export const SkillFactory = {
  async create(
    overrides: Partial<{
      id: string
      skill_code: string
      skill_name: string
      category_code: string
      display_type: string
      is_active: boolean
      sort_order: number
    }> = {}
  ): Promise<Skill> {
    const code = Math.random().toString(36).substring(2, 8)
    return Skill.create({
      id: overrides.id ?? testId(),
      skill_code: overrides.skill_code ?? `skill_${code}`,
      skill_name: overrides.skill_name ?? `Test Skill ${code}`,
      category_code: overrides.category_code ?? 'technical',
      display_type: overrides.display_type ?? 'spider_chart',
      is_active: overrides.is_active ?? true,
      sort_order: overrides.sort_order ?? 0,
    })
  },
}

export const ReviewSessionFactory = {
  async create(
    overrides: Partial<{
      id: string
      task_assignment_id: string
      reviewee_id: string
      status: 'pending' | 'in_progress' | 'completed' | 'disputed'
      manager_review_completed: boolean
      peer_reviews_count: number
      required_peer_reviews: number
      confirmations: ReviewConfirmationEntry[] | null
    }> = {}
  ): Promise<ReviewSession> {
    return ReviewSession.create({
      id: overrides.id ?? testId(),
      task_assignment_id: overrides.task_assignment_id ?? testId(),
      reviewee_id: overrides.reviewee_id ?? testId(),
      status: overrides.status ?? 'pending',
      manager_review_completed: overrides.manager_review_completed ?? false,
      peer_reviews_count: overrides.peer_reviews_count ?? 0,
      required_peer_reviews: overrides.required_peer_reviews ?? 2,
      confirmations: overrides.confirmations ?? null,
    })
  },
}

export const SkillReviewFactory = {
  async create(
    overrides: Partial<{
      id: string
      review_session_id: string
      reviewer_id: string
      reviewer_type: 'manager' | 'peer'
      skill_id: string
      assigned_level_code: string
      comment: string | null
    }> = {}
  ): Promise<SkillReview> {
    return SkillReview.create({
      id: overrides.id ?? testId(),
      review_session_id: overrides.review_session_id ?? testId(),
      reviewer_id: overrides.reviewer_id ?? testId(),
      reviewer_type: overrides.reviewer_type ?? 'peer',
      skill_id: overrides.skill_id ?? testId(),
      assigned_level_code: overrides.assigned_level_code ?? 'middle',
      comment: overrides.comment ?? null,
    })
  },
}

export const UserSkillFactory = {
  async create(
    overrides: Partial<{
      id: string
      user_id: string
      skill_id: string
      level_code: string
      total_reviews: number
      avg_score: number | null
      avg_percentage: number | null
    }> = {}
  ): Promise<UserSkill> {
    return UserSkill.create({
      id: overrides.id ?? testId(),
      user_id: overrides.user_id ?? testId(),
      skill_id: overrides.skill_id ?? testId(),
      level_code: overrides.level_code ?? 'middle',
      total_reviews: overrides.total_reviews ?? 0,
      avg_score: overrides.avg_score ?? null,
      avg_percentage: overrides.avg_percentage ?? null,
    })
  },
}

export const FlaggedReviewFactory = {
  async create(
    overrides: Partial<{
      id: string
      skill_review_id: string
      flag_type: string
      severity: string
      status: 'pending' | 'reviewed' | 'dismissed' | 'confirmed'
      notes: string | null
    }> = {}
  ): Promise<FlaggedReview> {
    return FlaggedReview.create({
      id: overrides.id ?? testId(),
      skill_review_id: overrides.skill_review_id ?? testId(),
      flag_type: overrides.flag_type ?? 'bulk_same_level',
      severity: overrides.severity ?? 'medium',
      status: overrides.status ?? 'pending',
      notes: overrides.notes ?? null,
    })
  },
}

export const ReverseReviewFactory = {
  async create(
    overrides: Partial<{
      id: string
      review_session_id: string
      reviewer_id: string
      target_type: 'organization' | 'project' | 'manager' | 'peer'
      target_id: string
      rating: number
      comment: string | null
      is_anonymous: boolean
    }> = {}
  ): Promise<ReverseReview> {
    return ReverseReview.create({
      id: overrides.id ?? testId(),
      review_session_id: overrides.review_session_id ?? testId(),
      reviewer_id: overrides.reviewer_id ?? testId(),
      target_type: overrides.target_type ?? 'peer',
      target_id: overrides.target_id ?? testId(),
      rating: overrides.rating ?? 4,
      comment: overrides.comment ?? null,
      is_anonymous: overrides.is_anonymous ?? false,
    })
  },
}
