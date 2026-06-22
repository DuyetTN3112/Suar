import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import NotFoundException from '#modules/http/exceptions/not_found_exception'

export type ReviewDisputeAuthorContext =
  | 'reviewee'
  | 'reviewer'
  | 'org_owner'
  | 'org_admin'
  | 'project_manager'
  | 'system_admin'

export interface ReviewDisputeAccessContext {
  dispute: {
    id: string
    status: string
    reviewee_id: string
    review_session_id: string
    task_id: string
  }
  authorContext: ReviewDisputeAuthorContext | null
  isParticipant: boolean
  canRespond: boolean
}

interface ActorRoles {
  systemRole: string | null
  orgRole: string | null
  projectRole: string | null
  isReviewer: boolean
}

async function loadActorRoles(
  trx: TransactionClientContract,
  actorId: string,
  taskId: string,
  reviewSessionId: string
): Promise<ActorRoles> {
  const [user, task, orgMembership, projectMembership, reviewer] = (await Promise.all([
    trx.from('users').where('id', actorId).select('system_role').first(),
    trx.from('tasks').where('id', taskId).select('organization_id', 'project_id').first(),
    trx
      .from('organization_users')
      .where('user_id', actorId)
      .where('status', 'approved')
      .select('organization_id', 'org_role'),
    trx.from('project_members').where('user_id', actorId).select('project_id', 'project_role'),
    trx
      .from('skill_reviews')
      .where('review_session_id', reviewSessionId)
      .where('reviewer_id', actorId)
      .first(),
  ])) as [
    { system_role: string } | undefined,
    { organization_id: string | null; project_id: string | null } | undefined,
    { organization_id: string; org_role: string }[],
    { project_id: string; project_role: string }[],
    Record<string, unknown> | undefined,
  ]

  if (!task) {
    throw new NotFoundException('Task not found for review dispute')
  }

  const orgRole =
    task.organization_id === null
      ? null
      : orgMembership.find((membership) => membership.organization_id === task.organization_id)?.org_role ??
        null

  const projectRole =
    task.project_id === null
      ? null
      : projectMembership.find((membership) => membership.project_id === task.project_id)?.project_role ??
        null

  return {
    systemRole: user?.system_role ?? null,
    orgRole,
    projectRole,
    isReviewer: Boolean(reviewer),
  }
}

export async function loadReviewDisputeAccessContext(
  trx: TransactionClientContract,
  disputeId: string,
  actorId: string
): Promise<ReviewDisputeAccessContext> {
  const dispute = (await trx
    .from('review_disputes')
    .where('id', disputeId)
    .forUpdate()
    .first()) as
    | {
        id: string
        status: string
        reviewee_id: string
        review_session_id: string
        task_id: string
      }
    | undefined

  if (!dispute) {
    throw new NotFoundException('Review dispute not found')
  }

  const actorRoles = await loadActorRoles(trx, actorId, dispute.task_id, dispute.review_session_id)
  const isSystemAdmin = actorRoles.systemRole === 'system_admin' || actorRoles.systemRole === 'superadmin'
  const isReviewee = actorId === dispute.reviewee_id
  const isOrgResponder =
    actorRoles.orgRole === 'org_owner' ||
    actorRoles.orgRole === 'org_admin' ||
    actorRoles.projectRole === 'project_manager'

  let authorContext: ReviewDisputeAuthorContext | null = null
  if (isSystemAdmin) {
    authorContext = 'system_admin'
  } else if (actorRoles.orgRole === 'org_owner') {
    authorContext = 'org_owner'
  } else if (actorRoles.orgRole === 'org_admin') {
    authorContext = 'org_admin'
  } else if (actorRoles.projectRole === 'project_manager') {
    authorContext = 'project_manager'
  } else if (actorRoles.isReviewer) {
    authorContext = 'reviewer'
  } else if (isReviewee) {
    authorContext = 'reviewee'
  }

  return {
    dispute,
    authorContext,
    isParticipant: isReviewee || actorRoles.isReviewer || isOrgResponder || isSystemAdmin,
    canRespond: isOrgResponder || actorRoles.isReviewer || isSystemAdmin,
  }
}

export async function loadReviewDisputeComments(
  trx: TransactionClientContract,
  disputeId: string
): Promise<Record<string, unknown>[]> {
  const dispute = (await trx
    .from('review_disputes')
    .where('id', disputeId)
    .select('task_id', 'review_session_id', 'reviewee_id')
    .first()) as
    | {
        task_id: string
        review_session_id: string
        reviewee_id: string
      }
    | undefined

  if (!dispute) {
    throw new NotFoundException('Review dispute not found')
  }

  const comments = (await trx
    .from('review_dispute_comments')
    .where('dispute_id', disputeId)
    .whereNull('deleted_at')
    .orderBy('created_at', 'asc')
    .select('*')) as Record<string, unknown>[]

  if (comments.length === 0) {
    return []
  }

  const authorIds = Array.from(
    new Set(comments.map((comment) => String(comment.author_id)).filter((id) => id.length > 0))
  )
  const [userRoles, orgMemberships, projectMemberships, reviewers, task] = authorIds.length
    ? ((await Promise.all([
        trx.from('users').whereIn('id', authorIds).select('id', 'system_role'),
        trx
          .from('organization_users')
          .whereIn('user_id', authorIds)
          .where('status', 'approved')
          .select('user_id', 'organization_id', 'org_role'),
        trx.from('project_members').whereIn('user_id', authorIds).select('user_id', 'project_id', 'project_role'),
        trx
          .from('skill_reviews')
          .where('review_session_id', dispute.review_session_id)
          .whereIn('reviewer_id', authorIds)
          .select('reviewer_id'),
        trx.from('tasks').where('id', dispute.task_id).select('organization_id', 'project_id').first(),
      ])) as [
        { id: string; system_role: string }[],
        { user_id: string; organization_id: string; org_role: string }[],
        { user_id: string; project_id: string; project_role: string }[],
        { reviewer_id: string }[],
        { organization_id: string | null; project_id: string | null } | undefined,
      ])
    : [[], [], [], [], undefined]

  if (!task) {
    throw new NotFoundException('Task not found for review dispute')
  }

  const roleMap = new Map(userRoles.map((user) => [user.id, user.system_role]))
  const reviewerIds = new Set(reviewers.map((reviewer) => reviewer.reviewer_id))

  return comments.map((comment) => ({
    ...comment,
    author_system_role: roleMap.get(String(comment.author_id)) ?? null,
    author_context: (() => {
      const authorId = String(comment.author_id)
      const systemRole = roleMap.get(authorId)
      if (systemRole === 'system_admin' || systemRole === 'superadmin') {
        return 'system_admin'
      }
      if (authorId === dispute.reviewee_id) {
        return 'reviewee'
      }
      const orgRole =
        task.organization_id === null
          ? null
          : orgMemberships.find(
              (membership) =>
                membership.user_id === authorId && membership.organization_id === task.organization_id
            )?.org_role ?? null
      if (orgRole === 'org_owner') {
        return 'org_owner'
      }
      if (orgRole === 'org_admin') {
        return 'org_admin'
      }
      const projectRole =
        task.project_id === null
          ? null
          : projectMemberships.find(
              (membership) => membership.user_id === authorId && membership.project_id === task.project_id
            )?.project_role ?? null
      if (projectRole === 'project_manager') {
        return 'project_manager'
      }
      if (reviewerIds.has(authorId)) {
        return 'reviewer'
      }
      return null
    })(),
  }))
}

export async function loadReviewDisputeEvidences(
  trx: TransactionClientContract,
  disputeId: string
): Promise<Record<string, unknown>[]> {
  const dispute = (await trx
    .from('review_disputes')
    .where('id', disputeId)
    .select('task_id', 'review_session_id', 'reviewee_id')
    .first()) as
    | {
        task_id: string
        review_session_id: string
        reviewee_id: string
      }
    | undefined

  if (!dispute) {
    throw new NotFoundException('Review dispute not found')
  }

  const evidences = (await trx
    .from('review_dispute_evidences')
    .where('dispute_id', disputeId)
    .orderBy('created_at', 'asc')
    .select('*')) as Record<string, unknown>[]

  if (evidences.length === 0) {
    return []
  }

  const uploaderIds = Array.from(
    new Set(evidences.map((evidence) => String(evidence.uploaded_by)).filter((id) => id.length > 0))
  )
  const [userRoles, orgMemberships, projectMemberships, reviewers, task] = uploaderIds.length
    ? ((await Promise.all([
        trx.from('users').whereIn('id', uploaderIds).select('id', 'system_role'),
        trx
          .from('organization_users')
          .whereIn('user_id', uploaderIds)
          .where('status', 'approved')
          .select('user_id', 'organization_id', 'org_role'),
        trx.from('project_members').whereIn('user_id', uploaderIds).select('user_id', 'project_id', 'project_role'),
        trx
          .from('skill_reviews')
          .where('review_session_id', dispute.review_session_id)
          .whereIn('reviewer_id', uploaderIds)
          .select('reviewer_id'),
        trx.from('tasks').where('id', dispute.task_id).select('organization_id', 'project_id').first(),
      ])) as [
        { id: string; system_role: string }[],
        { user_id: string; organization_id: string; org_role: string }[],
        { user_id: string; project_id: string; project_role: string }[],
        { reviewer_id: string }[],
        { organization_id: string | null; project_id: string | null } | undefined,
      ])
    : [[], [], [], [], undefined]

  if (!task) {
    throw new NotFoundException('Task not found for review dispute')
  }

  const roleMap = new Map(userRoles.map((user) => [user.id, user.system_role]))
  const reviewerIds = new Set(reviewers.map((reviewer) => reviewer.reviewer_id))

  return evidences.map((evidence) => ({
    ...evidence,
    uploader_system_role: roleMap.get(String(evidence.uploaded_by)) ?? null,
    uploader_context: (() => {
      const uploaderId = String(evidence.uploaded_by)
      const systemRole = roleMap.get(uploaderId)
      if (systemRole === 'system_admin' || systemRole === 'superadmin') {
        return 'system_admin'
      }
      if (uploaderId === dispute.reviewee_id) {
        return 'reviewee'
      }
      const orgRole =
        task.organization_id === null
          ? null
          : orgMemberships.find(
              (membership) =>
                membership.user_id === uploaderId && membership.organization_id === task.organization_id
            )?.org_role ?? null
      if (orgRole === 'org_owner') {
        return 'org_owner'
      }
      if (orgRole === 'org_admin') {
        return 'org_admin'
      }
      const projectRole =
        task.project_id === null
          ? null
          : projectMemberships.find(
              (membership) => membership.user_id === uploaderId && membership.project_id === task.project_id
            )?.project_role ?? null
      if (projectRole === 'project_manager') {
        return 'project_manager'
      }
      if (reviewerIds.has(uploaderId)) {
        return 'reviewer'
      }
      return null
    })(),
  }))
}
