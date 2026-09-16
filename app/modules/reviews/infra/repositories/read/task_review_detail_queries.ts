import db from '@adonisjs/lucid/services/db'

import { projectTaskResolvedBrief } from '#modules/tasks/actions/queries/task-reading/internal/task_resolved_brief_projection'
import { LucidTaskResolvedBriefReader } from '#modules/tasks/infra/adapters/task-reading/lucid_task_resolved_brief_reader'
import { TaskStatus, TaskStatusCategory } from '#modules/tasks/public_contracts/task_constants'

const taskResolvedBriefReader = new LucidTaskResolvedBriefReader()

export interface ReviewWorkflowRow {
  id: string
  task_assignment_id: string
}

export interface ReviewAssignmentRow {
  id: string
  assignment_status: string
  estimated_hours: number | string | null
  actual_hours: number | string | null
  assigned_at: Date | string | null
  completed_at: Date | string | null
}

export interface ReviewSessionRow {
  id: string
}

export interface CompletionReportRow {
  id: string
  assignment_snapshot_id: string
  assignment_snapshot_hash: string
  completion_report_hash: string
  task_contract_version_id: string
  task_contract_hash: string
}

export interface ReviewReviewerRow {
  reviewer_id: string
  reviewer_role: string
}

export interface ReviewMessageRow {
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

export interface ReviewMessageRevisionRow {
  id: string
  message_id: string
  revision_number: number | string
  body: string
  editor_id: string
  editor_name: string | null
  created_at: Date | string
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
            'evidence_sufficiency',
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
