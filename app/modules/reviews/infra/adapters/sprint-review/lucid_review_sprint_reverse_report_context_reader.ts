import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { ReviewSprintReverseWorkflow } from '#modules/reviews/actions/ports/outbound/review_sprint_reverse_workflow_unit_of_work'

interface PartyContextScope {
  organizationId: string
  projectId: string
  sprintId: string
}

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
    if (field in output) {
      output[field] = parseJsonValue(output[field])
    }
  }
  return output
}

async function loadPartyContext(
  transaction: TransactionClientContract,
  userId: string | null,
  scope: PartyContextScope
): Promise<Record<string, unknown>> {
  if (!userId) {
    return { user_id: null, profile: {}, work_schedule: [], task_history: [] }
  }

  const user = (await transaction
    .from('users')
    .where('id', userId)
    .select('id', 'username', 'system_role', 'current_organization_id', 'timezone', 'status')
    .first()) as Record<string, unknown> | undefined
  const profile = (await transaction
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
  const taskHistory = (await transaction
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
  const workSchedule = (await transaction
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

export async function loadReportRuntimeContext(
  transaction: TransactionClientContract,
  workflow: ReviewSprintReverseWorkflow
): Promise<Record<string, unknown>> {
  const organization = (await transaction
    .from('organizations')
    .where('id', workflow.organizationId)
    .select('id', 'name', 'slug', 'plan', 'owner_id')
    .first()) as Record<string, unknown> | undefined
  const project = (await transaction
    .from('projects')
    .where('id', workflow.projectId)
    .select('id', 'name', 'status', 'visibility', 'organization_id', 'owner_id', 'manager_id')
    .first()) as Record<string, unknown> | undefined
  const sprint = (await transaction
    .from('project_sprints')
    .where('id', workflow.sprintId)
    .select('id', 'name', 'goal', 'status', 'organization_id', 'project_id', 'starts_at', 'ends_at')
    .first()) as Record<string, unknown> | undefined
  const relatedProjectTasks = (await transaction
    .from('tasks')
    .where('project_id', workflow.projectId)
    .whereNull('deleted_at')
    .select(...TASK_CONTEXT_COLUMNS)
    .orderBy('updated_at', 'desc')
    .limit(20)) as Record<string, unknown>[]
  const sprintPeerTasks = (await transaction
    .from('tasks')
    .where('project_sprint_id', workflow.sprintId)
    .whereNull('deleted_at')
    .select(...TASK_CONTEXT_COLUMNS)
    .orderBy('updated_at', 'desc')
    .limit(20)) as Record<string, unknown>[]
  let managerAssignedTasks: Record<string, unknown>[] = []
  if (workflow.targetType === 'assigner' && workflow.targetUserId) {
    const targetUserId = workflow.targetUserId
    managerAssignedTasks = (await transaction
      .from('tasks as t')
      .leftJoin('task_assignments as ta', 'ta.task_id', 't.id')
      .where('t.project_sprint_id', workflow.sprintId)
      .where('t.assigned_to', workflow.reviewerId)
      .whereNull('t.deleted_at')
      .where((builder) => {
        void builder.where('t.creator_id', targetUserId).orWhere('ta.assigned_by', targetUserId)
      })
      .distinct(...TASK_CONTEXT_COLUMNS.map((column) => `t.${column}`))
      .orderBy('t.updated_at', 'desc')
      .limit(20)) as Record<string, unknown>[]
  }
  const responderId = workflow.responderId ?? workflow.targetUserId
  const partyScope = {
    organizationId: workflow.organizationId,
    projectId: workflow.projectId,
    sprintId: workflow.sprintId,
  }
  const reviewerContext = await loadPartyContext(transaction, workflow.reviewerId, partyScope)
  const revieweeContext = await loadPartyContext(transaction, responderId, partyScope)

  return {
    schema_version: 'suar_sprint_reverse_review_report_context_v1',
    dispute_review_type:
      workflow.targetType === 'environment' ? 'environment_review' : 'manager_review',
    workflow_id: workflow.id,
    organization: organization ?? { id: workflow.organizationId },
    project: project ?? { id: workflow.projectId },
    sprint: sprint ?? { id: workflow.sprintId },
    target: {
      type: workflow.targetType,
      user_id: workflow.targetUserId,
      entity_id: workflow.targetEntityId,
      responder_id: workflow.responderId,
    },
    reviewer_context: reviewerContext,
    reviewee_context: revieweeContext,
    related_project_tasks: relatedProjectTasks,
    sprint_peer_tasks: sprintPeerTasks,
    manager_assigned_tasks: managerAssignedTasks,
  }
}
