import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { DISPUTE_SCENARIO_SPECS } from '../dispute_scenario_specs.js'
import type { SeedRuntime } from '../seed_runtime.js'
import { findRow } from '../seed_utils.js'
import type {
  SeededSprint,
  SeededTask,
  SeededUser,
  SeedContext,
  UserKey,
} from '../types.js'

import {
  loadManagerAssignedTasks,
  loadProjectTaskRows,
  loadSeedTaskRows,
  loadSprintPartyContext,
  loadSprintTaskRows,
  packageId,
} from './sprint_context_loader.js'

export interface WorkflowSeedSpec {
  reviewer: UserKey
  targetType: 'assigner' | 'environment'
  targetUser?: UserKey
  status: 'awaiting_review' | 'awaiting_response' | 'reported' | 'resolved' | 'done'
  rating: number | null
  comment: string | null
  scenarioKey?: string
}

interface SprintReviewDisputeRow {
  id: string
}

export const WORKFLOW_SPECS: WorkflowSeedSpec[] = [
  {
    reviewer: 'owner',
    targetType: 'environment',
    status: 'done',
    rating: 5,
    comment:
      'Sprint có thứ tự ưu tiên rõ ràng, reviewer phản hồi nhanh và đủ ngữ cảnh để hoàn tất hạng mục hồ sơ năng lực.',
  },
  {
    reviewer: 'member',
    targetType: 'assigner',
    targetUser: 'orgAdmin',
    status: 'awaiting_response',
    rating: 4,
    comment:
      'Việc bàn giao nhiệm vụ rõ ràng, nhưng nếu có ghi chú rubric sớm hơn thì sẽ giảm được trao đổi qua lại khi review.',
  },
  {
    reviewer: 'orgAdmin',
    targetType: 'environment',
    status: 'resolved',
    rating: 2,
    comment:
      'Môi trường làm việc bộc lộ điểm chưa rõ về trách nhiệm chấm điểm review, gây ách tắc khi chốt sprint.',
    scenarioKey: 'environmentOwnershipAmbiguity',
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

export async function upsertWorkflowMessages(
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
      body: 'Cảm ơn phản hồi của bạn. Kế hoạch sprint tới sẽ giữ lại các điểm mạnh và làm rõ hơn các điểm bàn giao.',
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
      body: 'Báo cáo phiên đánh giá môi trường này lên quản trị viên vì điểm chưa rõ về trách nhiệm chấm điểm đã ảnh hưởng tới việc chốt sprint.',
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

export async function buildReverseReviewRuntimeContext(
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

export async function upsertReverseReviewWorkflows(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  sprint: SeededSprint,
  users: Record<UserKey, SeededUser>
): Promise<void> {
  for (const spec of WORKFLOW_SPECS) {
    const scenario = spec.scenarioKey
      ? DISPUTE_SCENARIO_SPECS.find((item) => item.key === spec.scenarioKey)
      : undefined
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
      final_decision:
        spec.status === 'resolved' ? (scenario?.expectedDecision ?? 'request_re_review') : null,
      final_rationale:
        spec.status === 'resolved'
          ? (scenario?.evidenceSummary ??
            'Cần thực hiện lại đánh giá môi trường sau khi phân định rõ trách nhiệm của người giao việc, người phản hồi và người chấm điểm.')
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
      body: 'Ví dụ rubric cho việc lập kế hoạch sprint chỉ được gửi sau khi các quyết định triển khai chính đã chốt.',
    },
    {
      author_id: counterparty.id,
      body: 'Mục tiêu sprint ổn định, nhưng lẽ ra ví dụ chấm điểm cần được đính kèm sớm hơn.',
    },
  ]
  const runtimeContext = {
    schema_version: 'suar_sprint_review_dispute_runtime_context_v1',
    source_type: 'sprint_review_dispute',
    dispute_review_type: scenario.reviewType,
    dispute: {
      id: disputeId,
      dispute_reason:
        'Phiên đánh giá của quản lý cần thêm ngữ cảnh từ quản trị viên vì ví dụ rubric được cung cấp sau khi các quyết định bàn giao đã chốt.',
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
      'Phiên đánh giá của quản lý cần thêm ngữ cảnh từ quản trị viên vì ví dụ rubric được cung cấp sau khi các quyết định bàn giao đã chốt.',
    requested_outcome: scenario.expectedDecision ?? 'partially_accept',
    reported_to_admin_at: runtime.isoDaysAgo(0, 12),
    reported_to_admin_by: reviewer.id,
    escalation_reason: scenario.evidenceSummary,
    resolved_at: runtime.isoDaysAgo(0, 16),
    resolved_by: context.users.superadmin.id,
    final_decision: scenario.expectedDecision ?? 'partially_accept',
    final_rationale:
      'Ý kiến về chất lượng bàn giao được ghi nhận một phần; nhóm vẫn hoàn thành mục tiêu sprint nhưng người quản lý cần cung cấp ví dụ rubric sớm hơn ở chu kỳ tiếp theo.',
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
