import type { DateTime } from 'luxon'

import { testId } from '../test_utils.js'

import FlaggedReview from '#modules/reviews/infra/models/flagged_review'
import ReverseReview from '#modules/reviews/infra/models/reverse_review'
import ReviewSession from '#modules/reviews/infra/models/review_session'
import ReviewSessionReviewerAssignment from '#modules/reviews/infra/models/review_session_reviewer_assignment'
import SkillReview from '#modules/reviews/infra/models/skill_review'
import type { ReviewConfirmationEntry } from '#modules/reviews/types/review_confirmation_entry'
import Skill from '#modules/skills/infra/models/skill'
import UserSkill from '#modules/users/infra/models/user_skill'

export const SkillFactory = {
  async create(
    overrides: Partial<{
      id: string
      skill_code: string
      skill_name: string
      category_code: string
      display_type: string
      description: string | null
      is_active: boolean
      sort_order: number
    }> = {}
  ): Promise<Skill> {
    const code = Math.random().toString(36).substring(2, 8)
    return Skill.create({
      id: overrides.id ?? testId(),
      skill_code: overrides.skill_code ?? `skill_${code}`,
      skill_name: overrides.skill_name ?? `Test Skill ${code}`,
      category_code: overrides.category_code ?? 'technology',
      display_type: overrides.display_type ?? 'spider_chart',
      description: overrides.description ?? null,
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
      creator_reviewer_id: string | null
      creator_review_completed: boolean
      manager_review_completed: boolean
      manager_reviews_count: number
      peer_reviews_count: number
      required_peer_reviews: number
      required_total_reviews: number
      minimum_manager_reviews: number
      minimum_peer_reviews: number
      confirmations: ReviewConfirmationEntry[] | null
      completed_at: DateTime | null
    }> = {}
  ): Promise<ReviewSession> {
    return ReviewSession.create({
      id: overrides.id ?? testId(),
      task_assignment_id: overrides.task_assignment_id ?? testId(),
      reviewee_id: overrides.reviewee_id ?? testId(),
      status: overrides.status ?? 'pending',
      creator_reviewer_id: overrides.creator_reviewer_id ?? null,
      creator_review_completed: overrides.creator_review_completed ?? false,
      manager_review_completed: overrides.manager_review_completed ?? false,
      manager_reviews_count: overrides.manager_reviews_count ?? 0,
      peer_reviews_count: overrides.peer_reviews_count ?? 0,
      required_peer_reviews: overrides.required_peer_reviews ?? 2,
      required_total_reviews: overrides.required_total_reviews ?? 2,
      minimum_manager_reviews: overrides.minimum_manager_reviews ?? 1,
      minimum_peer_reviews: overrides.minimum_peer_reviews ?? 1,
      confirmations: overrides.confirmations ?? null,
      completed_at: overrides.completed_at ?? null,
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
      assigned_public_proficiency_code: string
      comment: string | null
    }> = {}
  ): Promise<SkillReview> {
    return SkillReview.create({
      id: overrides.id ?? testId(),
      review_session_id: overrides.review_session_id ?? testId(),
      reviewer_id: overrides.reviewer_id ?? testId(),
      reviewer_type: overrides.reviewer_type ?? 'peer',
      skill_id: overrides.skill_id ?? testId(),
      assigned_public_proficiency_code: overrides.assigned_public_proficiency_code ?? 'l7',
      comment: overrides.comment ?? null,
    })
  },
}

export const ReviewSessionReviewerAssignmentFactory = {
  async create(
    overrides: Partial<{
      id: string
      review_session_id: string
      reviewer_id: string
      reviewer_type: 'manager' | 'peer'
      assignment_role:
        | 'creator_required'
        | 'manager_required'
        | 'peer_required'
        | 'manager_optional'
        | 'peer_optional'
      is_required: boolean
      status: 'pending' | 'submitted' | 'waived'
      due_at: DateTime | null
      submitted_at: DateTime | null
    }> = {}
  ): Promise<ReviewSessionReviewerAssignment> {
    return ReviewSessionReviewerAssignment.create({
      id: overrides.id ?? testId(),
      review_session_id: overrides.review_session_id ?? testId(),
      reviewer_id: overrides.reviewer_id ?? testId(),
      reviewer_type: overrides.reviewer_type ?? 'peer',
      assignment_role: overrides.assignment_role ?? 'peer_required',
      is_required: overrides.is_required ?? true,
      status: overrides.status ?? 'pending',
      due_at: overrides.due_at ?? null,
      submitted_at: overrides.submitted_at ?? null,
    })
  },
}

export const UserSkillFactory = {
  async create(
    overrides: Partial<{
      id: string
      user_id: string
      skill_id: string
      verified_public_proficiency_code: string
      source: 'imported' | 'reviewed'
      total_reviews: number
      avg_score: number | null
      avg_percentage: number | null
    }> = {}
  ): Promise<UserSkill> {
    return UserSkill.create({
      id: overrides.id ?? testId(),
      user_id: overrides.user_id ?? testId(),
      skill_id: overrides.skill_id ?? testId(),
      verified_public_proficiency_code: overrides.verified_public_proficiency_code ?? 'l7',
      source: overrides.source ?? 'imported',
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
