import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { stageDomainEvent } from '#modules/events/public_contracts/domain_event_outbox'
import { BACKEND_NOTIFICATION_ENTITY_TYPES } from '#modules/notifications/public_contracts/notification_constants'
import {
  notificationFanoutPublicApi,
  type NotificationFanoutStagerContract,
} from '#modules/notifications/public_contracts/notification_fanout'
import type {
  ReviewTaskWorkflow,
  ReviewTaskWorkflowPersistenceSession,
  TaskReviewMessage,
  TaskReviewDisputeReport,
  WithdrawnTaskReviewMessage,
  ReviewTaskWorkflowSeed,
  ReviewTaskReviewerSuggestion,
  ReviewTaskWorkflowUnitOfWork,
} from '#modules/reviews/actions/ports/outbound/review_task_workflow_unit_of_work'
import type { ReviewTransaction } from '#modules/reviews/actions/ports/outbound/review_transaction'
import type { TaskReviewWorkflowStatus } from '#modules/reviews/domain/task-review/task_review_workflow'
import { lockClassicReviewAssignmentGovernance } from '#modules/reviews/infra/adapters/review-core/lucid_classic_review_governance_lock'
import { toLucidReviewTransaction } from '#modules/reviews/infra/adapters/review-core/lucid_review_transaction_runner'
import { lockTaskReviewWorkflowGovernance } from '#modules/reviews/infra/adapters/task-review/lucid_task_review_workflow_governance_lock'
import {
  aiDisputeAutoQueuePublicApi,
  type AiDisputeAutoQueueCapability,
} from '#modules/reviews/public_contracts/ai_dispute_auto_queue'

interface TaskWorkflowRow {
  id: string
  task_id: string
  task_assignment_id: string | null
  project_id: string
  organization_id: string
  reviewee_id: string | null
  status: TaskReviewWorkflowStatus
  required_review_count: number | string
}

interface PartyContextScope {
  organizationId: string
  projectId: string
  sprintId: string | null
}

interface TaskAssignmentContextRow extends Record<string, unknown> {
  id: string
}

const TASK_CONTEXT_COLUMNS = [
  'id',
  'title',
  'description',
  'acceptance_criteria',
  'status',
  'priority',
  'difficulty',
  'complexity',
  'complexity_notes',
  'estimated_time',
  'actual_time',
  'autonomy_expected',
  'autonomy_level',
  'minimum_level_id',
  'target_level_id',
  'assessment_ceiling_level_id',
  'task_type',
  'business_domain',
  'problem_category',
  'impact_scope',
  'collaboration_type',
  'tech_stack',
  'domain_tags',
  'expected_deliverables',
  'measurable_outcomes',
  'learning_objectives',
  'verification_method',
  'assigned_to',
  'creator_id',
  'organization_id',
  'project_id',
  'project_sprint_id',
  'due_date',
  'updated_at',
]

const SUAR_PROFILE_SCORING_POLICY = {
  version: 'performance_v1',
  authority: 'Suar canonical calculation; AI is advisory only',
  performance_formula: {
    quality_score: 0.35,
    delivery_score: 0.3,
    difficulty_bonus: 0.2,
    consistency_score: 0.15,
  },
  difficulty_weights: {
    easy: 1,
    medium: 1.5,
    hard: 2.5,
    expert: 4,
  },
  actual_difficulty_rule:
    'Do not accept the task giver\'s declared difficulty as fact. Assess it from scope, acceptance criteria, required skills and levels, autonomy, integration or risk, execution evidence, and any self-assessment. If evidence is insufficient, return unknown rather than guessing.',
  profile_update_rule:
    'An AI assessment never changes a profile by itself. Only a system administrator may approve an assessed difficulty; Suar then recalculates the canonical profile aggregates.',
} as const

function mapWorkflow(row: TaskWorkflowRow): ReviewTaskWorkflow {
  return {
    id: row.id,
    taskId: row.task_id,
    taskAssignmentId: row.task_assignment_id,
    projectId: row.project_id,
    organizationId: row.organization_id,
    revieweeId: row.reviewee_id,
    status: row.status,
    requiredReviewCount: Number(row.required_review_count),
  }
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
    if (field in output) {
      output[field] = parseJsonValue(output[field])
    }
  }
  return output
}

function stringField(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function recordValue(value: unknown): Record<string, unknown> {
  const parsed = parseJsonValue(value)
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : {}
}

function recordArray(value: unknown): Record<string, unknown>[] {
  const parsed = parseJsonValue(value)
  return Array.isArray(parsed)
    ? parsed.filter(
        (item): item is Record<string, unknown> =>
          item !== null && typeof item === 'object' && !Array.isArray(item)
      )
    : []
}

function stringArray(value: unknown): string[] {
  const parsed = parseJsonValue(value)
  return Array.isArray(parsed)
    ? parsed.filter((item): item is string => typeof item === 'string')
    : []
}

function buildProfileAssessmentContract(input: {
  task: Record<string, unknown> | undefined
  contractVersions: Record<string, unknown>[]
  readinessAssessments: Record<string, unknown>[]
}): Record<string, unknown> {
  const currentContract = [...input.contractVersions]
    .reverse()
    .find((contract) => Object.keys(recordValue(contract['evidence_contract'])).length > 0)
  const evidence = recordValue(currentContract?.['evidence_contract'])
  const resolved = recordValue(currentContract?.['resolved_contract'])
  const resolvedWork = recordValue(resolved['work'])
  const latestReadiness = input.readinessAssessments.at(-1)

  return {
    schema_version: 'suar.profile_assessment_contract.v2',
    source_contract_version_id: stringField(currentContract?.['id']) || null,
    authoring_mode: stringField(evidence['mode']) || 'operational_only',
    profile_eligibility: evidence['profileEligibility'] === true,
    capabilities: recordArray(evidence['capabilities']).map((capability) => ({
      capability_id: stringField(capability['capabilityId']),
      capability_name: stringField(capability['capabilityName']),
      // Mức khai báo là điều kiện nhận Task. AI phải nhận định riêng mức độ
      // khó thực tế của phần việc và mức người thực hiện đã thể hiện.
      minimum_level: capability['minimumLevel'] ?? null,
      declared_minimum_level: capability['minimumLevel'] ?? null,
      rubric_version_id: capability['rubricVersionId'] ?? null,
      observable_behaviours: stringArray(capability['observableBehaviours']),
    })),
    work_claim_basis: {
      action: resolvedWork['action'] ?? input.task?.['task_type'] ?? null,
      object: resolvedWork['object'] ?? input.task?.['title'] ?? null,
      ownership_level: resolvedWork['ownershipLevel'] ?? null,
      desired_outcome: resolvedWork['desiredOutcome'] ?? input.task?.['acceptance_criteria'] ?? null,
    },
    readiness: recordValue(latestReadiness),
    requires_task_difficulty_assessment: true,
    response_contract: {
      profile_assessment_schema_version: 'suar.ai.profile_assessment.v1',
      per_capability: {
        declared_minimum_level:
          'Echo the declared task-entry level exactly; it is not an AI assessment.',
        proposed_task_difficulty_level:
          'Canonical l0-l14 or null when insufficient evidence. This assesses the work itself and may be lower or higher than the declared task-entry level and the Project range.',
        task_difficulty_assessment_status:
          'supported, higher_evidence, lower_evidence, or insufficient_evidence.',
        task_difficulty_evidence_refs:
          'Non-empty references to the authoritative task/review data used for the work-difficulty conclusion.',
        task_difficulty_rationale:
          'Concise explanation of scope, autonomy, integration, risk, and execution signals; do not infer performer ability from this value.',
        proposed_observed_level:
          'Separate canonical l0-l14 assessment of what the person demonstrated.',
      },
    },
    profile_mutation_permitted: false,
    finalization_gate:
      'AI output is advisory. Only the authoritative Task Review Board Done event may queue governed profile projection; a human approval remains required.',
  }
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
  const performanceStats = (await transaction
    .from('user_performance_stats')
    .where('user_id', userId)
    .orderBy('calculated_at', 'desc')
    .first()) as Record<string, unknown> | undefined
  const verifiedSkills = (await transaction
    .from('user_skills as user_skill')
    .leftJoin('skills as skill', 'skill.id', 'user_skill.skill_id')
    .where('user_skill.user_id', userId)
    .select(
      'user_skill.skill_id as skill_id',
      'skill.skill_name as skill_name',
      'user_skill.verified_public_proficiency_code as verified_public_proficiency_code',
      'user_skill.avg_percentage as avg_percentage',
      'user_skill.confidence as confidence',
      'user_skill.total_reviews as total_reviews',
      'user_skill.evidence_count as evidence_count',
      'user_skill.dispute_pending_count as dispute_pending_count',
      'user_skill.last_calculated_at as last_calculated_at'
    )
    .orderBy('user_skill.avg_percentage', 'desc')
    .limit(30)) as Record<string, unknown>[]
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
  const workScheduleQuery = transaction
    .from('tasks')
    .whereNull('deleted_at')
    .where('organization_id', scope.organizationId)
    .where('project_id', scope.projectId)
    .where((builder) => {
      void builder.where('assigned_to', userId).orWhere('creator_id', userId)
    })
  if (scope.sprintId) {
    void workScheduleQuery.where('project_sprint_id', scope.sprintId)
  }
  const workSchedule = (await workScheduleQuery
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
    canonical_profile_inputs: {
      performance_stats: performanceStats ? parseJsonFields(performanceStats, [
        'tasks_by_difficulty',
        'tasks_by_domain',
        'tasks_by_type',
      ]) : null,
      verified_skills: verifiedSkills,
    },
    work_schedule: workSchedule,
    task_history: taskHistory,
  }
}

async function loadReportRuntimeContext(
  transaction: TransactionClientContract,
  workflowId: string,
  reporterId: string,
  report: TaskReviewDisputeReport
): Promise<Record<string, unknown>> {
  const workflow = (await transaction
    .from('task_review_workflows')
    .where('id', workflowId)
    .firstOrFail()) as Record<string, unknown>
  const taskId = String(workflow['task_id'])
  const task = (await transaction
    .from('tasks')
    .where('id', taskId)
    .select(...TASK_CONTEXT_COLUMNS)
    .first()) as Record<string, unknown> | undefined
  const organizationId =
    stringField(workflow['organization_id']) || stringField(task?.['organization_id'])
  const projectId = stringField(workflow['project_id']) || stringField(task?.['project_id'])
  const sprintId =
    typeof task?.['project_sprint_id'] === 'string' ? task['project_sprint_id'] : null
  const organization = (await transaction
    .from('organizations')
    .where('id', organizationId)
    .select('id', 'name', 'slug', 'plan', 'owner_id')
    .first()) as Record<string, unknown> | undefined
  const project = (await transaction
    .from('projects')
    .where('id', projectId)
    .select('id', 'name', 'status', 'visibility', 'organization_id', 'owner_id', 'manager_id')
    .first()) as Record<string, unknown> | undefined
  const sprint = sprintId
    ? ((await transaction
        .from('project_sprints')
        .where('id', sprintId)
        .select(
          'id',
          'name',
          'goal',
          'status',
          'organization_id',
          'project_id',
          'starts_at',
          'ends_at'
        )
        .first()) as Record<string, unknown> | undefined)
    : null
  const assignment = (await transaction
    .from('task_assignments')
    .where('task_id', taskId)
    .orderBy('id', 'desc')
    .first()) as TaskAssignmentContextRow | undefined
  const reviewers = (await transaction
    .from('task_review_reviewers')
    .where('workflow_id', workflowId)
    .select(
      'id',
      'workflow_id',
      'reviewer_id',
      'reviewer_role',
      'status',
      'priority_rank',
      'reviewed_at'
    )
    .orderBy('priority_rank', 'asc')) as Record<string, unknown>[]
  const messages = (await transaction
    .from('task_review_messages')
    .where('workflow_id', workflowId)
    .select('id', 'workflow_id', 'author_id', 'body', 'message_type', 'metadata', 'created_at')
    .orderBy('created_at', 'asc')) as Record<string, unknown>[]
  const taskComments = (await transaction
    .from('task_comments as task_comment')
    .leftJoin('users as author', 'author.id', 'task_comment.author_id')
    .where('task_comment.task_id', taskId)
    .whereNull('task_comment.deleted_at')
    .select(
      'task_comment.id as id',
      'task_comment.task_id as task_id',
      'task_comment.author_id as author_id',
      'author.username as author_username',
      'task_comment.parent_comment_id as parent_comment_id',
      'task_comment.body as body',
      'task_comment.comment_type as comment_type',
      'task_comment.visibility as visibility',
      'task_comment.review_relevance as review_relevance',
      'task_comment.created_at as created_at',
      'task_comment.edited_at as edited_at'
    )
    .orderBy('task_comment.created_at', 'asc')) as Record<string, unknown>[]
  const requiredSkills = (await transaction
    .from('task_required_skills as requirement')
    .leftJoin('skills as skill', 'skill.id', 'requirement.skill_id')
    .where('requirement.task_id', taskId)
    .select(
      'requirement.skill_id as skill_id',
      'skill.skill_name as skill_name',
      'requirement.required_public_proficiency_code as required_public_proficiency_code',
      'requirement.minimum_level_id as minimum_level_id',
      'requirement.target_level_id as target_level_id',
      'requirement.assessment_ceiling_level_id as assessment_ceiling_level_id',
      'requirement.importance as importance',
      'requirement.weight as weight',
      'requirement.is_mandatory as is_mandatory',
      'requirement.requirement_notes as requirement_notes'
    )) as Record<string, unknown>[]
  const selfAssessment = assignment
    ? ((await transaction
        .from('task_self_assessments')
        .where('task_assignment_id', assignment.id)
        .orderBy('submitted_at', 'desc')
        .first()) as Record<string, unknown> | undefined)
    : undefined
  const [
    attachments,
    submissions,
    taskVersions,
    taskHistory,
    specificationVersions,
    contractVersions,
    supportingReferences,
    readinessAssessments,
  ] = await Promise.all([
    transaction
      .from('task_attachments')
      .where('task_id', taskId)
      .whereNull('deleted_at')
      .orderBy('created_at', 'asc')
      .select('*') as Promise<Record<string, unknown>[]>,
    assignment
      ? (transaction
          .from('task_submissions')
          .where('task_assignment_id', assignment.id)
          .orderBy('created_at', 'asc')
          .select('*') as Promise<Record<string, unknown>[]>)
      : Promise.resolve([]),
    transaction
      .from('task_versions')
      .where('task_id', taskId)
      .orderBy('changed_at', 'asc')
      .select('*') as Promise<Record<string, unknown>[]>,
    transaction
      .from('v_task_history')
      .where('task_id', taskId)
      .orderBy('changed_at', 'asc')
      .select('*') as Promise<Record<string, unknown>[]>,
    transaction
      .from('task_specification_versions')
      .where('task_id', taskId)
      .orderBy('created_at', 'asc')
      .select('*') as Promise<Record<string, unknown>[]>,
    transaction
      .from('task_contract_versions')
      .where('task_id', taskId)
      .orderBy('created_at', 'asc')
      .select('*') as Promise<Record<string, unknown>[]>,
    transaction
      .from('task_supporting_references')
      .where('task_id', taskId)
      .orderBy('created_at', 'asc')
      .select('*') as Promise<Record<string, unknown>[]>,
    transaction
      .from('task_readiness_assessments')
      .where('task_id', taskId)
      .orderBy('created_at', 'asc')
      .select('*') as Promise<Record<string, unknown>[]>,
  ])
  const submissionIds = submissions
    .map((submission) => stringField(submission['id']))
    .filter((submissionId) => submissionId.length > 0)
  const submissionEvidences = submissionIds.length
    ? ((await transaction
        .from('task_submission_evidences')
        .whereIn('submission_id', submissionIds)
        .orderBy('created_at', 'asc')
        .select('*')) as Record<string, unknown>[])
    : []
  const completionReports = submissionIds.length
    ? ((await transaction
        .from('task_completion_reports')
        .whereIn('task_submission_id', submissionIds)
        .orderBy('revision', 'asc')
        .select('*')) as Record<string, unknown>[])
    : []
  const completionReportIds = completionReports
    .map((reportRow) => stringField(reportRow['id']))
    .filter((reportId) => reportId.length > 0)
  const [criterionResults, evidenceManifest, contributorClaims, evidenceMappings] = completionReportIds.length
    ? await Promise.all([
        transaction
          .from('task_completion_criterion_results')
          .whereIn('completion_report_id', completionReportIds)
          .orderBy('id', 'asc')
          .select('*') as Promise<Record<string, unknown>[]>,
        transaction
          .from('task_completion_evidence_manifest')
          .whereIn('completion_report_id', completionReportIds)
          .orderBy('id', 'asc')
          .select('*') as Promise<Record<string, unknown>[]>,
        transaction
          .from('task_completion_contributor_claims')
          .whereIn('completion_report_id', completionReportIds)
          .orderBy('id', 'asc')
          .select('*') as Promise<Record<string, unknown>[]>,
        transaction
          .from('task_completion_evidence_mappings')
          .whereIn('completion_report_id', completionReportIds)
          .orderBy('id', 'asc')
          .select('*') as Promise<Record<string, unknown>[]>,
      ])
    : [[], [], [], []]
  const relatedProjectTasks = (await transaction
    .from('tasks')
    .where('project_id', projectId)
    .whereNull('deleted_at')
    .select(...TASK_CONTEXT_COLUMNS)
    .orderBy('updated_at', 'desc')
    .limit(20)) as Record<string, unknown>[]
  const sprintPeerTasks = sprintId
    ? ((await transaction
        .from('tasks')
        .where('project_sprint_id', sprintId)
        .whereNull('deleted_at')
        .select(...TASK_CONTEXT_COLUMNS)
        .orderBy('updated_at', 'desc')
        .limit(20)) as Record<string, unknown>[])
    : []
  const partyScope = { organizationId, projectId, sprintId }
  const revieweeId =
    typeof workflow['reviewee_id'] === 'string'
      ? workflow['reviewee_id']
      : typeof task?.['assigned_to'] === 'string'
        ? task['assigned_to']
        : null
  const taskGiverId =
    typeof assignment?.['assigned_by'] === 'string'
      ? assignment['assigned_by']
      : typeof task?.['creator_id'] === 'string'
        ? task['creator_id']
        : null
  const reviewerContexts: Record<string, unknown>[] = []
  for (const reviewer of reviewers) {
    reviewerContexts.push({
      reviewer,
      context: await loadPartyContext(
        transaction,
        typeof reviewer['reviewer_id'] === 'string' ? reviewer['reviewer_id'] : null,
        partyScope
      ),
    })
  }

  return {
    schema_version: 'suar_task_review_workflow_runtime_context_v2',
    source_type: 'task_review_workflow',
    dispute_review_type: 'task_review',
    workflow,
    organization: organization ?? { id: organizationId },
    project: project ?? { id: projectId },
    sprint: sprint ?? (sprintId ? { id: sprintId } : null),
    task: task ?? { id: taskId },
    assignment: assignment ?? null,
    task_required_skills: requiredSkills,
    task_self_assessment: selfAssessment ?? null,
    dispute_evidence_package: {
      version: 'suar_dispute_evidence_package_v2',
      task_contract: {
        task,
        required_skills: requiredSkills,
        readiness_assessments: readinessAssessments,
        specification_versions: specificationVersions,
        contract_versions: contractVersions,
        supporting_references: supportingReferences,
        task_versions: taskVersions,
      },
      // These are authoritative platform records, not proof that a worker or
      // task giver has to upload. AI uses them to test claims such as lateness
      // and contradictory reviews against the configured project workflow.
      system_record: {
        authority: 'Suar platform state and immutable audit timestamps',
        task_state: {
          status: task?.['status'] ?? null,
          task_status_id: task?.['task_status_id'] ?? null,
          created_at: task?.['created_at'] ?? null,
          updated_at: task?.['updated_at'] ?? null,
          due_date: task?.['due_date'] ?? null,
        },
        assignment_state: {
          assignment_status: assignment?.['assignment_status'] ?? null,
          assigned_at: assignment?.['assigned_at'] ?? null,
          completed_at: assignment?.['completed_at'] ?? null,
        },
        status_history: taskHistory,
        review_record: messages,
      },
      delivery: {
        assignment: assignment ?? null,
        self_assessment: selfAssessment ?? null,
        submissions,
        submission_evidences: submissionEvidences,
        attachments,
        completion_reports: completionReports,
        criterion_results: criterionResults,
        evidence_manifest: evidenceManifest,
        contributor_claims: contributorClaims,
        evidence_mappings: evidenceMappings,
      },
      discussion: {
        task_comments: taskComments,
        review_messages: messages,
      },
      access_note:
        'System records in this package are authoritative. Attachments, submissions, completion reports, PRs, and QA logs are optional context; their absence is never a failure by the worker or task giver and must not reduce either party credibility.',
    },
    suar_profile_scoring_policy: SUAR_PROFILE_SCORING_POLICY,
    profile_assessment_contract: buildProfileAssessmentContract({
      task,
      contractVersions,
      readinessAssessments,
    }),
    dispute_claim: {
      dispute_type: report.disputeType,
      dispute_reason: report.claim,
      evidence_summary: report.evidence,
      requested_outcome: report.requestedOutcome,
    },
    task_giver_context: await loadPartyContext(transaction, taskGiverId, partyScope),
    reviewee_context: await loadPartyContext(transaction, revieweeId, partyScope),
    reporter_context: await loadPartyContext(transaction, reporterId, partyScope),
    reviewer_contexts: reviewerContexts,
    related_project_tasks: relatedProjectTasks,
    sprint_peer_tasks: sprintPeerTasks,
    comments: messages,
    review_messages: messages,
    task_comments: taskComments,
  }
}

class LucidReviewTaskWorkflowSession implements ReviewTaskWorkflowPersistenceSession {
  constructor(
    private readonly transaction: TransactionClientContract,
    private readonly notificationFanout: NotificationFanoutStagerContract,
    private readonly aiDisputeAutoQueue: AiDisputeAutoQueueCapability
  ) {}

  async findWorkflowByTaskAssignmentId(
    taskAssignmentId: string
  ): Promise<ReviewTaskWorkflow | null> {
    const workflow = (await this.transaction
      .from('task_review_workflows')
      .where('task_assignment_id', taskAssignmentId)
      .first()) as TaskWorkflowRow | undefined

    return workflow ? mapWorkflow(workflow) : null
  }

  async listNativeWorkflowsByTaskId(taskId: string): Promise<ReviewTaskWorkflow[]> {
    const workflows = (await this.transaction
      .from('task_review_workflows')
      .where('task_id', taskId)
      .whereNotNull('task_assignment_id')
      .orderBy('updated_at', 'desc')) as TaskWorkflowRow[]
    return workflows.map(mapWorkflow)
  }

  async loadWorkflow(workflowId: string): Promise<ReviewTaskWorkflow | null> {
    const governance = await lockTaskReviewWorkflowGovernance(this.transaction, workflowId)
    if (!governance) return null
    const workflow = (await this.transaction
      .from('task_review_workflows')
      .where('id', workflowId)
      .first()) as TaskWorkflowRow | undefined

    return workflow ? mapWorkflow(workflow) : null
  }

  async loadWorkflowSeed(
    taskId: string,
    taskAssignmentId: string
  ): Promise<ReviewTaskWorkflowSeed | null> {
    type SeedRow =
      | {
          task_id: string
          task_assignment_id: string
          project_id: string
          organization_id: string
          reviewee_id: string | null
          assigner_id: string | null
          creator_id: string
        }
      | undefined
    const loadSeed = () =>
      this.transaction
        .from('tasks as t')
        .join('task_assignments as ta', 'ta.task_id', 't.id')
        .where('t.id', taskId)
        .where('ta.id', taskAssignmentId)
        .where('ta.assignment_status', 'completed')
        .whereNull('t.deleted_at')
        .select(
          't.id as task_id',
          'ta.id as task_assignment_id',
          't.project_id',
          't.organization_id',
          'ta.assignee_id as reviewee_id',
          't.creator_id',
          'ta.assigned_by as assigner_id'
        )
        .first() as Promise<SeedRow>

    const pointer = await loadSeed()
    if (!pointer) return null
    await lockClassicReviewAssignmentGovernance(this.transaction, {
      taskId,
      assignmentId: taskAssignmentId,
      ...(pointer.reviewee_id ? { expectedAssigneeId: pointer.reviewee_id } : {}),
      expectedAssignmentStatus: 'completed',
    })
    const seed = await loadSeed()

    return seed
      ? {
          taskId: seed.task_id,
          taskAssignmentId: seed.task_assignment_id,
          projectId: seed.project_id,
          organizationId: seed.organization_id,
          revieweeId: seed.reviewee_id,
          assignerId: seed.assigner_id,
          creatorId: seed.creator_id,
        }
      : null
  }

  async listReviewerCandidates(
    projectId: string,
    organizationId: string,
    excludedUserIds: readonly string[]
  ): Promise<
    Array<{ userId: string; projectRole: string | null; organizationRole: string | null }>
  > {
    const candidates = (await this.transaction
      .from('organization_users as ou')
      .leftJoin('project_members as pm', (join) => {
        join.on('pm.user_id', 'ou.user_id').andOnVal('pm.project_id', projectId)
      })
      .where('ou.organization_id', organizationId)
      .where('ou.status', 'approved')
      .whereNotIn('ou.user_id', Array.from(excludedUserIds))
      .select('ou.user_id', 'pm.project_role', 'ou.org_role')
      .select(
        this.transaction.raw(`
          CASE
            WHEN pm.project_role = 'project_owner' THEN 10
            WHEN pm.project_role = 'project_manager' THEN 20
            WHEN ou.org_role = 'org_owner' THEN 30
            WHEN ou.org_role = 'org_admin' THEN 40
            WHEN pm.project_role = 'project_member' THEN 80
            ELSE 100
          END as priority_rank
        `)
      )
      .orderBy('priority_rank', 'asc')
      .orderByRaw('COALESCE(pm.created_at, ou.created_at) asc')) as Array<{
      user_id: string
      project_role: string | null
      org_role: string | null
    }>

    return candidates.map((candidate) => ({
      userId: candidate.user_id,
      projectRole: candidate.project_role,
      organizationRole: candidate.org_role,
    }))
  }

  async listSuggestedReviewerCandidates(
    taskId: string,
    projectId: string,
    organizationId: string,
    excludedUserIds: readonly string[]
  ): Promise<ReviewTaskReviewerSuggestion[]> {
    const candidates = (await this.transaction
      .from('organization_users as ou')
      .leftJoin('project_members as pm', (join) => {
        join.on('pm.user_id', 'ou.user_id').andOnVal('pm.project_id', projectId)
      })
      .where('ou.organization_id', organizationId)
      .where('ou.status', 'approved')
      .whereNotIn('ou.user_id', Array.from(excludedUserIds))
      .where((query) => {
        void query
          .whereIn('pm.project_role', ['project_owner', 'project_manager'])
          .orWhereIn('ou.org_role', ['org_owner', 'org_admin'])
          .orWhereRaw(
            `EXISTS (
              SELECT 1 FROM task_comments AS comment
              WHERE comment.task_id = ?
                AND comment.author_id = ou.user_id
                AND comment.deleted_at IS NULL
            )`,
            [taskId]
          )
          .orWhereRaw(
            `EXISTS (
              SELECT 1
              FROM task_comment_mentions AS mention
              JOIN task_comments AS comment ON comment.id = mention.task_comment_id
              WHERE comment.task_id = ?
                AND comment.deleted_at IS NULL
                AND mention.mentioned_user_id = ou.user_id
            )`,
            [taskId]
          )
          .orWhereRaw(
            `EXISTS (
              SELECT 1
              FROM task_review_reviewers AS historical_reviewer
              JOIN task_review_workflows AS historical_workflow
                ON historical_workflow.id = historical_reviewer.workflow_id
              WHERE historical_workflow.project_id = ?
                AND historical_reviewer.reviewer_id = ou.user_id
                AND historical_reviewer.status = 'submitted'
            )`,
            [projectId]
          )
      })
      .select('ou.user_id', 'pm.project_role', 'ou.org_role')
      .select(
        this.transaction.raw(
          `EXISTS (
            SELECT 1 FROM task_comments AS comment
            WHERE comment.task_id = ?
              AND comment.author_id = ou.user_id
              AND comment.deleted_at IS NULL
          ) AS has_task_comment`,
          [taskId]
        ),
        this.transaction.raw(
          `EXISTS (
            SELECT 1
            FROM task_comment_mentions AS mention
            JOIN task_comments AS comment ON comment.id = mention.task_comment_id
            WHERE comment.task_id = ?
              AND comment.deleted_at IS NULL
              AND mention.mentioned_user_id = ou.user_id
          ) AS is_mentioned_in_task`,
          [taskId]
        ),
        this.transaction.raw(
          `EXISTS (
            SELECT 1
            FROM task_review_reviewers AS historical_reviewer
            JOIN task_review_workflows AS historical_workflow
              ON historical_workflow.id = historical_reviewer.workflow_id
            WHERE historical_workflow.project_id = ?
              AND historical_reviewer.reviewer_id = ou.user_id
              AND historical_reviewer.status = 'submitted'
          ) AS has_review_history`,
          [projectId]
        )
      )
      .orderByRaw(`
        CASE
          WHEN pm.project_role = 'project_owner' THEN 10
          WHEN pm.project_role = 'project_manager' THEN 20
          WHEN ou.org_role = 'org_owner' THEN 30
          WHEN ou.org_role = 'org_admin' THEN 40
          WHEN EXISTS (
            SELECT 1 FROM task_comments AS comment
            WHERE comment.task_id = ?
              AND comment.author_id = ou.user_id
              AND comment.deleted_at IS NULL
          ) THEN 60
          WHEN EXISTS (
            SELECT 1
            FROM task_comment_mentions AS mention
            JOIN task_comments AS comment ON comment.id = mention.task_comment_id
            WHERE comment.task_id = ?
              AND comment.deleted_at IS NULL
              AND mention.mentioned_user_id = ou.user_id
          ) THEN 70
          ELSE 80
        END ASC`, [taskId, taskId])
      .orderBy('ou.created_at', 'asc')) as Array<{
      user_id: string
      project_role: string | null
      org_role: string | null
      has_task_comment: boolean
      is_mentioned_in_task: boolean
      has_review_history: boolean
    }>

    return candidates.map((candidate) => {
      const reasons: string[] = []
      if (candidate.project_role === 'project_owner') reasons.push('project_owner')
      if (candidate.project_role === 'project_manager') reasons.push('project_manager')
      if (candidate.org_role === 'org_owner') reasons.push('org_owner')
      if (candidate.org_role === 'org_admin') reasons.push('org_admin')
      if (candidate.has_task_comment) reasons.push('task_commenter')
      if (candidate.is_mentioned_in_task) reasons.push('mentioned_in_task')
      if (candidate.has_review_history) reasons.push('active_project_reviewer')
      return {
        userId: candidate.user_id,
        projectRole: candidate.project_role,
        organizationRole: candidate.org_role,
        reasons,
      }
    })
  }

  async createWorkflow(input: {
    taskId: string
    taskAssignmentId: string
    projectId: string
    organizationId: string
    revieweeId: string | null
    requiredReviewCount: number
  }): Promise<ReviewTaskWorkflow | null> {
    const insertedRows = (await this.transaction
      .table('task_review_workflows')
      .insert({
        task_id: input.taskId,
        task_assignment_id: input.taskAssignmentId,
        project_id: input.projectId,
        organization_id: input.organizationId,
        reviewee_id: input.revieweeId,
        status: 'awaiting_review',
        required_review_count: input.requiredReviewCount,
        completed_review_count: 0,
      })
      .returning([
        'id',
        'task_id',
        'task_assignment_id',
        'project_id',
        'organization_id',
        'reviewee_id',
        'status',
        'required_review_count',
      ])) as TaskWorkflowRow[]

    return insertedRows[0] ? mapWorkflow(insertedRows[0]) : null
  }

  async createWorkflowReviewers(
    workflowId: string,
    reviewers: ReadonlyArray<{
      reviewerId: string
      role: string
      priorityRank: number
      isRequired?: boolean
    }>
  ): Promise<void> {
    if (reviewers.length === 0) return

    await this.transaction.table('task_review_reviewers').insert(
      reviewers.map((reviewer) => ({
        workflow_id: workflowId,
        reviewer_id: reviewer.reviewerId,
        reviewer_role: reviewer.role,
        is_required: reviewer.isRequired ?? true,
        status: 'pending',
        priority_rank: reviewer.priorityRank,
      }))
    )
  }

  async loadTaskAssignee(taskId: string): Promise<string | null | undefined> {
    const task = (await this.transaction
      .from('tasks')
      .where('id', taskId)
      .whereNull('deleted_at')
      .select('assigned_to')
      .first()) as { assigned_to: string | null } | undefined

    return task?.assigned_to
  }

  async findReviewer(
    workflowId: string,
    reviewerId: string
  ): Promise<{ id: string; status: string } | null> {
    const reviewer = (await this.transaction
      .from('task_review_reviewers')
      .where('workflow_id', workflowId)
      .where('reviewer_id', reviewerId)
      .select('id', 'status')
      .first()) as { id: string; status: string } | undefined

    return reviewer ?? null
  }

  async findMessage(workflowId: string, messageId: string) {
    const message = (await this.transaction
      .from('task_review_messages')
      .where('workflow_id', workflowId)
      .where('id', messageId)
      .whereNull('deleted_at')
      .select('id', 'author_id', 'message_type', 'reviewee_decision')
      .first()) as
      | {
          id: string
          author_id: string
          message_type: 'review' | 'reviewee_response' | 'dispute_reply' | 'system'
          reviewee_decision: 'accepted' | 'rejected' | null
        }
      | undefined

    return message
      ? {
          id: message.id,
          authorId: message.author_id,
          messageType: message.message_type,
          revieweeDecision: message.reviewee_decision,
        }
      : null
  }

  async hasRevieweeResponse(workflowId: string, reviewMessageId: string): Promise<boolean> {
    const response = (await this.transaction
      .from('task_review_messages')
      .where('workflow_id', workflowId)
      .where('parent_review_message_id', reviewMessageId)
      .where('message_type', 'reviewee_response')
      .whereNull('deleted_at')
      .select('id')
      .first()) as { id: string } | undefined

    return Boolean(response)
  }

  async countUnrespondedReviewThreads(workflowId: string): Promise<number> {
    const row = (await this.transaction
      .from('task_review_messages as review')
      .where('review.workflow_id', workflowId)
      .where('review.message_type', 'review')
      .whereNull('review.deleted_at')
      .whereNotExists((response) => {
        void response
          .from('task_review_messages as reviewee_response')
          .whereColumn('reviewee_response.parent_review_message_id', 'review.id')
          .where('reviewee_response.message_type', 'reviewee_response')
          .whereNull('reviewee_response.deleted_at')
      })
      .count('* as total')
      .first()) as { total?: number | string } | undefined

    return Number(row?.total ?? 0)
  }

  async listReviewerIds(workflowId: string): Promise<string[]> {
    const rows = (await this.transaction
      .from('task_review_reviewers')
      .where('workflow_id', workflowId)
      .select('reviewer_id')) as Array<{ reviewer_id: string }>

    return rows.map((row) => row.reviewer_id)
  }

  async markReviewerSubmitted(reviewerId: string, reviewedAt: Date): Promise<void> {
    await this.transaction.from('task_review_reviewers').where('id', reviewerId).update({
      status: 'submitted',
      reviewed_at: reviewedAt,
      updated_at: reviewedAt,
    })
  }

  async updateSubmittedReview(input: {
    workflowId: string
    authorId: string
    body: string
  }): Promise<boolean> {
    const message = (await this.transaction
      .from('task_review_messages')
      .where('workflow_id', input.workflowId)
      .where('author_id', input.authorId)
      .where('message_type', 'review')
      .whereNull('deleted_at')
      .orderBy('created_at', 'desc')
      .select('id', 'body', 'created_at')
      .forUpdate()
      .first()) as { id: string; body: string; created_at: Date | string } | undefined

    if (!message) return false

    const latestRevision = (await this.transaction
      .from('task_review_message_revisions')
      .where('message_id', message.id)
      .max('revision_number as revision_number')
      .first()) as { revision_number?: number | string | null } | undefined
    let nextRevisionNumber = Number(latestRevision?.revision_number ?? 0) + 1

    if (nextRevisionNumber === 1) {
      await this.transaction.table('task_review_message_revisions').insert({
        message_id: message.id,
        revision_number: 1,
        body: message.body,
        editor_id: input.authorId,
        created_at: message.created_at,
      })
      nextRevisionNumber = 2
    }

    const updatedAt = new Date()
    await this.transaction.table('task_review_message_revisions').insert({
      message_id: message.id,
      revision_number: nextRevisionNumber,
      body: input.body,
      editor_id: input.authorId,
      created_at: updatedAt,
    })
    await this.transaction
      .from('task_review_messages')
      .where('id', message.id)
      .update({ body: input.body, reviewer_agreed_at: null, updated_at: updatedAt })

    return true
  }

  async updateOwnMessage(
    input: Parameters<ReviewTaskWorkflowPersistenceSession['updateOwnMessage']>[0]
  ): Promise<boolean> {
    const message = (await this.transaction
      .from('task_review_messages')
      .where('workflow_id', input.workflowId)
      .where('id', input.messageId)
      .where('author_id', input.authorId)
      .whereIn('message_type', input.messageTypes)
      .whereNull('deleted_at')
      .select('id', 'body', 'created_at')
      .forUpdate()
      .first()) as { id: string; body: string; created_at: Date | string } | undefined

    if (!message) return false

    const latestRevision = (await this.transaction
      .from('task_review_message_revisions')
      .where('message_id', message.id)
      .max('revision_number as revision_number')
      .first()) as { revision_number?: number | string | null } | undefined
    let nextRevisionNumber = Number(latestRevision?.revision_number ?? 0) + 1
    if (nextRevisionNumber === 1) {
      await this.transaction.table('task_review_message_revisions').insert({
        message_id: message.id,
        revision_number: 1,
        body: message.body,
        editor_id: input.authorId,
        created_at: message.created_at,
      })
      nextRevisionNumber = 2
    }

    const updatedAt = new Date()
    await this.transaction.table('task_review_message_revisions').insert({
      message_id: message.id,
      revision_number: nextRevisionNumber,
      body: input.body,
      editor_id: input.authorId,
      created_at: updatedAt,
    })
    await this.transaction
      .from('task_review_messages')
      .where('id', message.id)
      .update({ body: input.body, updated_at: updatedAt })
    return true
  }

  async withdrawOwnMessage(
    input: Parameters<ReviewTaskWorkflowPersistenceSession['withdrawOwnMessage']>[0]
  ): Promise<WithdrawnTaskReviewMessage | null> {
    const message = (await this.transaction
      .from('task_review_messages')
      .where('workflow_id', input.workflowId)
      .where('id', input.messageId)
      .where('author_id', input.authorId)
      .whereIn('message_type', ['review', 'reviewee_response', 'dispute_reply'])
      .whereNull('deleted_at')
      .select('id', 'message_type')
      .forUpdate()
      .first()) as { id: string; message_type: TaskReviewMessage['messageType'] } | undefined

    if (!message) return null

    const messageIds = message.message_type === 'review'
      ? (await this.transaction
          .from('task_review_messages')
          .where('workflow_id', input.workflowId)
          .where((query) => {
            void query.where('id', message.id).orWhere('parent_review_message_id', message.id)
          })
          .whereNull('deleted_at')
          .select('id')) as Array<{ id: string }>
      : [{ id: message.id }]

    await this.transaction
      .from('task_review_messages')
      .whereIn(
        'id',
        messageIds.map((item) => item.id)
      )
      .update({ deleted_at: input.withdrawnAt, deleted_by: input.authorId, updated_at: input.withdrawnAt })

    if (message.message_type === 'review') {
      await this.transaction
        .from('task_review_reviewers')
        .where('workflow_id', input.workflowId)
        .where('reviewer_id', input.authorId)
        .update({ status: 'pending', reviewed_at: null, updated_at: input.withdrawnAt })
    }

    const messageType: TaskReviewMessage['messageType'] = message.message_type
    return { messageType }
  }

  async appendMessage(
    input: Parameters<ReviewTaskWorkflowPersistenceSession['appendMessage']>[0]
  ): Promise<string> {
    const createdAt = new Date()
    const [message] = (await this.transaction
      .table('task_review_messages')
      .insert({
        workflow_id: input.workflowId,
        author_id: input.authorId,
        message_type: input.messageType,
        body: input.body,
        ...(input.parentReviewMessageId
          ? { parent_review_message_id: input.parentReviewMessageId }
          : {}),
        created_at: createdAt,
        updated_at: createdAt,
        ...(input.metadata ? { metadata: JSON.stringify(input.metadata) } : {}),
      })
      .returning('id')) as Array<{ id: string }>

    if (input.messageType !== 'system' && message) {
      await this.transaction.table('task_review_message_revisions').insert({
        message_id: message.id,
        revision_number: 1,
        body: input.body,
        editor_id: input.authorId,
        created_at: createdAt,
      })
    }

    if (!message?.id) {
      throw new Error('Unable to persist task review message')
    }

    return message.id
  }

  async countSubmittedReviewers(workflowId: string): Promise<number> {
    const row = (await this.transaction
      .from('task_review_reviewers')
      .where('workflow_id', workflowId)
      .where('status', 'submitted')
      .count('* as total')
      .first()) as { total?: number | string } | undefined

    return Number(row?.total ?? 0)
  }

  async updateWorkflowProgress(
    input: Parameters<ReviewTaskWorkflowPersistenceSession['updateWorkflowProgress']>[0]
  ): Promise<void> {
    await this.transaction.from('task_review_workflows').where('id', input.workflowId).update({
      completed_review_count: input.completedReviewCount,
      status: input.status,
      updated_at: input.updatedAt,
    })
  }

  async markDisputed(workflowId: string, updatedAt: Date): Promise<void> {
    await this.transaction.from('task_review_workflows').where('id', workflowId).update({
      status: 'disputed',
      updated_at: updatedAt,
    })
  }

  loadReportRuntimeContext(
    workflowId: string,
    reporterId: string,
    report: TaskReviewDisputeReport
  ): Promise<Record<string, unknown>> {
    return loadReportRuntimeContext(this.transaction, workflowId, reporterId, report)
  }

  async markReported(
    input: Parameters<ReviewTaskWorkflowPersistenceSession['markReported']>[0]
  ): Promise<void> {
    await this.transaction
      .from('task_review_workflows')
      .where('id', input.workflowId)
      .update({
        status: 'reported',
        reported_by: input.reporterId,
        reported_at: input.reportedAt,
        runtime_context: JSON.stringify(input.runtimeContext),
        updated_at: input.reportedAt,
      })
  }

  async finalizeResolvedWorkflow(
    input: Parameters<ReviewTaskWorkflowPersistenceSession['finalizeResolvedWorkflow']>[0]
  ): Promise<void> {
    const updated = (await this.transaction
      .from('task_review_workflows')
      .where('id', input.workflowId)
      .where('status', 'resolved')
      .update({
        status: 'done',
        completed_at: input.finalizedAt,
        updated_at: input.finalizedAt,
      })) as number | readonly unknown[]
    const affectedRows = typeof updated === 'number' ? updated : updated.length
    if (affectedRows !== 1) {
      throw new Error('Task review workflow must be resolved before it can be finalized')
    }
    await this.appendMessage({
      workflowId: input.workflowId,
      authorId: input.actorId,
      messageType: 'system',
      body: input.messageBody,
    })
  }

  async stageTaskReviewFinalizedEvent(
    input: Parameters<ReviewTaskWorkflowPersistenceSession['stageTaskReviewFinalizedEvent']>[0]
  ): Promise<void> {
    await stageDomainEvent(this.transaction, {
      eventName: 'task-review:finalized',
      dedupeKey: `${input.workflowId}:done`,
      aggregateType: 'task_review_workflow',
      aggregateId: input.workflowId,
      payload: {
        workflowId: input.workflowId,
        taskAssignmentId: input.taskAssignmentId,
        taskId: input.taskId,
        revieweeId: input.revieweeId,
        finalizedBy: input.finalizedBy,
        finalizationSource: input.finalizationSource,
        finalizedAt: input.finalizedAt.toISOString(),
      },
    })
  }

  async stageNotification(
    input: Parameters<ReviewTaskWorkflowPersistenceSession['stageNotification']>[0]
  ): Promise<void> {
    const recipientIds = [...new Set(input.recipientIds)].filter(
      (recipientId) => recipientId !== input.actorId
    )
    if (recipientIds.length === 0) return

    await this.notificationFanout.stage(
      {
        eventName: input.eventName,
        businessEventId: input.businessEventId,
        type: input.type,
        schemaVersion: 1,
        scope: { kind: 'organization', id: input.organizationId },
        actor: { type: 'user', id: input.actorId },
        subject: { type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK, id: input.taskId },
        parameters: input.parameters,
        occurredAt: input.occurredAt.toISOString(),
        ...(input.correlationId ? { correlationId: input.correlationId } : {}),
      },
      recipientIds,
      { trx: this.transaction, now: input.occurredAt }
    )
  }

  async stageAiDisputeAutoQueue(
    workflowId: string,
    execCtx: Parameters<ReviewTaskWorkflowPersistenceSession['stageAiDisputeAutoQueue']>[1]
  ): Promise<void> {
    await this.aiDisputeAutoQueue.stage(this.transaction, {
      sourceType: 'task_review_workflow',
      sourceId: workflowId,
      requestContext: execCtx,
    })
  }
}

export default class LucidReviewTaskWorkflowUnitOfWork implements ReviewTaskWorkflowUnitOfWork {
  constructor(
    private readonly notificationFanout: NotificationFanoutStagerContract = notificationFanoutPublicApi,
    private readonly aiDisputeAutoQueue: AiDisputeAutoQueueCapability = aiDisputeAutoQueuePublicApi
  ) {}

  run<T>(work: (session: ReviewTaskWorkflowPersistenceSession) => Promise<T>): Promise<T> {
    return db.transaction((transaction) =>
      work(
        new LucidReviewTaskWorkflowSession(
          transaction,
          this.notificationFanout,
          this.aiDisputeAutoQueue
        )
      )
    )
  }

  runIn<T>(
    transaction: ReviewTransaction,
    work: (session: ReviewTaskWorkflowPersistenceSession) => Promise<T>
  ): Promise<T> {
    return work(
      new LucidReviewTaskWorkflowSession(
        toLucidReviewTransaction(transaction),
        this.notificationFanout,
        this.aiDisputeAutoQueue
      )
    )
  }
}
