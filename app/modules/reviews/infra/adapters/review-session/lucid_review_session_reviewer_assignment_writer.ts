import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import { createReviewerAssignmentsForSession } from './lucid_review_session_reviewer_assignment_builder.js'

import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import {
  OrganizationRole,
  OrganizationUserStatus,
} from '#modules/organizations/public_contracts/access/organization_constants'

export { createReviewerAssignmentsForSession }

export type ReviewerType = 'manager' | 'peer'
export type AssignmentRole =
  | 'creator_required'
  | 'manager_required'
  | 'peer_required'
  | 'manager_optional'
  | 'peer_optional'

export interface ReviewSessionAssignmentSeed {
  id: string
  task_assignment_id: string
  reviewee_id: string
  creator_reviewer_id: string | null
  deadline?: DateTime | Date | string | null
  minimum_manager_reviews: number
  minimum_peer_reviews: number
  required_peer_reviews: number
}

export interface AssignmentContextRow {
  organization_id: string
  project_id: string | null
  assigned_by: string | null
  task_creator_id: string
  project_owner_id: string | null
  project_manager_id: string | null
}

export const REVIEW_GOVERNANCE_STATE = {
  AWAITING_REVIEWS: 'awaiting_reviews',
  OVERDUE_REVIEWS: 'overdue_reviews',
  GOVERNANCE_READY: 'governance_ready',
  DISPUTED_FROZEN: 'disputed_frozen',
} as const

export type ReviewGovernanceState =
  (typeof REVIEW_GOVERNANCE_STATE)[keyof typeof REVIEW_GOVERNANCE_STATE]

const REVIEW_SESSION_DEADLINE_HOURS = 72

function queryClient(trx?: TransactionClientContract) {
  return trx ?? db
}

export function normalizeDeadline(deadline?: DateTime | Date | string | null): DateTime {
  if (DateTime.isDateTime(deadline)) {
    return deadline
  }

  if (deadline instanceof Date) {
    return DateTime.fromJSDate(deadline)
  }

  if (typeof deadline === 'string' && deadline.length > 0) {
    return DateTime.fromISO(deadline)
  }

  return DateTime.now().plus({ hours: REVIEW_SESSION_DEADLINE_HOURS })
}

export function resolveReviewSessionDeadline(): DateTime {
  return DateTime.now().plus({ hours: REVIEW_SESSION_DEADLINE_HOURS })
}

export async function loadAssignmentContext(
  taskAssignmentId: string,
  trx?: TransactionClientContract
): Promise<AssignmentContextRow | null> {
  return (await queryClient(trx)
    .from('task_assignments as ta')
    .join('tasks as t', 't.id', 'ta.task_id')
    .leftJoin('projects as p', 'p.id', 't.project_id')
    .where('ta.id', taskAssignmentId)
    .select(
      't.organization_id',
      't.creator_id as task_creator_id',
      'ta.assigned_by',
      't.project_id',
      'p.owner_id as project_owner_id',
      'p.manager_id as project_manager_id'
    )
    .first()) as AssignmentContextRow | null
}

export async function resolveEffectiveCreatorReviewerId(
  input: {
    task_assignment_id: string
    reviewee_id: string
    creator_reviewer_id: string | null
  },
  trx?: TransactionClientContract
): Promise<string | null> {
  const context = await loadAssignmentContext(input.task_assignment_id, trx)
  if (!context) {
    return input.creator_reviewer_id
  }

  const preferredCandidates = [
    input.creator_reviewer_id ?? context.task_creator_id,
    context.assigned_by,
    context.project_owner_id,
    context.project_manager_id,
  ]

  for (const candidate of preferredCandidates) {
    if (candidate && candidate !== input.reviewee_id) {
      return candidate
    }
  }

  const orgMemberships = (await queryClient(trx)
    .from('organization_users')
    .where('organization_id', context.organization_id)
    .where('status', OrganizationUserStatus.APPROVED)
    .whereIn('org_role', [OrganizationRole.OWNER, OrganizationRole.ADMIN])
    .select('user_id')) as Array<{ user_id: string }>

  for (const membership of orgMemberships) {
    if (membership.user_id !== input.reviewee_id) {
      return membership.user_id
    }
  }

  return null
}

export async function markReviewerAssignmentSubmitted(
  input: {
    reviewSessionId: string
    reviewerId: string
    reviewerType: ReviewerType
    submittedAt: DateTime
  },
  trx: TransactionClientContract
): Promise<{ id: string; submittedAt: string }> {
  const submittedAt = input.submittedAt.toUTC().toISO()
  if (!submittedAt) {
    throw new RangeError('Reviewer assignment submission time must be valid')
  }
  const rows = (await queryClient(trx)
    .from('review_session_reviewer_assignments')
    .where('review_session_id', input.reviewSessionId)
    .where('reviewer_id', input.reviewerId)
    .where('reviewer_type', input.reviewerType)
    .where('status', 'pending')
    .update({
      status: 'submitted',
      submitted_at: submittedAt,
      updated_at: submittedAt,
    })
    .returning(['id', 'submitted_at'])) as Array<{ id: string; submitted_at: string | Date }>

  const assignment = rows[0]
  if (!assignment) {
    throw new ConflictException(
      'Reviewer assignment is missing, already submitted, or no longer active'
    )
  }
  return {
    id: assignment.id,
    submittedAt: new Date(assignment.submitted_at).toISOString(),
  }
}

export function deriveReviewGovernanceState(input: {
  status: 'pending' | 'in_progress' | 'completed' | 'disputed'
  deadline?: string | Date | null
}): ReviewGovernanceState {
  if (input.status === 'disputed') {
    return REVIEW_GOVERNANCE_STATE.DISPUTED_FROZEN
  }

  if (input.status === 'completed') {
    return REVIEW_GOVERNANCE_STATE.GOVERNANCE_READY
  }

  if (input.deadline && DateTime.fromJSDate(new Date(input.deadline)).isValid) {
    const deadline = DateTime.fromJSDate(new Date(input.deadline))
    if (deadline < DateTime.now()) {
      return REVIEW_GOVERNANCE_STATE.OVERDUE_REVIEWS
    }
  }

  return REVIEW_GOVERNANCE_STATE.AWAITING_REVIEWS
}
