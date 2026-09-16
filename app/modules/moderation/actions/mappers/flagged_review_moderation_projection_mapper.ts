import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type {
  FlaggedReviewModerationProjection,
  LegacyFlaggedReviewPageProjection,
} from '#modules/reviews/actions/dtos/response/flagged_review_moderation_projection'
import type { ReviewTaskAssignmentProjectionFact } from '#modules/reviews/actions/mappers/review_task_assignment_projection_mapper'

interface DateTimeSource {
  toISO(): string | null
}

export interface FlaggedReviewModerationSource {
  id: string
  skill_review_id: string
  flag_type: string
  severity: string
  detected_at: DateTimeSource
  status: 'pending' | 'reviewed' | 'dismissed' | 'confirmed'
  reviewed_by: string | null
  reviewed_at: DateTimeSource | null
  notes: string | null
  created_at: DateTimeSource
  updated_at: DateTimeSource
  skill_review?: {
    reviewer_id: string
    skill_id: string
    review_session_id: string
    comment: string | null
    assigned_public_proficiency_code: string
    review_session?: {
      reviewee_id: string
      task_assignment_id: string
    }
  }
}

export interface FlaggedReviewModerationProjectionFacts {
  identities: {
    id: string
    username: string
    email: string | null
  }[]
  skills: {
    id: string
    name: string
    categoryCode: string
  }[]
  assignments: ReviewTaskAssignmentProjectionFact[]
}

export function collectFlaggedReviewModerationProjectionIds(
  flaggedReviews: FlaggedReviewModerationSource[]
): {
  identityIds: string[]
  skillIds: string[]
  assignmentIds: string[]
} {
  return {
    identityIds: [
      ...new Set(
        flaggedReviews.flatMap((flaggedReview) => [
          ...(flaggedReview.skill_review?.reviewer_id
            ? [flaggedReview.skill_review.reviewer_id]
            : []),
          ...(flaggedReview.reviewed_by ? [flaggedReview.reviewed_by] : []),
          ...(flaggedReview.skill_review?.review_session?.reviewee_id
            ? [flaggedReview.skill_review.review_session.reviewee_id]
            : []),
        ])
      ),
    ],
    skillIds: [
      ...new Set(
        flaggedReviews.flatMap((flaggedReview) =>
          flaggedReview.skill_review?.skill_id ? [flaggedReview.skill_review.skill_id] : []
        )
      ),
    ],
    assignmentIds: [
      ...new Set(
        flaggedReviews.flatMap((flaggedReview) =>
          flaggedReview.skill_review?.review_session?.task_assignment_id
            ? [flaggedReview.skill_review.review_session.task_assignment_id]
            : []
        )
      ),
    ],
  }
}

export function assembleFlaggedReviewModerationProjections(
  flaggedReviews: FlaggedReviewModerationSource[],
  facts: FlaggedReviewModerationProjectionFacts
): FlaggedReviewModerationProjection[] {
  const identitiesById = new Map(facts.identities.map((identity) => [identity.id, identity]))
  const skillsById = new Map(facts.skills.map((skill) => [skill.id, skill]))
  const assignmentsById = new Map(facts.assignments.map((assignment) => [assignment.id, assignment]))

  return flaggedReviews.map((flaggedReview) => {
    const skillReview = flaggedReview.skill_review
    if (!skillReview || !skillReview.review_session) {
      throw new InvariantViolationException(
        `Flagged review ${flaggedReview.id} is missing required moderation relations`
      )
    }

    const taskAssignmentId = skillReview.review_session.task_assignment_id
    const taskAssignment = assignmentsById.get(taskAssignmentId)
    const moderator = flaggedReview.reviewed_by
      ? (identitiesById.get(flaggedReview.reviewed_by) ?? null)
      : null
    const suspiciousReviewer = identitiesById.get(skillReview.reviewer_id) ?? {
      id: skillReview.reviewer_id,
      username: 'Deleted user',
      email: null,
    }
    const skill = skillsById.get(skillReview.skill_id)
    const reviewee = identitiesById.get(skillReview.review_session.reviewee_id) ?? {
      id: skillReview.review_session.reviewee_id,
      username: 'Deleted user',
      email: null,
    }

    return {
      id: flaggedReview.id,
      skill_review_id: flaggedReview.skill_review_id,
      flag_type: flaggedReview.flag_type,
      severity: flaggedReview.severity,
      detected_at: flaggedReview.detected_at.toISO(),
      status: flaggedReview.status,
      reviewed_by: flaggedReview.reviewed_by,
      reviewed_at: flaggedReview.reviewed_at?.toISO() ?? null,
      notes: flaggedReview.notes,
      created_at: flaggedReview.created_at.toISO(),
      updated_at: flaggedReview.updated_at.toISO(),
      suspicious_reviewer: suspiciousReviewer,
      reviewee,
      moderator,
      comment: skillReview.comment,
      assigned_public_proficiency_code: skillReview.assigned_public_proficiency_code,
      skill: {
        id: skillReview.skill_id,
        name: skill?.name ?? skillReview.skill_id,
        category_code: skill?.categoryCode ?? null,
      },
      task: taskAssignment
        ? {
            id: taskAssignment.task.id,
            title: taskAssignment.task.title,
            description: taskAssignment.task.description,
          }
        : null,
      task_assignment_id: taskAssignmentId,
      ...(!taskAssignment ? { task_assignment_unavailable: true as const } : {}),
      review_session_id: skillReview.review_session_id,
    }
  })
}

export function toLegacyFlaggedReviewPageProjection(
  projection: FlaggedReviewModerationProjection
): LegacyFlaggedReviewPageProjection {
  return {
    id: projection.id,
    skill_review_id: projection.skill_review_id,
    flag_type: projection.flag_type,
    severity: projection.severity,
    detected_at: projection.detected_at,
    status: projection.status,
    reviewed_by: projection.reviewed_by,
    reviewed_at: projection.reviewed_at,
    notes: projection.notes,
    created_at: projection.created_at,
    updated_at: projection.updated_at,
    reviewer: projection.moderator,
    skill_review: {
      review_session_id: projection.review_session_id,
      comment: projection.comment,
      assigned_public_proficiency_code: projection.assigned_public_proficiency_code,
      reviewer: projection.suspicious_reviewer,
      review_session: {
        reviewee: projection.reviewee,
      },
      skill: {
        id: projection.skill.id,
        skill_name: projection.skill.name,
        category_code: projection.skill.category_code,
      },
    },
  }
}
