import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { loadSprintReviewDisputeComments } from '#modules/reviews/infra/repositories/read/sprint_review_dispute_queries'

const TASK_CONTEXT_COLUMNS = [
  'id',
  'title',
  'status',
  'priority',
  'assigned_to',
  'creator_id',
  'organization_id',
  'project_id',
  'project_sprint_id',
  'due_date',
  'updated_at',
]

interface PartyContextScope {
  organizationId: string
  projectId: string
  sprintId: string
}

function parseJsonValue(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function parseJsonFields(row: Record<string, unknown>, fields: string[]): Record<string, unknown> {
  const output = { ...row }
  for (const field of fields) {
    if (field in output) output[field] = parseJsonValue(output[field])
  }
  return output
}

async function loadPartyContext(
  trx: TransactionClientContract,
  userId: string | null,
  scope: PartyContextScope
): Promise<Record<string, unknown>> {
  if (!userId) {
    return { user_id: null, profile: {}, work_schedule: [], task_history: [] }
  }

  const user = (await trx
    .from('users')
    .where('id', userId)
    .select('id', 'username', 'system_role', 'current_organization_id', 'timezone', 'status')
    .first()) as Record<string, unknown> | undefined
  const profile = (await trx
    .from('user_profile_snapshots')
    .where('user_id', userId)
    .select(
      'id',
      'version',
      'snapshot_name',
      'is_current',
      'is_public',
      'summary',
      'skills_verified',
      'work_highlights',
      'performance_metrics',
      'trust_metrics',
      'scoring_version',
      'created_at',
      'updated_at'
    )
    .orderBy('is_current', 'desc')
    .orderBy('version', 'desc')
    .first()) as Record<string, unknown> | undefined
  const taskHistory = (await trx
    .from('user_work_history')
    .where('user_id', userId)
    .where('organization_id', scope.organizationId)
    .where('project_id', scope.projectId)
    .select(
      'id',
      'task_id',
      'task_assignment_id',
      'organization_id',
      'project_id',
      'task_title',
      'task_type',
      'business_domain',
      'problem_category',
      'role_in_task',
      'difficulty',
      'estimated_hours',
      'actual_hours',
      'was_on_time',
      'completed_at'
    )
    .orderBy('completed_at', 'desc')
    .orderBy('created_at', 'desc')
    .limit(10)) as Record<string, unknown>[]
  const workSchedule = (await trx
    .from('tasks')
    .whereNull('deleted_at')
    .where('organization_id', scope.organizationId)
    .where('project_id', scope.projectId)
    .where('project_sprint_id', scope.sprintId)
    .where((builder) => {
      void builder.where('assigned_to', userId).orWhere('creator_id', userId)
    })
    .select(...TASK_CONTEXT_COLUMNS)
    .orderBy('due_date', 'asc')
    .orderBy('updated_at', 'desc')
    .limit(10)) as Record<string, unknown>[]

  return {
    user_id: userId,
    username: user?.['username'] ?? null,
    system_role: user?.['system_role'] ?? null,
    current_organization_id: user?.['current_organization_id'] ?? null,
    timezone: user?.['timezone'] ?? null,
    status: user?.['status'] ?? null,
    profile: profile
      ? parseJsonFields(profile, [
          'summary',
          'skills_verified',
          'work_highlights',
          'performance_metrics',
          'trust_metrics',
        ])
      : {},
    work_schedule: workSchedule,
    task_history: taskHistory,
  }
}

export async function loadSprintReviewDisputeRuntimeContext(
  trx: TransactionClientContract,
  disputeId: string,
  counterpartyFallbackId: string | null
): Promise<Record<string, unknown>> {
  const dispute = (await trx
    .from('sprint_review_disputes')
    .where('id', disputeId)
    .select(
      'id',
      'package_id',
      'opened_by',
      'status',
      'dispute_reason',
      'dispute_review_type',
      'requested_outcome',
      'escalation_reason',
      'reported_to_admin_by',
      'reported_to_admin_at'
    )
    .first()) as Record<string, unknown>
  const packageId = String(dispute['package_id'])
  const reviewPackage = (await trx
    .from('sprint_review_packages')
    .where('id', packageId)
    .select('id', 'sprint_id', 'reviewer_id', 'status', 'submitted_at')
    .first()) as Record<string, unknown>
  const reviewPackageId = String(reviewPackage['id'])
  const sprintId = String(reviewPackage['sprint_id'])
  const reviewerId = String(reviewPackage['reviewer_id'])
  const sprint = (await trx
    .from('project_sprints')
    .where('id', sprintId)
    .select('id', 'name', 'goal', 'status', 'organization_id', 'project_id', 'starts_at', 'ends_at')
    .first()) as Record<string, unknown> | undefined
  const organizationId =
    typeof sprint?.['organization_id'] === 'string' ? sprint['organization_id'] : ''
  const projectId = typeof sprint?.['project_id'] === 'string' ? sprint['project_id'] : ''
  const organization = (await trx
    .from('organizations')
    .where('id', organizationId)
    .select('id', 'name', 'slug', 'plan', 'owner_id')
    .first()) as Record<string, unknown> | undefined
  const project = (await trx
    .from('projects')
    .where('id', projectId)
    .select('id', 'name', 'status', 'visibility', 'organization_id', 'owner_id', 'manager_id')
    .first()) as Record<string, unknown> | undefined
  const managerReviews = (
    (await trx
      .from('sprint_manager_reviews')
      .where('package_id', reviewPackageId)
      .select(
        'id',
        'package_id',
        'target_user_id',
        'target_role',
        'rating',
        'dimensions',
        'comment',
        'is_anonymous_to_target',
        'created_at',
        'updated_at'
      )
      .orderBy('created_at', 'asc')) as Record<string, unknown>[]
  ).map((review) => parseJsonFields(review, ['dimensions']))
  const environmentReviews = (
    (await trx
      .from('sprint_environment_reviews')
      .where('package_id', reviewPackageId)
      .select(
        'id',
        'package_id',
        'target_type',
        'target_id',
        'rating',
        'dimensions',
        'comment',
        'is_anonymous_publicly',
        'created_at',
        'updated_at'
      )
      .orderBy('created_at', 'asc')) as Record<string, unknown>[]
  ).map((review) => parseJsonFields(review, ['dimensions']))
  const relatedProjectTasks = (await trx
    .from('tasks')
    .where('project_id', projectId)
    .whereNull('deleted_at')
    .select(...TASK_CONTEXT_COLUMNS)
    .orderBy('updated_at', 'desc')
    .limit(20)) as Record<string, unknown>[]
  const sprintPeerTasks = (await trx
    .from('tasks')
    .where('project_sprint_id', sprintId)
    .whereNull('deleted_at')
    .select(...TASK_CONTEXT_COLUMNS)
    .orderBy('updated_at', 'desc')
    .limit(20)) as Record<string, unknown>[]

  let managerAssignedTasks: Record<string, unknown>[] = []
  const managerTargetIds = managerReviews
    .map((review) => review['target_user_id'])
    .filter((targetId): targetId is string => typeof targetId === 'string' && targetId.length > 0)
  if (managerTargetIds.length > 0) {
    managerAssignedTasks = (await trx
      .from('tasks as t')
      .leftJoin('task_assignments as ta', 'ta.task_id', 't.id')
      .where('t.project_sprint_id', sprintId)
      .where('t.assigned_to', reviewerId)
      .whereNull('t.deleted_at')
      .where((builder) => {
        void builder
          .whereIn('t.creator_id', managerTargetIds)
          .orWhereIn('ta.assigned_by', managerTargetIds)
      })
      .distinct(...TASK_CONTEXT_COLUMNS.map((column) => `t.${column}`))
      .orderBy('t.updated_at', 'desc')
      .limit(20)) as Record<string, unknown>[]
  }

  const comments = await loadSprintReviewDisputeComments(trx, disputeId)
  const counterpartyComment = comments.find((comment) => comment.author_id !== reviewerId)
  const counterpartyId =
    counterpartyComment?.author_id ??
    (managerTargetIds.length > 0 ? managerTargetIds[0] : null) ??
    counterpartyFallbackId
  const partyScope = { organizationId, projectId, sprintId }

  return {
    schema_version: 'suar_sprint_review_dispute_runtime_context_v1',
    dispute_review_type: dispute['dispute_review_type'],
    dispute,
    organization: organization ?? { id: organizationId },
    project: project ?? { id: projectId },
    sprint: sprint ?? { id: sprintId },
    package: reviewPackage,
    target: {
      type: dispute['dispute_review_type'],
      manager_target_user_ids: managerTargetIds,
      environment_targets: environmentReviews.map((review) => ({
        type: review['target_type'],
        id: review['target_id'],
      })),
    },
    reviewer_context: await loadPartyContext(trx, reviewerId, partyScope),
    counterparty_context: await loadPartyContext(trx, counterpartyId, partyScope),
    manager_reviews: managerReviews,
    environment_reviews: environmentReviews,
    related_project_tasks: relatedProjectTasks,
    sprint_peer_tasks: sprintPeerTasks,
    manager_assigned_tasks: managerAssignedTasks,
    comments,
  }
}
