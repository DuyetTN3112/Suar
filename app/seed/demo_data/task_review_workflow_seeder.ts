import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { DISPUTE_SCENARIO_SPECS } from './dispute_scenario_specs.js'
import type { SeedRuntime } from './seed_runtime.js'
import { findRow } from './seed_utils.js'
import type { SeedContext, SeededTask, SeededUser } from './types.js'

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
] as const

interface TaskReviewWorkflowRow {
  id: string
}

function parseJsonValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value
  }

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
  trx: TransactionClientContract,
  user: SeededUser,
  scope: { organizationId: string; projectId: string; sprintId: string | null }
): Promise<Record<string, unknown>> {
  const profile = (await trx
    .from('user_profile_snapshots')
    .where('user_id', user.id)
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
      'created_at',
      'updated_at'
    )
    .orderBy('is_current', 'desc')
    .orderBy('version', 'desc')
    .first()) as Record<string, unknown> | undefined

  const taskHistory = (await trx
    .from('user_work_history')
    .where('user_id', user.id)
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
    .limit(10)) as Record<string, unknown>[]

  let workScheduleQuery = trx
    .from('tasks')
    .whereNull('deleted_at')
    .where('organization_id', scope.organizationId)
    .where('project_id', scope.projectId)
    .where((builder) => {
      void builder.where('assigned_to', user.id).orWhere('creator_id', user.id)
    })

  if (scope.sprintId) {
    workScheduleQuery = workScheduleQuery.where('project_sprint_id', scope.sprintId)
  }

  const workSchedule = (await workScheduleQuery
    .select(...TASK_CONTEXT_COLUMNS)
    .orderBy('due_date', 'asc')
    .orderBy('updated_at', 'desc')
    .limit(10)) as Record<string, unknown>[]

  return {
    user_id: user.id,
    username: user.username,
    system_role: user.systemRole,
    current_organization_id: scope.organizationId,
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

async function loadTaskContext(
  trx: TransactionClientContract,
  task: SeededTask
): Promise<Record<string, unknown>> {
  const row = (await trx
    .from('tasks')
    .where('id', task.id)
    .select(...TASK_CONTEXT_COLUMNS, 'description', 'task_type', 'business_domain')
    .first()) as Record<string, unknown> | undefined

  return row ?? { id: task.id, title: task.title }
}

async function loadRelatedTasks(
  trx: TransactionClientContract,
  tasks: SeededTask[]
): Promise<Record<string, unknown>[]> {
  if (tasks.length === 0) {
    return []
  }

  return (await trx
    .from('tasks')
    .whereIn(
      'id',
      tasks.map((task) => task.id)
    )
    .whereNull('deleted_at')
    .select(...TASK_CONTEXT_COLUMNS)
    .orderBy('updated_at', 'desc')) as Record<string, unknown>[]
}

async function loadSprintPeerTasks(
  trx: TransactionClientContract,
  sprintId: string | null
): Promise<Record<string, unknown>[]> {
  if (!sprintId) {
    return []
  }

  return (await trx
    .from('tasks')
    .where('project_sprint_id', sprintId)
    .whereNull('deleted_at')
    .select(...TASK_CONTEXT_COLUMNS)
    .orderBy('updated_at', 'desc')) as Record<string, unknown>[]
}

export async function seedTaskReviewWorkflows(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  context: SeedContext
): Promise<void> {
  const scenario = runtime.requireValue(
    DISPUTE_SCENARIO_SPECS.find((item) => item.key === 'taskReviewEvidenceUnderscored'),
    'dispute-scenario:taskReviewEvidenceUnderscored'
  )
  const task = runtime.requireValue(context.tasks[scenario.primaryTask], scenario.primaryTask)
  const assignment = runtime.requireValue(
    context.assignments[scenario.primaryTask],
    `assignment:${scenario.primaryTask}`
  )
  const taskGiver = context.users[scenario.taskGiver]
  const reviewee = context.users[scenario.worker]
  const peerReviewer = context.users[scenario.counterparty]
  const relatedTasks = scenario.relatedTasks
    .map((taskKey) => context.tasks[taskKey])
    .filter((relatedTask): relatedTask is SeededTask => Boolean(relatedTask))
  const primaryTask = await loadTaskContext(trx, task)
  const sprintId =
    typeof primaryTask['project_sprint_id'] === 'string' ? primaryTask['project_sprint_id'] : null
  const scope = {
    organizationId: task.organizationId,
    projectId: runtime.requireValue(task.projectId ?? undefined, `task-project:${task.title}`),
    sprintId,
  }
  const runtimeContext = {
    schema_version: 'suar_task_review_workflow_runtime_context_v1',
    source_type: 'task_review_workflow',
    dispute_review_type: scenario.reviewType,
    workflow: { status: 'resolved' },
    organization: context.organizations[scenario.organization],
    project: context.projects[scenario.project],
    sprint: sprintId ? (context.sprints[scenario.sprint ?? ''] ?? { id: sprintId }) : null,
    task: primaryTask,
    assignment,
    dispute_claim: {
      dispute_reason:
        'Manager and peer reviewer scored the task lower than the linked evidence supports.',
      requested_outcome: scenario.expectedDecision ?? 'adjust_score',
    },
    task_giver_context: await loadPartyContext(trx, taskGiver, scope),
    reviewee_context: await loadPartyContext(trx, reviewee, scope),
    reporter_context: await loadPartyContext(trx, reviewee, scope),
    reviewer_contexts: [
      { reviewer_id: taskGiver.id, reviewer_role: 'task_giver_required' },
      { reviewer_id: peerReviewer.id, reviewer_role: 'peer_required' },
    ],
    related_project_tasks: await loadRelatedTasks(trx, [task, ...relatedTasks]),
    sprint_peer_tasks: await loadSprintPeerTasks(trx, sprintId),
    comments: [],
  }

  const existing = (await findRow(trx, 'task_review_workflows', {
    task_id: task.id,
  })) as TaskReviewWorkflowRow | null
  const workflowId = existing?.id ?? runtime.uuid()
  const workflowPayload = {
    task_id: task.id,
    project_id: scope.projectId,
    organization_id: task.organizationId,
    reviewee_id: reviewee.id,
    status: 'resolved',
    required_review_count: 2,
    completed_review_count: 2,
    accepted_by_reviewee_at: null,
    reported_at: runtime.isoDaysAgo(0, 11),
    reported_by: reviewee.id,
    completed_at: null,
    final_decision: 'partially_accept',
    final_rationale:
      'Demo resolution: evidence supports a score adjustment, with rubric wording kept as follow-up context.',
    resolved_at: runtime.isoDaysAgo(0, 16),
    resolved_by: context.users.superadmin.id,
    runtime_context: runtime.toJson(runtimeContext),
    created_at: runtime.isoDaysAgo(2, 9),
    updated_at: runtime.isoDaysAgo(0, 16),
  }

  if (existing) {
    await trx.from('task_review_workflows').where('id', workflowId).update(workflowPayload)
  } else {
    await trx
      .insertQuery()
      .table('task_review_workflows')
      .insert({ id: workflowId, ...workflowPayload })
  }

  await trx.from('task_review_reviewers').where('workflow_id', workflowId).delete()
  await trx.from('task_review_messages').where('workflow_id', workflowId).delete()

  await trx.table('task_review_reviewers').multiInsert([
    {
      id: runtime.uuid(),
      workflow_id: workflowId,
      reviewer_id: taskGiver.id,
      reviewer_role: 'task_giver_required',
      is_required: true,
      status: 'submitted',
      priority_rank: 1,
      reviewed_at: runtime.isoDaysAgo(1, 14),
      created_at: runtime.isoDaysAgo(2, 9),
      updated_at: runtime.isoDaysAgo(1, 14),
    },
    {
      id: runtime.uuid(),
      workflow_id: workflowId,
      reviewer_id: peerReviewer.id,
      reviewer_role: 'peer_required',
      is_required: true,
      status: 'submitted',
      priority_rank: 2,
      reviewed_at: runtime.isoDaysAgo(1, 15),
      created_at: runtime.isoDaysAgo(2, 9),
      updated_at: runtime.isoDaysAgo(1, 15),
    },
  ])

  await trx.table('task_review_messages').multiInsert([
    {
      id: runtime.uuid(),
      workflow_id: workflowId,
      author_id: taskGiver.id,
      message_type: 'review',
      body: 'QA checklist looks complete, but the scoring rubric needs a cleaner split between coverage and profile impact.',
      metadata: runtime.toJson({ score: 3, reviewer_role: 'task_giver_required' }),
      created_at: runtime.isoDaysAgo(1, 14),
    },
    {
      id: runtime.uuid(),
      workflow_id: workflowId,
      author_id: peerReviewer.id,
      message_type: 'review',
      body: 'Evidence supports the delivery path, yet the rubric examples were not aligned before scoring.',
      metadata: runtime.toJson({ score: 3, reviewer_role: 'peer_required' }),
      created_at: runtime.isoDaysAgo(1, 15),
    },
    {
      id: runtime.uuid(),
      workflow_id: workflowId,
      author_id: reviewee.id,
      message_type: 'system',
      body: 'Task review dispute reported: linked evidence supports a score adjustment.',
      metadata: runtime.toJson({ runtime_context: runtimeContext }),
      created_at: runtime.isoDaysAgo(0, 11),
    },
  ])
}
