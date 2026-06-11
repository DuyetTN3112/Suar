import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export interface ReviewSessionActorAccessContext {
  sessionExists: boolean
  sessionId: string
  sessionRevieweeId: string
  sessionTaskOrgId: string
  sessionTaskProjectId: string | null
  sessionTaskId: string
  sessionTaskAssignmentId: string
  actorSystemRole: string | null
  managerReviewerIds: string[]
  peerReviewerIds: string[]
  isOrgAdminOrOwner: boolean
}

interface SessionRow {
  session_id: string
  reviewee_id: string
  task_assignment_id: string
  task_id: string
  organization_id: string
  project_id: string | null
  task_creator_id: string
  assigned_by: string | null
  project_owner_id: string | null
  project_manager_id: string | null
}

interface OrgMembershipRow {
  user_id: string
  org_role: string
}

interface ProjectMembershipRow {
  user_id: string
  project_role: string
}

interface SkillReviewActorRow {
  reviewer_id: string
  reviewer_type: 'manager' | 'peer'
}

const queryClient = (trx?: TransactionClientContract) => trx ?? db

export async function loadReviewSessionActorAccessContext(
  sessionId: string,
  actorId: string,
  trx?: TransactionClientContract
): Promise<ReviewSessionActorAccessContext | null> {
  const client = queryClient(trx)

  const session = (await client
    .from('review_sessions as rs')
    .join('task_assignments as ta', 'ta.id', 'rs.task_assignment_id')
    .join('tasks as t', 't.id', 'ta.task_id')
    .leftJoin('projects as p', 'p.id', 't.project_id')
    .where('rs.id', sessionId)
    .select(
      'rs.id as session_id',
      'rs.reviewee_id',
      'rs.task_assignment_id',
      'ta.assigned_by',
      't.id as task_id',
      't.organization_id',
      't.project_id',
      't.creator_id as task_creator_id',
      'p.owner_id as project_owner_id',
      'p.manager_id as project_manager_id'
    )
    .first()) as SessionRow | null

  if (!session) {
    return null
  }

  const [actor, orgMemberships, projectMemberships, submittedReviewers] = (await Promise.all([
    client.from('users').where('id', actorId).select('system_role').first(),
    client
      .from('organization_users')
      .where('organization_id', session.organization_id)
      .where('status', 'approved')
      .select('user_id', 'org_role'),
    session.project_id
      ? client
          .from('project_members')
          .where('project_id', session.project_id)
          .select('user_id', 'project_role')
      : Promise.resolve([]),
    client
      .from('skill_reviews')
      .where('review_session_id', sessionId)
      .where('review_status', 'submitted')
      .select('reviewer_id', 'reviewer_type'),
  ])) as [
    { system_role?: string } | null,
    OrgMembershipRow[],
    ProjectMembershipRow[],
    SkillReviewActorRow[],
  ]

  const managerIds = new Set<string>()
  const peerIds = new Set<string>()

  for (const value of [
    session.task_creator_id,
    session.assigned_by,
    session.project_owner_id,
    session.project_manager_id,
  ]) {
    if (typeof value === 'string' && value.length > 0) {
      managerIds.add(value)
    }
  }

  for (const membership of orgMemberships) {
    if (membership.org_role === 'org_owner' || membership.org_role === 'org_admin') {
      managerIds.add(membership.user_id)
    }
  }

  for (const membership of projectMemberships) {
    if (membership.project_role === 'project_manager') {
      managerIds.add(membership.user_id)
      continue
    }

    if (membership.user_id !== session.reviewee_id) {
      peerIds.add(membership.user_id)
    }
  }

  if (peerIds.size === 0) {
    for (const membership of orgMemberships) {
      if (membership.org_role === 'org_member' && membership.user_id !== session.reviewee_id) {
        peerIds.add(membership.user_id)
      }
    }
  }

  for (const reviewer of submittedReviewers) {
    if (reviewer.reviewer_type === 'manager') {
      managerIds.add(reviewer.reviewer_id)
    } else if (reviewer.reviewer_id !== session.reviewee_id) {
      peerIds.add(reviewer.reviewer_id)
    }
  }

  const actorOrgRole =
    orgMemberships.find((membership) => membership.user_id === actorId)?.org_role ?? null

  return {
    sessionExists: true,
    sessionId: session.session_id,
    sessionRevieweeId: session.reviewee_id,
    sessionTaskOrgId: session.organization_id,
    sessionTaskProjectId: session.project_id,
    sessionTaskId: session.task_id,
    sessionTaskAssignmentId: session.task_assignment_id,
    actorSystemRole: actor?.system_role ?? null,
    managerReviewerIds: Array.from(managerIds),
    peerReviewerIds: Array.from(peerIds),
    isOrgAdminOrOwner: actorOrgRole === 'org_owner' || actorOrgRole === 'org_admin',
  }
}

export function isAllowedReverseReviewTarget(
  access: ReviewSessionActorAccessContext,
  targetType: 'peer' | 'manager' | 'project' | 'organization',
  targetId: string
): boolean {
  if (targetType === 'manager') {
    return access.managerReviewerIds.includes(targetId)
  }

  if (targetType === 'peer') {
    return access.peerReviewerIds.includes(targetId)
  }

  if (targetType === 'project') {
    return access.sessionTaskProjectId === targetId
  }

  return access.sessionTaskOrgId === targetId
}
