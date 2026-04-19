import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type {
  ReviewSessionProjection,
  ReviewSessionSkillReviewProjection,
} from '#modules/reviews/actions/dtos/response/review_session_projection'
import {
  buildReviewTaskAssignmentProjectionMap,
  type ReviewTaskAssignmentProjectionFact,
} from '#modules/reviews/actions/mappers/review_task_assignment_projection_mapper'
import type { ReviewConfirmationEntry } from '#modules/reviews/types/review_confirmation_entry'

interface DateTimeSource {
  toISO(): string | null
}

interface SerializableRelationSource {
  serialize(): Record<string, unknown>
}

interface SkillReviewSource {
  id: string
  review_session_id: string
  reviewer_id: string
  reviewer_type: 'manager' | 'peer'
  skill_id: string
  assigned_public_proficiency_code: string
  proficiency_level_id: string | null
  observed_level_id: string | null
  rubric_version_id: string | null
  confidence: 'low' | 'medium' | 'high' | null
  rationale: string | null
  observable_behaviors: string[]
  review_status: 'draft' | 'submitted' | 'superseded' | 'invalidated'
  comment: string | null
  submitted_at: DateTimeSource | null
  superseded_by: string | null
  is_fraud: boolean
  created_at: DateTimeSource
  updated_at: DateTimeSource
}

export interface ReviewSessionProjectionSource {
  id: string
  task_assignment_id: string
  reviewee_id: string
  status: 'pending' | 'in_progress' | 'completed' | 'disputed'
  manager_review_completed: boolean
  creator_reviewer_id: string | null
  creator_review_completed: boolean
  manager_reviews_count: number
  peer_reviews_count: number
  required_peer_reviews: number
  required_total_reviews: number
  minimum_manager_reviews: number
  minimum_peer_reviews: number
  confirmations: ReviewConfirmationEntry[] | null
  overall_quality_score: number | null
  delivery_timeliness: string | null
  requirement_adherence: number | null
  communication_quality: number | null
  code_quality_score: number | null
  proactiveness_score: number | null
  would_work_with_again: boolean | null
  strengths_observed: string | null
  areas_for_improvement: string | null
  deadline: DateTimeSource | null
  created_at: DateTimeSource
  completed_at: DateTimeSource | null
  updated_at: DateTimeSource
  reviewer_assignments?: SerializableRelationSource[]
  skill_reviews: SkillReviewSource[]
}

export interface ReviewSessionProjectionFacts {
  skills: {
    id: string
    name: string
    categoryCode: string
    is_active: boolean
  }[]
  identities: {
    id: string
    username: string
    email: string | null
  }[]
  assignments: ReviewTaskAssignmentProjectionFact[]
}

export function collectReviewSessionProjectionIds(
  sessions: ReviewSessionProjectionSource[],
  options: {
    includeReviewerIdentity: boolean
    includeRevieweeIdentity?: boolean
  }
): {
  skillIds: string[]
  identityIds: string[]
  assignmentIds: string[]
} {
  const skillIds = [
    ...new Set(sessions.flatMap((session) => session.skill_reviews.map((review) => review.skill_id))),
  ]
  const identityIds = [
    ...new Set([
      ...(options.includeReviewerIdentity
        ? sessions.flatMap((session) =>
            session.skill_reviews.map((review) => review.reviewer_id)
          )
        : []),
      ...(options.includeRevieweeIdentity
        ? sessions.map((session) => session.reviewee_id)
        : []),
    ]),
  ]
  const assignmentIds = [...new Set(sessions.map((session) => session.task_assignment_id))]
  return { skillIds, identityIds, assignmentIds }
}

export function assembleReviewSessionProjections(
  sessions: ReviewSessionProjectionSource[],
  facts: ReviewSessionProjectionFacts,
  options: {
    includeReviewerIdentity: boolean
    includeRevieweeIdentity?: boolean
    assignmentProjection: 'summary' | 'detail'
  }
): ReviewSessionProjection[] {
  const assignmentIds = [...new Set(sessions.map((session) => session.task_assignment_id))]
  const skillsById = new Map(facts.skills.map((skill) => [skill.id, skill]))
  const reviewersById = new Map(facts.identities.map((reviewer) => [reviewer.id, reviewer]))
  const assignmentsById = buildReviewTaskAssignmentProjectionMap(
    assignmentIds,
    facts.assignments,
    options.assignmentProjection
  )

  return sessions.map((session) => {
    const reviewee = reviewersById.get(session.reviewee_id)
    const taskAssignment = assignmentsById.get(session.task_assignment_id)
    if (!taskAssignment) {
      throw new InvariantViolationException(
        `Missing task-assignment projection for review session ${session.id}`
      )
    }
    return {
    id: session.id,
    task_assignment_id: session.task_assignment_id,
    reviewee_id: session.reviewee_id,
    status: session.status,
    manager_review_completed: session.manager_review_completed,
    creator_reviewer_id: session.creator_reviewer_id,
    creator_review_completed: session.creator_review_completed,
    manager_reviews_count: session.manager_reviews_count,
    peer_reviews_count: session.peer_reviews_count,
    required_peer_reviews: session.required_peer_reviews,
    required_total_reviews: session.required_total_reviews,
    minimum_manager_reviews: session.minimum_manager_reviews,
    minimum_peer_reviews: session.minimum_peer_reviews,
    confirmations: session.confirmations,
    overall_quality_score: session.overall_quality_score,
    delivery_timeliness: session.delivery_timeliness,
    requirement_adherence: session.requirement_adherence,
    communication_quality: session.communication_quality,
    code_quality_score: session.code_quality_score,
    proactiveness_score: session.proactiveness_score,
    would_work_with_again: session.would_work_with_again,
    strengths_observed: session.strengths_observed,
    areas_for_improvement: session.areas_for_improvement,
    deadline: session.deadline?.toISO() ?? null,
    created_at: session.created_at.toISO(),
    completed_at: session.completed_at?.toISO() ?? null,
    updated_at: session.updated_at.toISO(),
    ...(options.includeRevieweeIdentity && reviewee
      ? {
          reviewee: {
            id: reviewee.id,
            username: reviewee.username,
            email: reviewee.email,
          },
        }
      : {}),
    task_assignment: taskAssignment,
    ...(session.reviewer_assignments
      ? {
          reviewer_assignments: session.reviewer_assignments.map((assignment) =>
            assignment.serialize()
          ),
        }
      : {}),
    skill_reviews: session.skill_reviews.map(
      (review): ReviewSessionSkillReviewProjection => {
        const skill = skillsById.get(review.skill_id)
        const reviewer = reviewersById.get(review.reviewer_id)
        return {
          id: review.id,
          review_session_id: review.review_session_id,
          reviewer_id: review.reviewer_id,
          reviewer_type: review.reviewer_type,
          skill_id: review.skill_id,
          assigned_public_proficiency_code: review.assigned_public_proficiency_code,
          proficiency_level_id: review.proficiency_level_id,
          observed_level_id: review.observed_level_id,
          rubric_version_id: review.rubric_version_id,
          confidence: review.confidence,
          rationale: review.rationale,
          observable_behaviors: review.observable_behaviors,
          review_status: review.review_status,
          comment: review.comment,
          submitted_at: review.submitted_at?.toISO() ?? null,
          superseded_by: review.superseded_by,
          is_fraud: review.is_fraud,
          created_at: review.created_at.toISO(),
          updated_at: review.updated_at.toISO(),
          skill: {
            id: review.skill_id,
            skill_name: skill?.name ?? review.skill_id,
            category_code: skill?.categoryCode ?? 'unknown',
            is_active: skill?.is_active ?? false,
          },
          ...(options.includeReviewerIdentity && reviewer
            ? {
                reviewer: {
                  id: reviewer.id,
                  username: reviewer.username,
                  email: reviewer.email,
                },
              }
            : {}),
        }
      }
    ),
    }
  })
}
