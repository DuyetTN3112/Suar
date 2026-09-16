import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  loadPartyContext,
  parseJsonFields,
  parseJsonValue,
  recordArray,
  recordValue,
  stringArray,
  stringField,
  TASK_CONTEXT_COLUMNS,
  type PartyContextScope,
  type TaskAssignmentContextRow,
} from './review_report_party_context_loader.js'
import {
  buildProfileAssessmentContract,
  SUAR_PROFILE_SCORING_POLICY,
} from './review_report_profile_assessment_contract.js'

import type { TaskReviewDisputeReport } from '#modules/reviews/actions/ports/outbound/review_task_workflow_unit_of_work'

export type { PartyContextScope, TaskAssignmentContextRow }

export {
  TASK_CONTEXT_COLUMNS,
  SUAR_PROFILE_SCORING_POLICY,
  parseJsonValue,
  parseJsonFields,
  stringField,
  recordValue,
  recordArray,
  stringArray,
  buildProfileAssessmentContract,
  loadPartyContext,
}

export async function loadReportRuntimeContext(
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
