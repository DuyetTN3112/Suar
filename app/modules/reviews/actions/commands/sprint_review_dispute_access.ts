import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import NotFoundException from '#modules/http/exceptions/not_found_exception'

export type SprintReviewDisputeAuthorContext = 'reviewer' | 'org_representative' | 'system_admin'

export interface SprintReviewDisputeAccessContext {
  dispute: {
    id: string
    package_id: string
    opened_by: string
    status: string
    dispute_review_type: string
    reported_to_admin_at: string | null
  }
  reviewPackage: {
    id: string
    reviewer_id: string
  }
  sprint: {
    id: string
    organization_id: string
    project_id: string
  }
  isParticipant: boolean
  authorContext: SprintReviewDisputeAuthorContext | null
}

interface SprintReviewDisputeAccessRow {
  id: string
  package_id: string
  opened_by: string
  status: string
  dispute_review_type: string
  reported_to_admin_at: string | null
  reviewer_id: string
  sprint_id: string
  organization_id: string
  project_id: string
  project_owner_id: string | null
  project_manager_id: string | null
}

const PROJECT_REPRESENTATIVE_ROLES = new Set([
  'project_owner',
  'project_manager',
  'owner',
  'manager',
])
const ORG_REPRESENTATIVE_ROLES = new Set(['org_owner', 'org_admin'])
const ADMIN_ROLES = new Set(['system_admin', 'superadmin'])

export async function loadSprintReviewDisputeAccessContext(
  trx: TransactionClientContract,
  disputeId: string,
  actorId: string
): Promise<SprintReviewDisputeAccessContext> {
  const row = (await trx
    .from('sprint_review_disputes as srd')
    .innerJoin('sprint_review_packages as srp', 'srp.id', 'srd.package_id')
    .innerJoin('project_sprints as ps', 'ps.id', 'srp.sprint_id')
    .joinRaw('inner join projects as p on p.id::text = ps.project_id')
    .where('srd.id', disputeId)
    .select(
      'srd.id',
      'srd.package_id',
      'srd.opened_by',
      'srd.status',
      'srd.dispute_review_type',
      'srd.reported_to_admin_at',
      'srp.reviewer_id',
      'ps.id as sprint_id',
      'ps.organization_id',
      'ps.project_id',
      'p.owner_id as project_owner_id',
      'p.manager_id as project_manager_id'
    )
    .first()) as SprintReviewDisputeAccessRow | undefined

  if (!row) {
    throw new NotFoundException('Sprint review dispute not found')
  }

  const projectMember = (await trx
    .from('project_members')
    .where('project_id', row.project_id)
    .where('user_id', actorId)
    .select('project_role')
    .first()) as { project_role: string } | undefined
  const orgMember = (await trx
    .from('organization_users')
    .where('organization_id', row.organization_id)
    .where('user_id', actorId)
    .where('status', 'approved')
    .select('org_role')
    .first()) as { org_role: string } | undefined
  const actor = (await trx.from('users').where('id', actorId).select('system_role').first()) as
    | { system_role: string }
    | undefined

  const isReviewer = row.reviewer_id === actorId
  const isProjectRepresentative =
    row.project_owner_id === actorId ||
    row.project_manager_id === actorId ||
    PROJECT_REPRESENTATIVE_ROLES.has(projectMember?.project_role ?? '')
  const isOrgRepresentative = ORG_REPRESENTATIVE_ROLES.has(orgMember?.org_role ?? '')
  const isSystemAdmin = ADMIN_ROLES.has(actor?.system_role ?? '')

  return {
    dispute: {
      id: row.id,
      package_id: row.package_id,
      opened_by: row.opened_by,
      status: row.status,
      dispute_review_type: row.dispute_review_type,
      reported_to_admin_at: row.reported_to_admin_at,
    },
    reviewPackage: {
      id: row.package_id,
      reviewer_id: row.reviewer_id,
    },
    sprint: {
      id: row.sprint_id,
      organization_id: row.organization_id,
      project_id: row.project_id,
    },
    isParticipant: isReviewer || isProjectRepresentative || isOrgRepresentative || isSystemAdmin,
    authorContext: isSystemAdmin
      ? 'system_admin'
      : isReviewer
        ? 'reviewer'
        : isProjectRepresentative || isOrgRepresentative
          ? 'org_representative'
          : null,
  }
}

export async function loadSprintReviewDisputeComments(
  trx: TransactionClientContract,
  disputeId: string
) {
  const rows = (await trx
    .from('sprint_review_dispute_comments')
    .where('dispute_id', disputeId)
    .whereNull('deleted_at')
    .orderBy('created_at', 'asc')
    .select('id', 'dispute_id', 'author_id', 'body', 'visibility', 'created_at')) as Array<{
    id: string
    dispute_id: string
    author_id: string
    body: string
    visibility: string
    created_at: string
  }>

  return rows
}
