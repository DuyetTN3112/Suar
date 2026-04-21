import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { SeedRuntime } from './seed_runtime.js'
import { findRow } from './seed_utils.js'
import type {
  SeededAssignment,
  SeededSubmission,
  SeededTask,
  SeededUser,
  TaskSpec,
  UserKey,
} from './types.js'

interface TaskSubmissionSeedRow {
  id: string
  task_assignment_id: string
  task_id: string
  submitted_by: string
  status: string
}

export function shouldSeedTaskSubmission(spec: TaskSpec): boolean {
  return spec.seedGovernanceFixture === true
}

function submissionStatusForTask(spec: TaskSpec): 'draft' | 'submitted' | 'locked' {
  if (spec.status === 'done') return 'locked'
  if (spec.status === 'in_review') return 'submitted'
  return 'draft'
}

function submittedAtForTask(runtime: SeedRuntime, spec: TaskSpec): string | null {
  if (spec.status === 'done') {
    return runtime.isoDaysAgo(spec.assignmentCompletedDaysAgo ?? 4, 16)
  }
  if (spec.status === 'in_review') {
    return runtime.isoDaysAgo(1, 15)
  }
  if (spec.status === 'in_progress') {
    return null
  }
  return null
}

function buildSubmissionSummary(spec: TaskSpec): string {
  if (spec.status === 'done') {
    return `Đã bàn giao "${spec.title}" kèm tiêu chí nghiệm thu, chứng cứ sẵn sàng cho reviewer và trách nhiệm truy vết rõ ràng.`
  }
  if (spec.status === 'in_review') {
    return `"${spec.title}" đã sẵn sàng cho vòng đối chiếu của reviewer, kèm ghi chú triển khai và liên kết chứng cứ.`
  }
  return `"${spec.title}" đang trong quá trình thực hiện, phạm vi, người phụ trách và mốc bàn giao đã được ghi nhận.`
}

function buildEvidenceUrl(taskKey: string, suffix: string): string {
  return `https://workbench.suar.dev/${encodeURIComponent(taskKey)}/${suffix}`
}

async function upsertSubmission(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  spec: TaskSpec,
  task: SeededTask,
  assignment: SeededAssignment
): Promise<TaskSubmissionSeedRow> {
  const existing = (await trx
    .from('task_submissions')
    .where('task_assignment_id', assignment.id)
    .first()) as TaskSubmissionSeedRow | null
  const id = existing?.id ?? runtime.uuid()
  const status = submissionStatusForTask(spec)
  const submittedAt = submittedAtForTask(runtime, spec)
  const payload = {
    task_assignment_id: assignment.id,
    task_id: task.id,
    submitted_by: assignment.assigneeId,
    summary: buildSubmissionSummary(spec),
    implementation_notes:
      status === 'draft'
        ? 'Phạm vi đã được chuẩn bị và người thực hiện đã bắt đầu vòng triển khai đầu tiên.'
        : `Đã hoàn thành: ${spec.expectedDeliverables.join('; ')}. Ghi chú review bám sát tiêu chí nghiệm thu của công việc.`,
    known_limitations:
      spec.status === 'done'
        ? 'Các cải tiến tiếp theo được theo dõi trong kế hoạch dự án, không chặn việc nghiệm thu lần bàn giao này.'
        : 'Chờ vòng kiểm chứng cuối của reviewer và phần hoàn thiện còn lại từ người thực hiện.',
    test_notes:
      status === 'draft'
        ? 'Checklist ban đầu đã chuẩn bị; kiểm chứng cuối sẽ chạy sau khi bàn giao.'
        : 'Đã kiểm chứng theo tiêu chí nghiệm thu và bộ chứng cứ đính kèm.',
    demo_url: status === 'draft' ? null : buildEvidenceUrl(spec.key, 'walkthrough'),
    repository_url: buildEvidenceUrl(spec.key, 'repository'),
    pull_request_url: status === 'draft' ? null : runtime.seedPullRequestUrl(spec.key),
    status,
    submitted_at: submittedAt,
    locked_at: status === 'locked' ? runtime.isoDaysAgo(1, 18) : null,
    updated_at: runtime.isoDaysAgo(status === 'draft' ? 1 : 0),
  }

  if (existing) {
    const [updated] = (await trx
      .from('task_submissions')
      .where('id', id)
      .update(payload)
      .returning('*')) as TaskSubmissionSeedRow[]
    return runtime.requireValue(updated, `updated-task-submission:${assignment.id}`)
  }

  const [created] = (await trx
    .insertQuery()
    .table('task_submissions')
    .insert({ id, ...payload, created_at: runtime.isoDaysAgo(2) })
    .returning('*')) as TaskSubmissionSeedRow[]
  return runtime.requireValue(created, `created-task-submission:${assignment.id}`)
}

async function replaceSubmissionEvidence(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  spec: TaskSpec,
  submission: TaskSubmissionSeedRow
): Promise<void> {
  await trx.from('task_submission_evidences').where('submission_id', submission.id).delete()

  if (submission.status === 'draft') {
    return
  }

  const rows = [
    {
      id: runtime.uuid(),
      submission_id: submission.id,
      evidence_type: 'pull_request',
      url: runtime.seedPullRequestUrl(spec.key),
      title: `Pull request: ${spec.title}`,
      description: 'Các thay đổi triển khai chính và trao đổi của reviewer.',
      uploaded_by: submission.submitted_by,
      created_at: runtime.isoDaysAgo(1),
    },
    {
      id: runtime.uuid(),
      submission_id: submission.id,
      evidence_type: 'test_report',
      url: buildEvidenceUrl(spec.key, 'verification-report'),
      title: `Báo cáo kiểm chứng: ${spec.title}`,
      description: 'Tiêu chí nghiệm thu, ghi chú reviewer và kết quả kiểm chứng.',
      uploaded_by: submission.submitted_by,
      created_at: runtime.isoDaysAgo(1, 14),
    },
  ]

  await trx.table('task_submission_evidences').multiInsert(rows)
}

async function upsertSubmittedSnapshot(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  spec: TaskSpec,
  task: SeededTask,
  assignment: SeededAssignment
): Promise<void> {
  const existing = await findRow(trx, 'task_assignment_snapshots', {
    task_assignment_id: assignment.id,
    snapshot_reason: 'submitted',
  })
  const requiredSkills = await trx
    .from('task_required_skills')
    .where('task_id', task.id)
    .select('*')
  const payload = {
    task_id: task.id,
    task_snapshot: runtime.toJson({
      id: task.id,
      title: task.title,
      status: spec.status,
      organization_id: task.organizationId,
      project_id: task.projectId,
      verification_method: spec.verificationMethod,
      acceptance_criteria: spec.acceptanceCriteria.join('\n'),
      task_type: spec.taskType,
      difficulty: spec.difficulty,
      expected_deliverables: spec.expectedDeliverables,
    }),
    required_skills_snapshot: runtime.toJson(requiredSkills),
    acceptance_criteria_snapshot: runtime.toJson({
      acceptance_criteria: spec.acceptanceCriteria,
      verification_method: spec.verificationMethod,
    }),
    workflow_snapshot: runtime.toJson({
      status: spec.status,
      task_status: spec.taskStatus,
      assignment_status: spec.status === 'done' ? 'completed' : 'active',
    }),
    created_at: runtime.isoDaysAgo(1),
  }

  if (existing) {
    await trx.from('task_assignment_snapshots').where('id', existing.id).update(payload)
    return
  }

  await trx.insertQuery().table('task_assignment_snapshots').insert({
    id: runtime.uuid(),
    task_assignment_id: assignment.id,
    snapshot_reason: 'submitted',
    ...payload,
  })
}

async function upsertTaskComments(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  spec: TaskSpec,
  task: SeededTask,
  users: Record<UserKey, SeededUser>
): Promise<void> {
  const comments = [
    {
      author_id: users[spec.creator].id,
      body: `Rà soát phạm vi cho "${spec.title}": tiêu chí nghiệm thu, người phụ trách và luồng bàn giao cho reviewer đã thống nhất.`,
      review_relevance: true,
      created_at: runtime.isoDaysAgo(4, 11),
    },
    {
      author_id: spec.assignee ? users[spec.assignee].id : users[spec.creator].id,
      body:
        spec.status === 'done'
          ? 'Gói bàn giao đã sẵn sàng, kèm ghi chú triển khai và chứng cứ kiểm chứng.'
          : 'Tiến độ hiện tại đã được ghi nhận; phần việc còn lại nằm trong đợt bàn giao kế tiếp.',
      review_relevance: spec.status !== 'todo',
      created_at: runtime.isoDaysAgo(2, 15),
    },
  ]

  for (const comment of comments) {
    const existing = await findRow(trx, 'task_comments', {
      task_id: task.id,
      author_id: comment.author_id,
      body: comment.body,
    })
    const payload = {
      parent_comment_id: null,
      comment_type: 'normal',
      visibility: 'reviewers_only',
      updated_at: comment.created_at,
      deleted_at: null,
      edited_at: null,
      review_relevance: comment.review_relevance,
      created_at: comment.created_at,
    }

    if (existing) {
      await trx.from('task_comments').where('id', existing.id).update(payload)
    } else {
      await trx
        .insertQuery()
        .table('task_comments')
        .insert({ id: runtime.uuid(), task_id: task.id, ...comment, ...payload })
    }
  }
}

async function upsertTaskVersions(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  spec: TaskSpec,
  task: SeededTask,
  users: Record<UserKey, SeededUser>
): Promise<void> {
  const versions = [
    {
      label: 'Initial scope',
      status: 'todo',
      changed_by: users[spec.creator].id,
      changed_at: runtime.isoDaysAgo(18, 10),
    },
    {
      label: spec.status === 'done' ? 'Review handoff' : 'Current delivery plan',
      status: spec.status,
      changed_by: spec.assignee ? users[spec.assignee].id : users[spec.creator].id,
      changed_at: runtime.isoDaysAgo(spec.status === 'done' ? 3 : 1, 16),
    },
  ]

  for (const version of versions) {
    const existing = await findRow(trx, 'task_versions', {
      task_id: task.id,
      label: version.label,
    })
    const payload = {
      title: task.title,
      description: spec.description,
      status: version.status,
      priority: spec.priority,
      difficulty: spec.difficulty,
      assigned_to: spec.assignee ? users[spec.assignee].id : null,
      changed_by: version.changed_by,
      changed_at: version.changed_at,
    }

    if (existing) {
      await trx.from('task_versions').where('id', existing.id).update(payload)
    } else {
      await trx
        .insertQuery()
        .table('task_versions')
        .insert({ id: runtime.uuid(), task_id: task.id, label: version.label, ...payload })
    }
  }
}

export async function seedTaskSubmissions(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  users: Record<UserKey, SeededUser>,
  tasks: Record<string, SeededTask>,
  assignments: Record<string, SeededAssignment>,
  taskSpecs: TaskSpec[]
): Promise<Record<string, SeededSubmission>> {
  const submissions: Record<string, SeededSubmission> = {}

  for (const spec of taskSpecs.filter((item) => assignments[item.key])) {
    const task = runtime.requireValue(tasks[spec.key], `task-submission:${spec.key}`)
    const assignment = runtime.requireValue(
      assignments[spec.key],
      `task-submission-assignment:${spec.key}`
    )

    const existing = (await trx
      .from('task_submissions')
      .where('task_assignment_id', assignment.id)
      .first()) as TaskSubmissionSeedRow | null

    if (!shouldSeedTaskSubmission(spec)) {
      if (existing) {
        await trx.from('task_submission_evidences').where('submission_id', existing.id).delete()
        await trx.from('task_submissions').where('id', existing.id).delete()
      }
      await trx
        .from('task_assignment_snapshots')
        .where('task_assignment_id', assignment.id)
        .where('snapshot_reason', 'submitted')
        .delete()
      continue
    }

    const submission = await upsertSubmission(runtime, trx, spec, task, assignment)

    await replaceSubmissionEvidence(runtime, trx, spec, submission)
    await upsertSubmittedSnapshot(runtime, trx, spec, task, assignment)
    await upsertTaskComments(runtime, trx, spec, task, users)
    await upsertTaskVersions(runtime, trx, spec, task, users)

    submissions[spec.key] = {
      id: submission.id,
      taskId: task.id,
      taskAssignmentId: assignment.id,
    }
  }

  return submissions
}
