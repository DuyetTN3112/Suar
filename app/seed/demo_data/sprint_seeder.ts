import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { DISPUTE_SCENARIO_SPECS } from './dispute_scenario_specs.js'
import type { SeedRuntime } from './seed_runtime.js'
import { applyWhere, findRow } from './seed_utils.js'
import type {
  ProjectKey,
  SeededProject,
  SeededSprint,
  SeededTask,
  SeededUser,
  SeedContext,
  UserKey,
} from './types.js'

interface SprintSpec {
  key: string
  id: string
  project: ProjectKey
  name: string
  goal: string
  status: 'active' | 'review_open'
  startsDaysAgo: number
  endsDaysAhead: number
  taskKeys: string[]
}

interface SprintPackageSpec {
  reviewer: UserKey
  status: 'pending' | 'submitted'
}

interface WorkflowSeedSpec {
  reviewer: UserKey
  targetType: 'assigner' | 'environment'
  targetUser?: UserKey
  status: 'awaiting_review' | 'awaiting_response' | 'reported' | 'resolved' | 'done'
  rating: number | null
  comment: string | null
}

interface SprintManagerReviewRow {
  id: string
}

interface SprintReviewDisputeRow {
  id: string
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
] as const

const SPRINT_SPECS: SprintSpec[] = [
  {
    key: 'trustReviewJuly',
    id: 'sprint-trust-review-2026-07-a',
    project: 'orgAPlatform',
    name: 'Trust Review Operating System - July A',
    goal: 'Close the trust review loop from task evidence to profile proof while keeping contributor handoff visible.',
    status: 'review_open',
    startsDaysAgo: 16,
    endsDaysAhead: -2,
    taskKeys: ['member-org-switch', 'member-profile-proof', 'member-profile-live'],
  },
  {
    key: 'trustReviewJulyNext',
    id: 'sprint-trust-review-2026-07-b',
    project: 'orgAPlatform',
    name: 'Trust Review Operating System - July B',
    goal: 'Stabilize marketplace applicant review, sprint feedback, and public proof surfaces for the next release window.',
    status: 'active',
    startsDaysAgo: 2,
    endsDaysAhead: 12,
    taskKeys: ['owner-active-platform-work', 'marketplace-qa-pipeline'],
  },
  {
    key: 'operationsReviewJuly',
    id: 'sprint-operations-review-2026-07-a',
    project: 'orgAOperations',
    name: 'Admin Quality Control - July Review',
    goal: 'Resolve operations review disputes with task evidence, related peer work, and reviewer context in one sprint chain.',
    status: 'active',
    startsDaysAgo: 14,
    endsDaysAhead: 3,
    taskKeys: ['owner-review-dispute-case', 'member-admin-regression', 'owner-data-governance'],
  },
]

const REVIEW_PACKAGE_SPECS: SprintPackageSpec[] = [
  { reviewer: 'owner', status: 'submitted' },
  { reviewer: 'orgAdmin', status: 'submitted' },
  { reviewer: 'member', status: 'submitted' },
  { reviewer: 'peerReviewer', status: 'pending' },
]

const WORKFLOW_SPECS: WorkflowSeedSpec[] = [
  {
    reviewer: 'owner',
    targetType: 'environment',
    status: 'done',
    rating: 5,
    comment:
      'The sprint had clear priorities, fast reviewer response, and enough context to close profile proof work.',
  },
  {
    reviewer: 'member',
    targetType: 'assigner',
    targetUser: 'orgAdmin',
    status: 'awaiting_response',
    rating: 4,
    comment:
      'Task handoff was clear, but earlier rubric notes would reduce back-and-forth during review.',
  },
  {
    reviewer: 'orgAdmin',
    targetType: 'environment',
    status: 'resolved',
    rating: 2,
    comment: 'The environment surfaced a blocking ambiguity around review scoring ownership.',
  },
  {
    reviewer: 'peerReviewer',
    targetType: 'assigner',
    targetUser: 'owner',
    status: 'awaiting_review',
    rating: null,
    comment: null,
  },
]

function packageId(sprintId: string, reviewer: UserKey): string {
  return `${sprintId}-pkg-${reviewer}`
}

function reviewId(packageIdValue: string, suffix: string): string {
  return `${packageIdValue}-${suffix}`
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

async function loadSprintPartyContext(
  trx: TransactionClientContract,
  user: SeededUser,
  sprint: SeededSprint
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
    .where('organization_id', sprint.organizationId)
    .where('project_id', sprint.projectId)
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
  const workSchedule = (await trx
    .from('tasks')
    .whereNull('deleted_at')
    .where('organization_id', sprint.organizationId)
    .where('project_id', sprint.projectId)
    .where('project_sprint_id', sprint.id)
    .where((builder) => {
      void builder.where('assigned_to', user.id).orWhere('creator_id', user.id)
    })
    .select(...TASK_CONTEXT_COLUMNS)
    .orderBy('due_date', 'asc')
    .orderBy('updated_at', 'desc')
    .limit(10)) as Record<string, unknown>[]

  return {
    user_id: user.id,
    username: user.username,
    system_role: user.systemRole,
    current_organization_id: sprint.organizationId,
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

async function upsertSprint(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  spec: SprintSpec,
  users: Record<UserKey, SeededUser>,
  projects: Record<ProjectKey, SeededProject>
): Promise<SeededSprint> {
  const project = projects[spec.project]
  const existing = await findRow(trx, 'project_sprints', { id: spec.id })
  const payload = {
    organization_id: project.organizationId,
    project_id: project.id,
    name: spec.name,
    status: spec.status,
    starts_at: runtime.isoDaysAgo(spec.startsDaysAgo),
    ends_at:
      spec.endsDaysAhead >= 0
        ? runtime.isoDaysAhead(spec.endsDaysAhead)
        : runtime.isoDaysAgo(Math.abs(spec.endsDaysAhead)),
    created_by: users.owner.id,
    closed_by: spec.status === 'review_open' ? users.owner.id : null,
    review_opened_at: spec.status === 'review_open' ? runtime.isoDaysAgo(1, 10) : null,
    review_closed_at: null,
    goal: spec.goal,
    created_at: runtime.isoDaysAgo(20),
    updated_at: runtime.isoDaysAgo(1),
  }

  if (existing) {
    await trx.from('project_sprints').where('id', spec.id).update(payload)
  } else {
    await trx
      .insertQuery()
      .table('project_sprints')
      .insert({ id: spec.id, ...payload })
  }

  return {
    id: spec.id,
    projectId: project.id,
    organizationId: project.organizationId,
    status: spec.status,
  }
}

async function linkTasksToSprint(
  trx: TransactionClientContract,
  sprint: SeededSprint,
  spec: SprintSpec,
  tasks: Record<string, SeededTask>
): Promise<void> {
  for (const taskKey of spec.taskKeys) {
    const task = tasks[taskKey]
    if (!task) continue
    await trx.from('tasks').where('id', task.id).update({ project_sprint_id: sprint.id })
  }
}

async function upsertPackage(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  sprint: SeededSprint,
  reviewer: SeededUser,
  status: 'pending' | 'submitted',
  packageIdValue: string
): Promise<void> {
  const existing = await findRow(trx, 'sprint_review_packages', { id: packageIdValue })
  const payload = {
    sprint_id: sprint.id,
    reviewer_id: reviewer.id,
    status,
    submitted_at: status === 'submitted' ? runtime.isoDaysAgo(1, 15) : null,
    created_at: runtime.isoDaysAgo(1, 9),
    updated_at: runtime.isoDaysAgo(1, 15),
  }

  if (existing) {
    await trx.from('sprint_review_packages').where('id', packageIdValue).update(payload)
  } else {
    await trx
      .insertQuery()
      .table('sprint_review_packages')
      .insert({ id: packageIdValue, ...payload })
  }
}

async function upsertSprintReviews(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  sprint: SeededSprint,
  users: Record<UserKey, SeededUser>
): Promise<void> {
  for (const packageSpec of REVIEW_PACKAGE_SPECS.filter((item) => item.status === 'submitted')) {
    const packageIdValue = packageId(sprint.id, packageSpec.reviewer)
    const managerReviewId = reviewId(packageIdValue, 'manager')
    const managerTargetUser = packageSpec.reviewer === 'member' ? users.owner : users.orgAdmin
    const existingManager = (await findRow(trx, 'sprint_manager_reviews', {
      id: managerReviewId,
    })) as SprintManagerReviewRow | null
    const managerPayload = {
      package_id: packageIdValue,
      target_user_id: managerTargetUser.id,
      target_role: 'manager',
      rating: packageSpec.reviewer === 'member' ? 4 : 5,
      dimensions: runtime.toJson({
        planning: 'clear',
        feedback_latency: packageSpec.reviewer === 'member' ? 'could_improve' : 'fast',
      }),
      comment:
        packageSpec.reviewer === 'member'
          ? 'Planning was clear; earlier rubric examples would help contributors self-check before review.'
          : 'Sprint management kept review goals visible and unblocked contributor handoff quickly.',
      is_anonymous_to_target: true,
      created_at: runtime.isoDaysAgo(1, 16),
      updated_at: runtime.isoDaysAgo(1, 16),
    }

    if (existingManager) {
      await trx.from('sprint_manager_reviews').where('id', managerReviewId).update(managerPayload)
    } else {
      await trx
        .insertQuery()
        .table('sprint_manager_reviews')
        .insert({
          id: managerReviewId,
          ...managerPayload,
        })
    }

    const environmentWhere = {
      package_id: packageIdValue,
      target_type: 'organization',
      target_id: sprint.organizationId,
    }
    const existingEnvironment = await findRow(trx, 'sprint_environment_reviews', environmentWhere)
    const environmentPayload = {
      rating: packageSpec.reviewer === 'orgAdmin' ? 3 : 5,
      dimensions: runtime.toJson({
        review_context: packageSpec.reviewer === 'orgAdmin' ? 'ambiguous' : 'strong',
        tooling: 'reliable',
      }),
      comment:
        packageSpec.reviewer === 'orgAdmin'
          ? 'The tooling worked, but scoring ownership needs a sharper rule before the next sprint close.'
          : 'The organization provided useful context, visible evidence, and responsive review support.',
      is_anonymous_publicly: true,
      created_at: runtime.isoDaysAgo(1, 16),
      updated_at: runtime.isoDaysAgo(1, 16),
    }

    if (existingEnvironment) {
      await applyWhere(trx.from('sprint_environment_reviews'), environmentWhere).update(
        environmentPayload
      )
    } else {
      await trx
        .insertQuery()
        .table('sprint_environment_reviews')
        .insert({
          id: reviewId(packageIdValue, 'environment'),
          ...environmentWhere,
          ...environmentPayload,
        })
    }
  }
}

async function upsertWorkflowMessages(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  workflowId: string,
  spec: WorkflowSeedSpec,
  users: Record<UserKey, SeededUser>,
  sprint: SeededSprint
): Promise<void> {
  await trx.from('sprint_reverse_review_messages').where('workflow_id', workflowId).delete()

  if (!spec.comment) {
    return
  }

  const messages = [
    {
      author_id: users[spec.reviewer].id,
      message_type: 'review',
      body: spec.comment,
      metadata: runtime.toJson({ rating: spec.rating }),
      created_at: runtime.isoDaysAgo(1, 15),
    },
  ]

  if (spec.status === 'done') {
    messages.push({
      author_id: spec.targetUser ? users[spec.targetUser].id : users.owner.id,
      message_type: 'response',
      body: 'Thanks for the feedback. The next sprint plan keeps the strong parts and clarifies the handoff points.',
      metadata: runtime.toJson({ accepted: true }),
      created_at: runtime.isoDaysAgo(0, 10),
    })
  }

  if (spec.status === 'reported' || spec.status === 'resolved') {
    const runtimeContext = await buildReverseReviewRuntimeContext(
      trx,
      workflowId,
      sprint,
      spec,
      users
    )
    messages.push({
      author_id: users[spec.reviewer].id,
      message_type: 'report',
      body: 'Escalating this environment review because the scoring ownership ambiguity affected the sprint close.',
      metadata: runtime.toJson({
        escalation_reason: 'review_scoring_ownership',
        runtime_context: runtimeContext,
      }),
      created_at: runtime.isoDaysAgo(0, 11),
    })
  }

  await trx.table('sprint_reverse_review_messages').multiInsert(
    messages.map((message) => ({
      id: runtime.uuid(),
      workflow_id: workflowId,
      ...message,
    }))
  )
}

async function upsertReverseReviewWorkflows(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  sprint: SeededSprint,
  users: Record<UserKey, SeededUser>
): Promise<void> {
  for (const spec of WORKFLOW_SPECS) {
    const reviewer = users[spec.reviewer]
    const targetUserId = spec.targetUser ? users[spec.targetUser].id : null
    const targetEntityId = spec.targetType === 'environment' ? sprint.organizationId : null
    const where = {
      sprint_id: sprint.id,
      reviewer_id: reviewer.id,
      target_type: spec.targetType,
      target_user_id: targetUserId,
      target_entity_id: targetEntityId,
    }
    const existing = await findRow(trx, 'sprint_reverse_review_workflows', where)
    const workflowId = existing?.id ?? runtime.uuid()
    const payload = {
      project_id: sprint.projectId,
      organization_id: sprint.organizationId,
      responder_id: targetUserId ?? users.owner.id,
      status: spec.status,
      rating: spec.rating,
      comment: spec.comment,
      package_id: packageId(sprint.id, spec.reviewer),
      submitted_at: spec.rating ? runtime.isoDaysAgo(1, 15) : null,
      accepted_at: spec.status === 'done' ? runtime.isoDaysAgo(0, 10) : null,
      reported_at:
        spec.status === 'reported' || spec.status === 'resolved' ? runtime.isoDaysAgo(0, 11) : null,
      created_at: runtime.isoDaysAgo(1, 9),
      updated_at:
        spec.status === 'resolved' ? runtime.isoDaysAgo(0, 16) : runtime.isoDaysAgo(0, 11),
      final_decision: spec.status === 'resolved' ? 'request_re_review' : null,
      final_rationale:
        spec.status === 'resolved'
          ? 'Demo resolution: sprint environment scoring ownership needs a re-review with clearer owner and reviewer responsibilities.'
          : null,
      resolved_at: spec.status === 'resolved' ? runtime.isoDaysAgo(0, 16) : null,
      resolved_by: spec.status === 'resolved' ? users.superadmin.id : null,
    }

    if (existing) {
      await trx.from('sprint_reverse_review_workflows').where('id', workflowId).update(payload)
    } else {
      await trx
        .insertQuery()
        .table('sprint_reverse_review_workflows')
        .insert({
          id: workflowId,
          ...where,
          ...payload,
        })
    }

    await upsertWorkflowMessages(runtime, trx, workflowId, spec, users, sprint)
  }
}

async function loadSeedTaskRows(
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

async function loadSprintTaskRows(
  trx: TransactionClientContract,
  sprintId: string
): Promise<Record<string, unknown>[]> {
  return (await trx
    .from('tasks')
    .where('project_sprint_id', sprintId)
    .whereNull('deleted_at')
    .select(...TASK_CONTEXT_COLUMNS)
    .orderBy('updated_at', 'desc')) as Record<string, unknown>[]
}

async function loadProjectTaskRows(
  trx: TransactionClientContract,
  projectId: string
): Promise<Record<string, unknown>[]> {
  return (await trx
    .from('tasks')
    .where('project_id', projectId)
    .whereNull('deleted_at')
    .select(...TASK_CONTEXT_COLUMNS)
    .orderBy('updated_at', 'desc')
    .limit(20)) as Record<string, unknown>[]
}

async function loadManagerAssignedTasks(
  trx: TransactionClientContract,
  sprint: SeededSprint,
  reviewerId: string,
  managerId: string
): Promise<Record<string, unknown>[]> {
  return (await trx
    .from('tasks as t')
    .leftJoin('task_assignments as ta', 'ta.task_id', 't.id')
    .where('t.project_sprint_id', sprint.id)
    .where('t.assigned_to', reviewerId)
    .whereNull('t.deleted_at')
    .where((builder) => {
      void builder.where('t.creator_id', managerId).orWhere('ta.assigned_by', managerId)
    })
    .distinct(...TASK_CONTEXT_COLUMNS.map((column) => `t.${column}`))
    .orderBy('t.updated_at', 'desc')) as Record<string, unknown>[]
}

async function buildReverseReviewRuntimeContext(
  trx: TransactionClientContract,
  workflowId: string,
  sprint: SeededSprint,
  spec: WorkflowSeedSpec,
  users: Record<UserKey, SeededUser>
): Promise<Record<string, unknown>> {
  const reviewer = users[spec.reviewer]
  const targetUser = spec.targetUser ? users[spec.targetUser] : users.owner
  const managerAssignedTasks =
    spec.targetType === 'assigner' && spec.targetUser
      ? await loadManagerAssignedTasks(trx, sprint, reviewer.id, targetUser.id)
      : []

  return {
    schema_version: 'suar_sprint_reverse_review_report_context_v1',
    dispute_review_type:
      spec.targetType === 'environment' ? 'environment_review' : 'manager_review',
    workflow_id: workflowId,
    organization: { id: sprint.organizationId },
    project: { id: sprint.projectId },
    sprint,
    target: {
      type: spec.targetType,
      user_id: spec.targetUser ? targetUser.id : null,
      entity_id: spec.targetType === 'environment' ? sprint.organizationId : null,
      responder_id: targetUser.id,
    },
    environment_signal:
      spec.targetType === 'environment'
        ? {
            rating: spec.rating,
            comment: spec.comment,
            escalation_reason: 'review_scoring_ownership',
          }
        : null,
    reviewer_context: await loadSprintPartyContext(trx, reviewer, sprint),
    counterparty_context: await loadSprintPartyContext(trx, targetUser, sprint),
    related_project_tasks: await loadProjectTaskRows(trx, sprint.projectId),
    sprint_peer_tasks: await loadSprintTaskRows(trx, sprint.id),
    manager_assigned_tasks: managerAssignedTasks,
  }
}

export async function seedSprintReviewDisputes(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  context: SeedContext
): Promise<void> {
  const scenario = runtime.requireValue(
    DISPUTE_SCENARIO_SPECS.find((item) => item.key === 'managerSprintPlanningAmbiguity'),
    'dispute-scenario:managerSprintPlanningAmbiguity'
  )
  const sprintKey = runtime.requireValue(scenario.sprint, `${scenario.key}:sprint`)
  const sprint = runtime.requireValue(context.sprints[sprintKey], `sprint:${sprintKey}`)
  const reviewer = context.users[scenario.worker]
  const counterparty = context.users[scenario.counterparty]
  const reviewPackageId = packageId(sprint.id, scenario.worker)
  const existing = (await findRow(trx, 'sprint_review_disputes', {
    package_id: reviewPackageId,
  })) as SprintReviewDisputeRow | null
  const disputeId = existing?.id ?? `${reviewPackageId}-manager-review-dispute`
  const primaryTask = runtime.requireValue(
    context.tasks[scenario.primaryTask],
    scenario.primaryTask
  )
  const relatedTasks = scenario.relatedTasks
    .map((taskKey) => context.tasks[taskKey])
    .filter((task): task is SeededTask => Boolean(task))
  const managerReviews = (await trx
    .from('sprint_manager_reviews')
    .where('package_id', reviewPackageId)
    .select('*')) as Record<string, unknown>[]
  const environmentReviews = (await trx
    .from('sprint_environment_reviews')
    .where('package_id', reviewPackageId)
    .select('*')) as Record<string, unknown>[]
  const comments = [
    {
      author_id: reviewer.id,
      body: 'Rubric examples for sprint planning arrived after the main implementation decisions.',
    },
    {
      author_id: counterparty.id,
      body: 'The sprint goal was stable, but the scoring examples should have been attached earlier.',
    },
  ]
  const runtimeContext = {
    schema_version: 'suar_sprint_review_dispute_runtime_context_v1',
    source_type: 'sprint_review_dispute',
    dispute_review_type: scenario.reviewType,
    dispute: {
      id: disputeId,
      dispute_reason:
        'Manager review needs admin context because rubric examples arrived after delivery decisions.',
      requested_outcome: scenario.expectedDecision ?? 'partially_accept',
    },
    organization: context.organizations[scenario.organization],
    project: context.projects[scenario.project],
    sprint,
    package: { id: reviewPackageId, reviewer_id: reviewer.id },
    target: {
      type: scenario.reviewType,
      manager_target_user_ids: [counterparty.id],
      environment_targets: [],
    },
    reviewer_context: await loadSprintPartyContext(trx, reviewer, sprint),
    counterparty_context: await loadSprintPartyContext(trx, counterparty, sprint),
    manager_reviews: managerReviews,
    environment_reviews: environmentReviews,
    related_project_tasks: await loadSeedTaskRows(trx, [primaryTask, ...relatedTasks]),
    sprint_peer_tasks: await loadSprintTaskRows(trx, sprint.id),
    manager_assigned_tasks: await loadManagerAssignedTasks(
      trx,
      sprint,
      reviewer.id,
      counterparty.id
    ),
    comments,
  }
  const payload = {
    package_id: reviewPackageId,
    opened_by: reviewer.id,
    status: 'resolved',
    dispute_review_type: scenario.reviewType,
    dispute_reason:
      'Manager review needs admin context because rubric examples arrived after delivery decisions.',
    requested_outcome: scenario.expectedDecision ?? 'partially_accept',
    reported_to_admin_at: runtime.isoDaysAgo(0, 12),
    reported_to_admin_by: reviewer.id,
    escalation_reason: scenario.evidenceSummary,
    resolved_at: runtime.isoDaysAgo(0, 16),
    resolved_by: context.users.superadmin.id,
    final_decision: scenario.expectedDecision ?? 'partially_accept',
    final_rationale:
      'Demo resolution: manager review is partially accepted because sprint handoff was useful, but rubric examples arrived late.',
    runtime_context: runtime.toJson(runtimeContext),
    created_at: runtime.isoDaysAgo(1, 16),
    updated_at: runtime.isoDaysAgo(0, 16),
  }

  if (existing) {
    await trx.from('sprint_review_disputes').where('id', disputeId).update(payload)
  } else {
    await trx
      .insertQuery()
      .table('sprint_review_disputes')
      .insert({ id: disputeId, ...payload })
  }

  await trx.from('sprint_review_dispute_comments').where('dispute_id', disputeId).delete()
  await trx.table('sprint_review_dispute_comments').multiInsert(
    comments.map((comment, index) => ({
      id: runtime.uuid(),
      dispute_id: disputeId,
      author_id: comment.author_id,
      body: comment.body,
      visibility: 'all_parties',
      created_at: runtime.isoDaysAgo(0, 10 + index),
      updated_at: runtime.isoDaysAgo(0, 10 + index),
      deleted_at: null,
    }))
  )
}

export async function seedSprints(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  users: Record<UserKey, SeededUser>,
  projects: Record<ProjectKey, SeededProject>,
  tasks: Record<string, SeededTask>
): Promise<Record<string, SeededSprint>> {
  const sprints: Record<string, SeededSprint> = {}

  for (const spec of SPRINT_SPECS) {
    const sprint = await upsertSprint(runtime, trx, spec, users, projects)
    await linkTasksToSprint(trx, sprint, spec, tasks)
    sprints[spec.key] = sprint

    if (spec.status !== 'review_open') {
      continue
    }

    for (const packageSpec of REVIEW_PACKAGE_SPECS) {
      await upsertPackage(
        runtime,
        trx,
        sprint,
        users[packageSpec.reviewer],
        packageSpec.status,
        packageId(sprint.id, packageSpec.reviewer)
      )
    }

    await upsertSprintReviews(runtime, trx, sprint, users)
    await upsertReverseReviewWorkflows(runtime, trx, sprint, users)
  }

  return sprints
}
