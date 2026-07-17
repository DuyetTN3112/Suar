import db from '@adonisjs/lucid/services/db'

import {
  emptyTaskReviewBoardColumns,
  TASK_REVIEW_WORKFLOW_STATUSES,
  type TaskReviewBoardWorkflowStatus,
  type TaskReviewBoardCard,
  type TaskReviewBoardResult,
  type TaskReviewWorkflowStatus,
} from '#modules/reviews/domain/task-review/task_review_workflow'
import { projectTaskResolvedBrief } from '#modules/tasks/actions/queries/task-reading/internal/task_resolved_brief_projection'
import { LucidTaskResolvedBriefReader } from '#modules/tasks/infra/adapters/task-reading/lucid_task_resolved_brief_reader'
import { TaskStatus, TaskStatusCategory } from '#modules/tasks/public_contracts/task_constants'

const taskResolvedBriefReader = new LucidTaskResolvedBriefReader()

interface DoneTaskRow {
  task_id: string
  title: string
  description: string | null
  task_status: string | null
  priority: string | null
  label: string | null
  difficulty: string | null
  due_date: Date | string | null
  estimated_time: number | string | null
  project_id: string
  assigned_to: string | null
  reviewee_username: string | null
  creator_id: string | null
  creator_username: string | null
  workflow_id?: string | null
  workflow_status?: string | null
  my_reviewer_status?: string | null
  completed_review_count?: number | string | null
  required_review_count?: number | string | null
  updated_at: Date | string | null
}

interface ReviewWorkflowRow {
  id: string
  task_assignment_id: string
}

interface ReviewAssignmentRow {
  id: string
  assignment_status: string
  estimated_hours: number | string | null
  actual_hours: number | string | null
  assigned_at: Date | string | null
  completed_at: Date | string | null
}

interface ReviewSessionRow {
  id: string
}

interface CompletionReportRow {
  id: string
  assignment_snapshot_id: string
  assignment_snapshot_hash: string
  completion_report_hash: string
  task_contract_version_id: string
  task_contract_hash: string
}

interface ReviewReviewerRow {
  reviewer_id: string
  reviewer_role: string
}

interface ReviewMessageRow {
  id: string
  author_id: string
  author_name: string | null
  message_type: string
  body: string
  created_at: Date | string
  updated_at: Date | string
  requires_reviewer_confirmation: boolean
  reviewer_agreed_at: Date | string | null
}

interface ReviewMessageRevisionRow {
  id: string
  message_id: string
  revision_number: number | string
  body: string
  editor_id: string
  editor_name: string | null
  created_at: Date | string
}

export function normalizeWorkflowStatus(
  value: string | null | undefined
): TaskReviewBoardWorkflowStatus {
  if (value === null || value === undefined || value === '') {
    return 'not_opened'
  }

  if (value === 'reviewed') {
    return TASK_REVIEW_WORKFLOW_STATUSES.IN_REVIEW
  }

  const allowed = Object.values(TASK_REVIEW_WORKFLOW_STATUSES)
  return allowed.includes(value as TaskReviewWorkflowStatus)
    ? (value as TaskReviewWorkflowStatus)
    : 'out_of_model'
}

function getLaneStatus(status: TaskReviewBoardWorkflowStatus): TaskReviewWorkflowStatus {
  if (status === 'not_opened') {
    return TASK_REVIEW_WORKFLOW_STATUSES.AWAITING_REVIEW
  }
  if (status === 'out_of_model') {
    return TASK_REVIEW_WORKFLOW_STATUSES.REPORTED
  }
  // AI processing is an internal implementation detail for the user workspace.
  // Keep the card in the user-facing reported lane until the next actionable
  // state (admin review) is reached, including after a page reload.
  if (
    status === TASK_REVIEW_WORKFLOW_STATUSES.AI_REVIEWING ||
    status === TASK_REVIEW_WORKFLOW_STATUSES.AI_FAILED
  ) {
    return TASK_REVIEW_WORKFLOW_STATUSES.REPORTED
  }
  // A resolved review is not yet terminal. It remains visibly separate until
  // an accountable governor explicitly finalizes it to Done.
  return status
}

function isUserVisibleTaskReviewBoardStatus(_status: TaskReviewWorkflowStatus): boolean {
  return true
}

function serializeDate(value: Date | string | null): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  return value
}

function rowToCard(row: DoneTaskRow, currentUserId: string | null): TaskReviewBoardCard {
  const workflowStatus = normalizeWorkflowStatus(row.workflow_status)
  const status = getLaneStatus(workflowStatus)
  const waitingOnMe =
    row.my_reviewer_status === 'pending' ||
    (workflowStatus === TASK_REVIEW_WORKFLOW_STATUSES.AWAITING_RESPONSE &&
      currentUserId !== null &&
      row.assigned_to === currentUserId)
  return {
    taskId: row.task_id,
    workflowId: row.workflow_id ?? null,
    status,
    workflowStatus,
    title: row.title,
    description: row.description,
    taskStatus: row.task_status,
    priority: row.priority,
    label: row.label,
    difficulty: row.difficulty,
    dueDate: serializeDate(row.due_date),
    estimatedTime: row.estimated_time === null ? null : Number(row.estimated_time),
    revieweeId: row.assigned_to,
    revieweeName: row.reviewee_username,
    creatorId: row.creator_id,
    creatorName: row.creator_username,
    projectId: row.project_id,
    reviewCount: Number(row.completed_review_count ?? 0),
    requiredReviewCount:
      workflowStatus === 'not_opened' ? null : Number(row.required_review_count ?? 1),
    lastActivityAt: serializeDate(row.updated_at),
    waitingOnMe,
  }
}

export async function getTaskReviewBoardByProject(
  projectId: string,
  currentUserId: string | null
): Promise<TaskReviewBoardResult> {
  const columns = emptyTaskReviewBoardColumns()

  if (!currentUserId) {
    return {
      projectId,
      columns,
    }
  }

  const rows = (await db
    .from('tasks as t')
    .leftJoin('task_statuses as ts', 'ts.id', 't.task_status_id')
    .leftJoin('task_review_workflows as trw', 'trw.task_id', 't.id')
    .leftJoin('task_review_reviewers as trr', (join) => {
      join.on('trr.workflow_id', 'trw.id')
      if (currentUserId) {
        join.andOnVal('trr.reviewer_id', currentUserId)
      }
    })
    .leftJoin('users as assignee', 'assignee.id', 't.assigned_to')
    .leftJoin('users as creator', 'creator.id', 't.creator_id')
    .where('t.project_id', projectId)
    .whereNull('t.deleted_at')
    .where((query) => {
      void query
        .where('t.status', TaskStatus.DONE)
        .orWhere('ts.slug', TaskStatus.DONE)
        .orWhere('ts.category', TaskStatusCategory.DONE)
    })
    .select(
      't.id as task_id',
      't.title',
      't.description',
      db.raw('COALESCE(ts.slug, t.status) as task_status'),
      't.priority',
      't.label',
      't.difficulty',
      't.due_date',
      't.estimated_time',
      't.project_id',
      't.assigned_to',
      'assignee.username as reviewee_username',
      't.creator_id',
      'creator.username as creator_username',
      'trw.id as workflow_id',
      'trw.status as workflow_status',
      'trr.status as my_reviewer_status',
      'trw.completed_review_count',
      'trw.required_review_count',
      db.raw('COALESCE(trw.updated_at, t.updated_at) as updated_at')
    )
    .orderByRaw('COALESCE(trw.updated_at, t.updated_at) DESC')) as DoneTaskRow[]

  const columnByStatus = new Map(columns.map((column) => [column.status, column]))

  for (const row of rows) {
    const card = rowToCard(row, currentUserId)
    if (!isUserVisibleTaskReviewBoardStatus(card.status)) {
      continue
    }
    columnByStatus.get(card.status)?.cards.push(card)
  }

  return {
    projectId,
    columns,
  }
}

export async function getTaskReviewDetailByTask(
  taskId: string
): Promise<Record<string, unknown> | null> {
  const task = (await db
    .from('tasks as t')
    .leftJoin('task_statuses as ts', 'ts.id', 't.task_status_id')
    .leftJoin('users as assignee', 'assignee.id', 't.assigned_to')
    .leftJoin('users as creator', 'creator.id', 't.creator_id')
    .leftJoin('organizations as organization', 'organization.id', 't.organization_id')
    .leftJoin('projects as project', 'project.id', 't.project_id')
    .leftJoin('project_sprints as sprint', 'sprint.id', 't.project_sprint_id')
    .where('t.id', taskId)
    .whereNull('t.deleted_at')
    .select(
      't.id',
      't.task_status_id',
      't.title',
      't.description',
      db.raw('case when ts.category = ? then ? else coalesce(ts.slug, t.status) end as status', [
        TaskStatusCategory.DONE,
        TaskStatus.DONE,
      ]),
      't.priority',
      't.label',
      't.difficulty',
      't.due_date',
      't.estimated_time',
      't.actual_time',
      't.task_visibility',
      't.created_at',
      't.updated_at',
      't.task_type',
      't.acceptance_criteria',
      't.verification_method',
      't.expected_deliverables',
      't.context_background',
      't.impact_scope',
      't.tech_stack',
      't.environment',
      't.collaboration_type',
      't.complexity_notes',
      't.measurable_outcomes',
      't.learning_objectives',
      't.domain_tags',
      't.role_in_task',
      't.autonomy_level',
      't.problem_category',
      't.business_domain',
      't.project_business_domains',
      't.estimated_users_affected',
      't.project_id',
      't.organization_id',
      't.project_sprint_id as sprint_id',
      'organization.name as organization_name',
      'organization.slug as organization_slug',
      'organization.description as organization_description',
      'project.name as project_name',
      'project.description as project_description',
      'project.status as project_status',
      'project.start_date as project_start_date',
      'project.end_date as project_end_date',
      'project.visibility as project_visibility',
      'project.tags as project_tags',
      'sprint.name as sprint_name',
      'sprint.goal as sprint_goal',
      'sprint.status as sprint_status',
      'sprint.starts_at as sprint_starts_at',
      'sprint.ends_at as sprint_ends_at',
      't.assigned_to',
      'assignee.username as assignee_name',
      't.creator_id',
      'creator.username as creator_name'
    )
    .first()) as Record<string, unknown> | null

  if (!task) {
    return null
  }

  // Review participants and system admins must inspect the same published
  // task contract as the task board. The generic task endpoint intentionally
  // restricts the contract to creator/assignee, so the review projection
  // carries a read-only work-participant projection explicitly.
  const resolvedBriefBundle = await taskResolvedBriefReader.readCurrentBundle(taskId)
  const resolvedBrief = projectTaskResolvedBrief(resolvedBriefBundle, 'work_participant')

  const workflow = (await db
    .from('task_review_workflows')
    .where('task_id', taskId)
    .first()) as ReviewWorkflowRow | null

  const assignmentQuery = db
    .from('task_assignments')
    .select(
      'id',
      'assignment_status',
      'estimated_hours',
      'actual_hours',
      'assigned_at',
      'completed_at'
    )

  if (workflow?.task_assignment_id) {
    void assignmentQuery.where('id', workflow.task_assignment_id)
  } else {
    void assignmentQuery
      .where('task_id', taskId)
      .where('assignment_status', 'completed')
      .orderBy('completed_at', 'desc')
  }

  const assignment = (await assignmentQuery.first()) as ReviewAssignmentRow | null

  const reviewAuthoringContext = workflow?.['task_assignment_id']
    ? await (async () => {
        const session = (await db
          .from('review_sessions')
          .where({
            task_assignment_id: workflow.task_assignment_id,
            reviewee_id: task['assigned_to'],
          })
          .orderBy('updated_at', 'desc')
          .first()) as ReviewSessionRow | null
        const report = (await db
          .from('task_completion_reports')
          .where({
            task_assignment_id: workflow.task_assignment_id,
            report_status: 'submitted',
          })
          .orderBy('revision', 'desc')
          .first()) as CompletionReportRow | null
        if (!session || !report) return null

        const observations = await db
          .from('review_observations as observation')
          .leftJoin(
            'review_observation_revisions as revision',
            'revision.observation_id',
            'observation.id'
          )
          .where('observation.review_workflow_id', workflow.id)
          .whereRaw('revision.revision_number = observation.current_revision_number')
          .select(
            'observation.id',
            'revision.disposition',
            'revision.rationale',
            'revision.governance_state',
            'revision.reviewer_id',
            'revision.reviewer_type',
            'revision.evidence_sufficiency',
            'revision.created_at'
          )
          .orderBy('revision.created_at', 'asc')

        const reviewerRows = (await db
          .from('task_review_reviewers')
          .where('workflow_id', workflow.id)
          .select('reviewer_id', 'reviewer_role')) as ReviewReviewerRow[]
        const reviewerTypes = reviewerRows.map((reviewer) => ({
          reviewer_id: reviewer.reviewer_id,
          reviewer_type: 'human',
        }))
        return {
          reviewPackageAvailable: true,
          reviewSessionId: session.id,
          taskAssignmentId: workflow.task_assignment_id,
          assignmentSnapshotId: report.assignment_snapshot_id,
          assignmentSnapshotHash: report.assignment_snapshot_hash,
          completionReportId: report.id,
          completionReportHash: report.completion_report_hash,
          taskContractVersionId: report.task_contract_version_id,
          taskContractHash: report.task_contract_hash,
          subjectUserId: task['assigned_to'],
          observations,
          reviewerTypes,
        }
      })()
    : null

  const comments = await db
    .from('task_comments as tc')
    .leftJoin('users as author', 'author.id', 'tc.author_id')
    .where('tc.task_id', taskId)
    .whereNull('tc.deleted_at')
    .select(
      'tc.id',
      'tc.body',
      'tc.comment_type',
      'tc.visibility',
      'tc.created_at',
      'author.id as author_id',
      'author.username as author_name'
    )
    .orderBy('tc.created_at', 'asc')

  const reviewers = workflow
    ? await db
        .from('task_review_reviewers as trr')
        .leftJoin('users as reviewer', 'reviewer.id', 'trr.reviewer_id')
        .where('trr.workflow_id', workflow.id)
        .select(
          'trr.id',
          'trr.reviewer_id',
          'reviewer.username as reviewer_name',
          'trr.reviewer_role',
          'trr.status',
          'trr.priority_rank',
          'trr.reviewed_at'
        )
        .orderBy('trr.priority_rank', 'asc')
    : []

  const reviewMessages = workflow
    ? ((await db
        .from('task_review_messages as trm')
        .leftJoin('users as author', 'author.id', 'trm.author_id')
        .where('trm.workflow_id', workflow.id)
        .whereNull('trm.deleted_at')
        .select(
          'trm.id',
          'trm.author_id',
          'author.username as author_name',
          'trm.message_type',
          'trm.parent_review_message_id',
          'trm.reviewee_decision',
          'trm.reviewee_decided_at',
          'trm.requires_reviewer_confirmation',
          'trm.reviewer_agreed_at',
          'trm.body',
          'trm.created_at',
          'trm.updated_at'
        )
        .orderBy('trm.created_at', 'asc')) as ReviewMessageRow[])
    : []

  const reviewMessageIds = reviewMessages.map((message) => message['id'])
  const reviewRevisions =
    reviewMessageIds.length > 0
      ? ((await db
          .from('task_review_message_revisions as revision')
          .leftJoin('users as editor', 'editor.id', 'revision.editor_id')
          .whereIn('revision.message_id', reviewMessageIds)
          .select(
            'revision.id',
            'revision.message_id',
            'revision.revision_number',
            'revision.body',
            'revision.editor_id',
            'editor.username as editor_name',
            'revision.created_at'
          )
          .orderBy('revision.revision_number', 'asc')) as ReviewMessageRevisionRow[])
      : []
  const revisionsByMessageId = new Map<string, ReviewMessageRevisionRow[]>()
  for (const revision of reviewRevisions) {
    const messageId = revision['message_id']
    const revisions = revisionsByMessageId.get(messageId) ?? []
    revisions.push(revision)
    revisionsByMessageId.set(messageId, revisions)
  }
  const reviewMessagesWithHistory = reviewMessages.map((message) => {
    const revisions = revisionsByMessageId.get(message['id']) ?? []
    return {
      ...message,
      revision_count: revisions.length,
      revisions,
    }
  })

  return {
    task: { ...task, resolved_brief: resolvedBrief },
    assignment,
    workflow,
    reviewers,
    comments,
    reviewMessages: reviewMessagesWithHistory,
    reviewAuthoringContext,
  }
}
