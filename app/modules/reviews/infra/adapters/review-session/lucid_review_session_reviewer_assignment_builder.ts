import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  loadAssignmentContext,
  normalizeDeadline,
  resolveEffectiveCreatorReviewerId,
  type ReviewSessionAssignmentSeed,
} from './lucid_review_session_reviewer_assignment_writer.js'

import {
  OrganizationRole,
  OrganizationUserStatus,
} from '#modules/organizations/public_contracts/access/organization_constants'
import { ProjectRole } from '#modules/projects/public_contracts/project_constants'
import { REVIEW_DEFAULTS } from '#modules/reviews/public_contracts/review_constants'

export type ReviewerType = 'manager' | 'peer'
export type AssignmentRole =
  | 'creator_required'
  | 'manager_required'
  | 'peer_required'
  | 'manager_optional'
  | 'peer_optional'

interface OrgMembershipRow {
  user_id: string
  org_role: OrganizationRole
}

interface ProjectMembershipRow {
  user_id: string
  project_role: ProjectRole
}

function queryClient(trx?: TransactionClientContract) {
  return trx ?? db
}

function uniquePush(items: string[], value: string | null | undefined, used: Set<string>) {
  if (typeof value !== 'string' || value.length === 0 || used.has(value)) {
    return
  }

  used.add(value)
  items.push(value)
}

function shiftUnassignedCandidate(
  candidates: string[],
  assignedIds: Set<string>,
  excludedIds: Set<string> = new Set()
): string | null {
  for (const candidate of candidates) {
    if (!assignedIds.has(candidate) && !excludedIds.has(candidate)) {
      return candidate
    }
  }

  return null
}

export async function createReviewerAssignmentsForSession(
  session: ReviewSessionAssignmentSeed,
  trx?: TransactionClientContract
): Promise<void> {
  const client = queryClient(trx)
  const existing = (await client
    .from('review_session_reviewer_assignments')
    .where('review_session_id', session.id)
    .select('id')
    .first()) as { id: string } | null

  if (existing) {
    return
  }

  const context = await loadAssignmentContext(session.task_assignment_id, trx)

  if (!context) {
    return
  }

  const loadOrgMemberships = async (): Promise<OrgMembershipRow[]> =>
    client
      .from('organization_users')
      .where('organization_id', context.organization_id)
      .where('status', OrganizationUserStatus.APPROVED)
      .select('user_id', 'org_role') as Promise<OrgMembershipRow[]>
  const loadProjectMemberships = async (): Promise<ProjectMembershipRow[]> =>
    context.project_id
      ? (client
          .from('project_members')
          .where('project_id', context.project_id)
          .select('user_id', 'project_role') as Promise<ProjectMembershipRow[]>)
      : []

  const [orgMemberships, projectMemberships] = trx
    ? [await loadOrgMemberships(), await loadProjectMemberships()]
    : await Promise.all([loadOrgMemberships(), loadProjectMemberships()])

  const managerCandidates: string[] = []
  const peerCandidates: string[] = []
  const managerSeen = new Set<string>()
  const peerSeen = new Set<string>()
  const dueAt = normalizeDeadline(session.deadline)

  for (const candidate of [
    session.creator_reviewer_id ?? context.task_creator_id,
    context.assigned_by,
    context.project_owner_id,
    context.project_manager_id,
  ]) {
    if (candidate !== session.reviewee_id) {
      uniquePush(managerCandidates, candidate, managerSeen)
    }
  }

  for (const membership of orgMemberships) {
    if (
      membership.org_role === OrganizationRole.OWNER ||
      membership.org_role === OrganizationRole.ADMIN
    ) {
      if (membership.user_id !== session.reviewee_id) {
        uniquePush(managerCandidates, membership.user_id, managerSeen)
      }
      continue
    }
  }

  for (const membership of projectMemberships) {
    if (membership.user_id === session.reviewee_id) {
      continue
    }

    if (
      membership.project_role === ProjectRole.MANAGER ||
      membership.project_role === ProjectRole.OWNER
    ) {
      uniquePush(managerCandidates, membership.user_id, managerSeen)
      continue
    }

    uniquePush(peerCandidates, membership.user_id, peerSeen)
  }

  if (peerCandidates.length === 0) {
    for (const membership of orgMemberships) {
      if (
        membership.org_role === OrganizationRole.MEMBER &&
        membership.user_id !== session.reviewee_id
      ) {
        uniquePush(peerCandidates, membership.user_id, peerSeen)
      }
    }
  }

  const rows: Array<{
    review_session_id: string
    reviewer_id: string
    reviewer_type: ReviewerType
    assignment_role: AssignmentRole
    is_required: boolean
    status: 'pending'
    due_at: string
  }> = []
  const assignedManagerIds = new Set<string>()
  const assignedPeerIds = new Set<string>()

  const addAssignment = (
    reviewerId: string | undefined,
    reviewerType: ReviewerType,
    assignmentRole: AssignmentRole,
    isRequired: boolean
  ) => {
    if (!reviewerId || reviewerId === session.reviewee_id) {
      return
    }

    const bucket = reviewerType === 'manager' ? assignedManagerIds : assignedPeerIds
    if (bucket.has(reviewerId)) {
      return
    }

    bucket.add(reviewerId)
    rows.push({
      review_session_id: session.id,
      reviewer_id: reviewerId,
      reviewer_type: reviewerType,
      assignment_role: assignmentRole,
      is_required: isRequired,
      status: 'pending',
      due_at: dueAt.toSQL() ?? dueAt.toISO() ?? new Date().toISOString(),
    })
  }

  const creatorReviewerId = await resolveEffectiveCreatorReviewerId(session, trx)
  if (creatorReviewerId && creatorReviewerId !== session.reviewee_id) {
    addAssignment(creatorReviewerId, 'manager', 'creator_required', true)
  }

  let requiredManagerCount = session.minimum_manager_reviews
  if (assignedManagerIds.size > 0) {
    requiredManagerCount = Math.max(0, requiredManagerCount - assignedManagerIds.size)
  }

  for (const reviewerId of managerCandidates) {
    if (requiredManagerCount <= 0) {
      break
    }
    if (reviewerId === creatorReviewerId) {
      continue
    }
    addAssignment(reviewerId, 'manager', 'manager_required', true)
    requiredManagerCount--
  }

  const requiredPeerCount = Math.max(
    session.minimum_peer_reviews,
    Math.min(
      session.required_peer_reviews || REVIEW_DEFAULTS.MIN_PEER_REVIEWS,
      peerCandidates.length
    )
  )

  let remainingRequiredPeers = requiredPeerCount
  for (const reviewerId of peerCandidates) {
    if (remainingRequiredPeers <= 0) {
      break
    }
    addAssignment(reviewerId, 'peer', 'peer_required', true)
    remainingRequiredPeers--
  }

  const managerFallbackId = shiftUnassignedCandidate(managerCandidates, assignedManagerIds)
  if (managerFallbackId) {
    addAssignment(managerFallbackId, 'manager', 'manager_optional', false)
  }

  const peerFallbackId = shiftUnassignedCandidate(peerCandidates, assignedPeerIds)
  if (peerFallbackId) {
    addAssignment(peerFallbackId, 'peer', 'peer_optional', false)
  }

  if (rows.length === 0) {
    return
  }

  await client.table('review_session_reviewer_assignments').multiInsert(rows)
}
