import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { SeedContext } from '../types.js'

import {
  countResolvedDisputeRows,
  countReverseReviewReportRuntimeContexts,
  countRowsIfTableExists,
  countTaskReviewRuntimeContextsWithSprintPeerTasks,
  fail,
  tableExists,
} from './seed_integrity_helpers.js'

export async function assertReviewAndDisputeIntegrity(
  trx: TransactionClientContract,
  context: SeedContext
): Promise<void> {
  const reviewSessions = await countRowsIfTableExists(trx, 'review_sessions')
  const skillReviews = await countRowsIfTableExists(trx, 'skill_reviews')
  if (reviewSessions + skillReviews === 0) {
    fail('missing linked review data')
  }

  const reviewDisputes = await countRowsIfTableExists(trx, 'review_disputes')
  if (reviewDisputes > 0) {
    const caseFiles = await countRowsIfTableExists(trx, 'review_dispute_case_files')
    const aiEvaluations = await countRowsIfTableExists(trx, 'ai_dispute_evaluations')
    const disputeEvidences = await countRowsIfTableExists(trx, 'review_dispute_evidences')

    if (caseFiles < reviewDisputes || aiEvaluations < reviewDisputes || disputeEvidences === 0) {
      fail('review disputes must have dossier case files, evidence, and AI evaluations')
    }

    const disputesMissingDossierParts = (await trx
      .from('review_disputes as rd')
      .leftJoin('review_dispute_case_files as cf', 'cf.dispute_id', 'rd.id')
      .leftJoin('ai_dispute_evaluations as ae', 'ae.dispute_id', 'rd.id')
      .leftJoin('review_dispute_evidences as ev', 'ev.dispute_id', 'rd.id')
      .where((builder) => {
        void builder.whereNull('cf.id').orWhereNull('ae.id').orWhereNull('ev.id')
      })
      .countDistinct('rd.id as total')
      .first()) as { total: string | number } | null
    if (Number(disputesMissingDossierParts?.total ?? 0) > 0) {
      fail('every review dispute must have its own case file, evidence, and AI evaluation')
    }

    const incompleteCaseFiles = (await trx
      .from('review_dispute_case_files')
      .where('completeness_score', '<', 100)
      .count('* as total')
      .first()) as { total: string | number } | null
    const incompleteAiEvaluations = (await trx
      .from('ai_dispute_evaluations')
      .whereNot('status', 'completed')
      .count('* as total')
      .first()) as { total: string | number } | null
    if (
      Number(incompleteCaseFiles?.total ?? 0) > 0 ||
      Number(incompleteAiEvaluations?.total ?? 0) > 0
    ) {
      fail('dispute dossiers and advisory AI evaluations must be complete')
    }

    const reportedDisputesMissingGovernanceMetadata = (await trx
      .from('review_disputes')
      .whereNotNull('reported_to_admin_at')
      .where((builder) => {
        void builder
          .whereNull('reported_to_admin_by')
          .orWhereNull('escalation_reason')
          .orWhereRaw("BTRIM(escalation_reason) = ''")
      })
      .count('* as total')
      .first()) as { total: string | number } | null
    const reportedDisputesWithoutTwoSidedExchange = (await trx
      .from('review_disputes as dispute')
      .whereNotNull('dispute.reported_to_admin_at')
      .whereRaw(
        `
        (
          SELECT COUNT(DISTINCT comment.author_id)
          FROM review_dispute_comments AS comment
          WHERE comment.dispute_id = dispute.id
            AND comment.deleted_at IS NULL
            AND comment.visibility = 'all_parties'
        ) < 2
      `
      )
      .count('* as total')
      .first()) as { total: string | number } | null
    if (
      Number(reportedDisputesMissingGovernanceMetadata?.total ?? 0) > 0 ||
      Number(reportedDisputesWithoutTwoSidedExchange?.total ?? 0) > 0
    ) {
      fail(
        `reported review disputes require reporter, escalation reason, and two-sided exchange (metadata gaps=${Number(reportedDisputesMissingGovernanceMetadata?.total ?? 0)}, exchange gaps=${Number(reportedDisputesWithoutTwoSidedExchange?.total ?? 0)})`
      )
    }

    const demoDisputeTask = context.tasks['orga-review-dispute-detail']
    const demoDossier = demoDisputeTask
      ? ((await trx
          .from('review_dispute_case_files as cf')
          .join('review_disputes as rd', 'rd.id', 'cf.dispute_id')
          .where('rd.task_id', demoDisputeTask.id)
          .whereRaw("jsonb_array_length(COALESCE(cf.missing_data, '[]'::jsonb)) = 0")
          .whereRaw(
            "jsonb_array_length(COALESCE(cf.task_snapshot->'sprint_peer_tasks', '[]'::jsonb)) > 0"
          )
          .whereRaw(
            "COALESCE(cf.reviewee_profile_context_snapshot->'profile', '{}'::jsonb) <> '{}'::jsonb"
          )
          .whereRaw("COALESCE(cf.reviewer_context_snapshot->'profile', '{}'::jsonb) <> '{}'::jsonb")
          .orderBy('cf.case_version', 'desc')
          .select('cf.id')
          .first()) as { id: string } | null)
      : null
    if (!demoDossier) {
      fail('primary demo dispute must include sprint peers and both party profile contexts')
    }
  }

  const taskReviewWorkflows = await countRowsIfTableExists(trx, 'task_review_workflows')
  const taskReviewReviewers = await countRowsIfTableExists(trx, 'task_review_reviewers')
  const taskReviewMessages = await countRowsIfTableExists(trx, 'task_review_messages')

  if (taskReviewWorkflows === 0 || taskReviewReviewers === 0 || taskReviewMessages === 0) {
    fail('missing task review workflow seed data')
  }

  const selfTaskReviewers = (await trx
    .from('task_review_reviewers as reviewer')
    .join('task_review_workflows as workflow', 'workflow.id', 'reviewer.workflow_id')
    .whereRaw('reviewer.reviewer_id = workflow.reviewee_id')
    .count('* as total')
    .first()) as { total: string | number } | null
  const taskReviewAssignmentMismatches = (await trx
    .from('task_review_workflows as workflow')
    .leftJoin('task_assignments as assignment', 'assignment.id', 'workflow.task_assignment_id')
    .where((builder) => {
      void builder
        .whereNull('workflow.task_assignment_id')
        .orWhereNull('assignment.id')
        .orWhereRaw('assignment.task_id <> workflow.task_id')
        .orWhereRaw('assignment.assignee_id <> workflow.reviewee_id')
    })
    .count('* as total')
    .first()) as { total: string | number } | null
  const taskGiverReviewerGaps = (await trx
    .from('task_review_workflows as workflow')
    .join('task_assignments as assignment', 'assignment.id', 'workflow.task_assignment_id')
    .whereRaw('assignment.assigned_by <> workflow.reviewee_id')
    .whereNotExists((query) => {
      void query
        .select(trx.raw('1'))
        .from('task_review_reviewers as reviewer')
        .whereRaw('reviewer.workflow_id = workflow.id')
        .whereRaw('reviewer.reviewer_id = assignment.assigned_by')
    })
    .count('* as total')
    .first()) as { total: string | number } | null
  const inconsistentTaskReviewCounts = (await trx
    .from('task_review_workflows as workflow')
    .select('workflow.id').whereRaw(`
      workflow.required_review_count <> (
        SELECT COUNT(*)::integer
        FROM task_review_reviewers AS reviewer
        WHERE reviewer.workflow_id = workflow.id
          AND reviewer.is_required = true
      )
      OR workflow.completed_review_count <> (
        SELECT COUNT(*)::integer
        FROM task_review_reviewers AS reviewer
        WHERE reviewer.workflow_id = workflow.id
          AND reviewer.is_required = true
          AND reviewer.status = 'submitted'
      )
    `)) as { id: string }[]
  const incompleteAcceptedTaskReviewWorkflows = (await trx
    .from('task_review_workflows')
    .where('status', 'done')
    .where((builder) => {
      void builder.whereNull('accepted_by_reviewee_at').orWhereNull('completed_at')
    })
    .count('* as total')
    .first()) as { total: string | number } | null
  if (
    Number(selfTaskReviewers?.total ?? 0) > 0 ||
    Number(taskReviewAssignmentMismatches?.total ?? 0) > 0 ||
    Number(taskGiverReviewerGaps?.total ?? 0) > 0 ||
    inconsistentTaskReviewCounts.length > 0 ||
    Number(incompleteAcceptedTaskReviewWorkflows?.total ?? 0) > 0
  ) {
    fail('task review workflows must have non-self reviewers and truthful quorum/acceptance state')
  }

  const taskReviewSprintPeerContexts = await countTaskReviewRuntimeContextsWithSprintPeerTasks(trx)
  if (taskReviewSprintPeerContexts === 0) {
    fail('task review workflow runtime context must include sprint peer tasks')
  }

  const reverseReviewReportRuntimeContexts = await countReverseReviewReportRuntimeContexts(trx)
  if (reverseReviewReportRuntimeContexts === 0) {
    fail('missing sprint reverse review report runtime context')
  }

  const resolvedClassicDisputes = await countResolvedDisputeRows(trx, 'review_disputes')
  const resolvedTaskReviewWorkflows = await countResolvedDisputeRows(trx, 'task_review_workflows')
  const resolvedSprintReviewDisputes = await countResolvedDisputeRows(trx, 'sprint_review_disputes')
  const resolvedReverseWorkflows = await countResolvedDisputeRows(
    trx,
    'sprint_reverse_review_workflows'
  )
  if (
    resolvedClassicDisputes === 0 ||
    resolvedTaskReviewWorkflows === 0 ||
    resolvedSprintReviewDisputes === 0 ||
    resolvedReverseWorkflows === 0
  ) {
    fail('missing resolved dispute seed data')
  }

  const allowedFinalDecisions = [
    'uphold_review',
    'adjust_score',
    'request_re_review',
    'dismiss_dispute',
    'partially_accept',
  ]
  for (const disputeTable of [
    'review_disputes',
    'task_review_workflows',
    'sprint_review_disputes',
    'sprint_reverse_review_workflows',
  ]) {
    if (!(await tableExists(trx, disputeTable))) {
      continue
    }
    const invalidDecisionRows = (await trx
      .from(disputeTable)
      .whereNotNull('final_decision')
      .whereNotIn('final_decision', allowedFinalDecisions)
      .count('* as total')
      .first()) as { total: string | number } | null
    if (Number(invalidDecisionRows?.total ?? 0) > 0) {
      fail(`${disputeTable}.final_decision must use only Suar final-decision enum values`)
    }
  }

  const invalidDisputeTimeline = (await trx
    .from('review_disputes')
    .whereNotNull('resolved_at')
    .whereRaw('resolved_at < created_at')
    .count('* as total')
    .first()) as { total: string | number } | null
  const invalidAiEvaluationTimeline = (await trx
    .from('ai_dispute_evaluations as ae')
    .join('review_disputes as rd', 'rd.id', 'ae.dispute_id')
    .whereRaw('ae.created_at < rd.created_at')
    .count('* as total')
    .first()) as { total: string | number } | null
  const resolutionBeforeAiCompletion = (await trx
    .from('review_disputes as rd')
    .join('ai_dispute_evaluations as ae', 'ae.dispute_id', 'rd.id')
    .whereNotNull('rd.resolved_at')
    .whereNotNull('ae.completed_at')
    .whereRaw('rd.resolved_at < ae.completed_at')
    .count('* as total')
    .first()) as { total: string | number } | null
  const aiEvaluationBeforeCaseFile = (await trx
    .from('ai_dispute_evaluations as evaluation')
    .whereRaw(
      `
      NOT EXISTS (
        SELECT 1
        FROM review_dispute_case_files AS case_file
        WHERE case_file.dispute_id = evaluation.dispute_id
          AND case_file.created_at <= evaluation.created_at
      )
    `
    )
    .count('* as total')
    .first()) as { total: string | number } | null
  if (
    Number(invalidDisputeTimeline?.total ?? 0) > 0 ||
    Number(invalidAiEvaluationTimeline?.total ?? 0) > 0 ||
    Number(resolutionBeforeAiCompletion?.total ?? 0) > 0 ||
    Number(aiEvaluationBeforeCaseFile?.total ?? 0) > 0
  ) {
    fail(
      `case file, AI advisory evaluation, and human resolution timestamps must be chronological (dispute=${Number(invalidDisputeTimeline?.total ?? 0)}, ai_before_dispute=${Number(invalidAiEvaluationTimeline?.total ?? 0)}, resolution_before_ai=${Number(resolutionBeforeAiCompletion?.total ?? 0)}, ai_before_case=${Number(aiEvaluationBeforeCaseFile?.total ?? 0)})`
    )
  }
}
