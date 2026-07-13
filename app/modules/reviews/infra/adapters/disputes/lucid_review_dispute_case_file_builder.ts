import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { computeDisputeCaseFileCompleteness } from '#modules/reviews/domain/disputes/review_dispute_rules'
import {
  loadReviewDisputeComments,
  loadReviewDisputeEvidences,
} from '#modules/reviews/infra/repositories/read/review_dispute_artifact_queries'

export interface BuiltReviewDisputeCaseFileRecord {
  id: string
  caseVersion: number
  completenessScore: number
  row: Record<string, unknown>
}

type TaskContextRow = Record<string, unknown> & {
  id?: string
  organization_id?: string | null
  project_id?: string | null
  project_sprint_id?: string | null
}

const CONTEXT_TASK_COLUMNS = [
  'id',
  'title',
  'description',
  'status',
  'priority',
  'task_type',
  'business_domain',
  'project_business_domains',
  'problem_category',
  'role_in_task',
  'assigned_to',
  'creator_id',
  'organization_id',
  'project_id',
  'project_sprint_id',
  'due_date',
  'estimated_time',
  'actual_time',
  'acceptance_criteria',
  'verification_method',
  'updated_at',
]

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

function jsonFields(row: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const output = { ...row }
  for (const key of keys) {
    if (key in output) {
      output[key] = parseJsonValue(output[key])
    }
  }
  return output
}

function compactTask(row: Record<string, unknown>): Record<string, unknown> {
  return jsonFields(row, [
    'domain_tags',
    'project_business_domains',
    'expected_deliverables',
    'learning_objectives',
    'measurable_outcomes',
    'tech_stack',
  ])
}

function compactProfile(row: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!row) return {}

  return jsonFields(row, [
    'summary',
    'skills_verified',
    'work_highlights',
    'performance_metrics',
    'trust_metrics',
  ])
}

function compactWorkHistory(row: Record<string, unknown>): Record<string, unknown> {
  return jsonFields(row, [
    'tech_stack',
    'domain_tags',
    'measurable_outcomes',
    'knowledge_artifacts',
    'skill_scores',
    'evidence_links',
  ])
}

function addMissingData(missingData: string[], key: string): void {
  if (!missingData.includes(key)) {
    missingData.push(key)
  }
}

function normalizeOptionalIdentifier(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

async function loadOrganizationContext(
  trx: TransactionClientContract,
  organizationId: unknown
): Promise<Record<string, unknown>> {
  const normalizedOrganizationId = normalizeOptionalIdentifier(organizationId)
  if (!normalizedOrganizationId) return {}

  const organization = (await trx
    .from('organizations')
    .where('id', normalizedOrganizationId)
    .select('id', 'name', 'slug', 'plan', 'owner_id', 'created_at', 'updated_at')
    .first()) as Record<string, unknown> | undefined

  return organization ?? { id: normalizedOrganizationId }
}

async function loadProjectContext(
  trx: TransactionClientContract,
  projectId: unknown,
  sprintId: unknown
): Promise<Record<string, unknown>> {
  const normalizedProjectId = normalizeOptionalIdentifier(projectId)
  if (!normalizedProjectId) return {}
  const normalizedSprintId = normalizeOptionalIdentifier(sprintId)

  const project = (await trx
    .from('projects')
    .where('id', normalizedProjectId)
    .select(
      'id',
      'name',
      'description',
      'status',
      'visibility',
      'organization_id',
      'owner_id',
      'manager_id',
      'creator_id',
      'start_date',
      'end_date',
      'tags',
      'business_domains',
      'updated_at'
    )
    .first()) as Record<string, unknown> | undefined

  const sprint = normalizedSprintId
    ? ((await trx
        .from('project_sprints')
        .where('id', normalizedSprintId)
        .select(
          'id',
          'name',
          'goal',
          'status',
          'organization_id',
          'project_id',
          'starts_at',
          'ends_at',
          'review_opened_at',
          'review_closed_at',
          'updated_at'
        )
        .first()) as Record<string, unknown> | undefined)
    : undefined

  const context = project
    ? jsonFields(project, ['tags', 'business_domains'])
    : { id: normalizedProjectId }
  if (normalizedSprintId) {
    context['sprint_id'] = normalizedSprintId
  }
  if (sprint) {
    context['sprint'] = sprint
  }

  return context
}

async function loadTaskPeers(
  trx: TransactionClientContract,
  task: TaskContextRow | undefined,
  mode: 'project' | 'sprint'
): Promise<Record<string, unknown>[]> {
  const projectId = task?.project_id ?? null
  const sprintId = task?.project_sprint_id ?? null
  const taskId = task?.id ?? null
  if (!projectId || !taskId) return []
  if (mode === 'sprint' && !sprintId) return []

  const query = trx
    .from('tasks')
    .where('project_id', projectId)
    .whereNot('id', taskId)
    .whereNull('deleted_at')
    .select(...CONTEXT_TASK_COLUMNS)
    .orderBy('updated_at', 'desc')
    .limit(20)

  if (mode === 'sprint' && sprintId) {
    void query.where('project_sprint_id', sprintId)
  }

  const rows = (await query) as Record<string, unknown>[]
  return rows.map((row) => compactTask(row))
}

async function loadPartyContext(
  trx: TransactionClientContract,
  userId: unknown,
  organizationId: unknown,
  projectId: unknown
): Promise<Record<string, unknown>> {
  const normalizedUserId = normalizeOptionalIdentifier(userId)
  const base: Record<string, unknown> = {
    user_id: normalizedUserId,
    profile: {},
    work_schedule: [],
    task_history: [],
  }

  if (!normalizedUserId) return base
  const normalizedOrganizationId = normalizeOptionalIdentifier(organizationId)
  const normalizedProjectId = normalizeOptionalIdentifier(projectId)

  const user = (await trx
    .from('users')
    .where('id', normalizedUserId)
    .select('id', 'username', 'system_role', 'current_organization_id', 'timezone', 'status')
    .first()) as Record<string, unknown> | undefined

  const profile = (await trx
    .from('user_profile_snapshots')
    .where('user_id', normalizedUserId)
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

  const historyQuery = trx
    .from('user_work_history')
    .where('user_id', normalizedUserId)
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
      'autonomy_level',
      'collaboration_type',
      'tech_stack',
      'domain_tags',
      'difficulty',
      'estimated_hours',
      'actual_hours',
      'was_on_time',
      'days_early_or_late',
      'measurable_outcomes',
      'estimated_business_value',
      'knowledge_artifacts',
      'overall_quality_score',
      'skill_scores',
      'evidence_links',
      'is_featured',
      'is_public',
      'completed_at'
    )
    .orderBy('completed_at', 'desc')
    .orderBy('created_at', 'desc')
    .limit(10)

  if (normalizedOrganizationId) {
    void historyQuery.where('organization_id', normalizedOrganizationId)
  }
  if (normalizedProjectId) {
    void historyQuery.where('project_id', normalizedProjectId)
  }

  const scheduleQuery = trx
    .from('tasks')
    .whereNull('deleted_at')
    .where((builder) => {
      void builder.where('assigned_to', normalizedUserId).orWhere('creator_id', normalizedUserId)
    })
    .select(...CONTEXT_TASK_COLUMNS)
    .orderBy('due_date', 'asc')
    .orderBy('updated_at', 'desc')
    .limit(10)

  if (normalizedOrganizationId) {
    void scheduleQuery.where('organization_id', normalizedOrganizationId)
  }
  if (normalizedProjectId) {
    void scheduleQuery.where('project_id', normalizedProjectId)
  }

  const taskHistory = (await historyQuery) as Record<string, unknown>[]
  const workSchedule = (await scheduleQuery) as Record<string, unknown>[]

  return {
    ...base,
    user_id: normalizedUserId,
    username: user?.['username'] ?? null,
    system_role: user?.['system_role'] ?? null,
    current_organization_id: user?.['current_organization_id'] ?? null,
    timezone: user?.['timezone'] ?? null,
    status: user?.['status'] ?? null,
    profile: compactProfile(profile),
    work_schedule: workSchedule.map((row) => compactTask(row)),
    task_history: taskHistory.map((row) => compactWorkHistory(row)),
  }
}

export async function buildReviewDisputeCaseFileRecord(
  trx: TransactionClientContract,
  disputeId: string,
  actorId: string
): Promise<BuiltReviewDisputeCaseFileRecord> {
  const dispute = (await trx.from('review_disputes').where('id', disputeId).first()) as
    | {
        id: string
        task_id: string
        task_assignment_id: string
        review_session_id: string
        reviewee_id: string
        dispute_reason: string
        requested_outcome: string
      }
    | undefined

  if (!dispute) {
    throw new NotFoundException('Review dispute not found')
  }

  const task = (await trx.from('tasks').where('id', dispute.task_id).first()) as
    | (Record<string, unknown> & { acceptance_criteria?: string; verification_method?: string })
    | undefined
  const assignment = (await trx
    .from('task_assignments')
    .where('id', dispute.task_assignment_id)
    .first()) as Record<string, unknown> | undefined
  const review = (await trx
    .from('review_sessions')
    .where('id', dispute.review_session_id)
    .first()) as Record<string, unknown> | undefined
  const requiredSkills = (await trx
    .from('task_required_skills')
    .where('task_id', dispute.task_id)
    .select('*')) as Record<string, unknown>[]
  const skillReviews = (await trx
    .from('skill_reviews')
    .where('review_session_id', dispute.review_session_id)
    .select('*')) as Record<string, unknown>[]
  const submission = (await trx
    .from('task_submissions')
    .where('task_id', dispute.task_id)
    .first()) as (Record<string, unknown> & { id: string }) | undefined
  const taskComments = (await trx
    .from('task_comments')
    .where('task_id', dispute.task_id)
    .whereNull('deleted_at')
    .select('*')) as Record<string, unknown>[]
  const disputeComments = (await loadReviewDisputeComments(trx, disputeId))
  const taskHistory = (await trx
    .from('task_versions')
    .where('task_id', dispute.task_id)
    .orderBy('changed_at', 'asc')) as Record<string, unknown>[]

  const evidences = await loadReviewDisputeEvidences(trx, disputeId)

  const latest = (await trx
    .from('review_dispute_case_files')
    .where('dispute_id', disputeId)
    .max('case_version as latest_version')
    .first()) as { latest_version: number | null } | undefined

  const nextVersion = (latest?.latest_version ?? 0) + 1
  const { completenessScore, missingData } = computeDisputeCaseFileCompleteness({
    task,
    assignment,
    review,
    submission,
    requiredSkills,
    skillReviews,
  })
  const typedTask = task as TaskContextRow | undefined
  const assignerId = assignment?.['assigned_by'] ?? task?.['creator_id']
  const organizationContext = await loadOrganizationContext(trx, typedTask?.organization_id)
  const projectContext = await loadProjectContext(
    trx,
    typedTask?.project_id,
    typedTask?.project_sprint_id
  )
  const relatedProjectTasks = await loadTaskPeers(trx, typedTask, 'project')
  const sprintPeerTasks = await loadTaskPeers(trx, typedTask, 'sprint')
  const reviewerContext = await loadPartyContext(
    trx,
    assignerId,
    typedTask?.organization_id,
    typedTask?.project_id
  )
  const revieweeContext = await loadPartyContext(
    trx,
    dispute.reviewee_id,
    typedTask?.organization_id,
    typedTask?.project_id
  )
  const taskSnapshot = {
    ...compactTask(task ?? {}),
    organization: organizationContext,
    project: projectContext,
    related_project_tasks: relatedProjectTasks,
    sprint_peer_tasks: sprintPeerTasks,
  }
  const contextualMissingData = [...missingData]

  if (Object.keys(organizationContext).length === 0) {
    addMissingData(contextualMissingData, 'organization_context')
  }
  if (Object.keys(projectContext).length === 0) {
    addMissingData(contextualMissingData, 'project_context')
  }
  if (relatedProjectTasks.length === 0) {
    addMissingData(contextualMissingData, 'related_project_tasks')
  }
  if (sprintPeerTasks.length === 0) {
    addMissingData(contextualMissingData, 'sprint_peer_tasks')
  }
  if (Object.keys((reviewerContext['profile'] ?? {})).length === 0) {
    addMissingData(contextualMissingData, 'reviewer_profile_context')
  }
  if (
    !Array.isArray(reviewerContext['work_schedule']) ||
    reviewerContext['work_schedule'].length === 0
  ) {
    addMissingData(contextualMissingData, 'reviewer_work_schedule_context')
  }
  if (Object.keys((revieweeContext['profile'] ?? {})).length === 0) {
    addMissingData(contextualMissingData, 'reviewee_profile_context')
  }
  if (
    !Array.isArray(revieweeContext['work_schedule']) ||
    revieweeContext['work_schedule'].length === 0
  ) {
    addMissingData(contextualMissingData, 'reviewee_work_schedule_context')
  }

  const [created] = (await trx
    .table('review_dispute_case_files')
    .insert({
      dispute_id: disputeId,
      case_version: nextVersion,
      task_snapshot: JSON.stringify(taskSnapshot),
      required_skills_snapshot: JSON.stringify(requiredSkills),
      acceptance_criteria_snapshot: JSON.stringify({
        acceptance_criteria: task?.acceptance_criteria ?? null,
        verification_method: task?.verification_method ?? null,
      }),
      assignment_snapshot: JSON.stringify(assignment ?? {}),
      submission_snapshot: JSON.stringify(submission ?? {}),
      review_snapshot: JSON.stringify(review ?? {}),
      skill_reviews_snapshot: JSON.stringify(skillReviews),
      evidences_snapshot: JSON.stringify(evidences),
      self_assessment_snapshot: JSON.stringify({}),
      task_comments_snapshot: JSON.stringify(taskComments),
      task_history_snapshot: JSON.stringify(taskHistory),
      reviewee_profile_context_snapshot: JSON.stringify(revieweeContext),
      reviewer_context_snapshot: JSON.stringify(reviewerContext),
      dispute_claim_snapshot: JSON.stringify({
        dispute_id: dispute.id,
        dispute_review_type: 'task_review',
        dispute_reason: dispute.dispute_reason,
        requested_outcome: dispute.requested_outcome,
        dispute_comments: disputeComments,
      }),
      completeness_score: completenessScore,
      missing_data: JSON.stringify(contextualMissingData.map((key) => ({ key }))),
      created_by: actorId,
    })
    .returning('*')) as [Record<string, unknown>]

  return {
    id: String(created['id']),
    caseVersion: nextVersion,
    completenessScore,
    row: created,
  }
}
