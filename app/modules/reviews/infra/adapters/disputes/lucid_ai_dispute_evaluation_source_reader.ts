import db from '@adonisjs/lucid/services/db'

import type {
  AiDisputeEvaluationRecordSource,
  AiDisputeEvaluationSourceKind,
  AiDisputeOperatorMetrics,
  AiDisputeEvaluationSourceReader,
  ReviewDisputeAiSource,
  ReviewDisputeCaseFileAiSource,
  ReviewWorkflowReportMessageAiSource,
  SprintReverseReviewWorkflowAiSource,
  SprintReviewDisputeAiSource,
  TaskReviewWorkflowAiSource,
  TaskReviewWorkflowReportMessageAiSource,
} from '#modules/reviews/actions/ports/outbound/ai_dispute_evaluation_source_reader'

interface AiEvaluationMetricRow {
  provider?: string | null
  total?: number | string
  active?: number | string
  completed?: number | string
  failed?: number | string
}

export default class LucidAiDisputeEvaluationSourceReader implements AiDisputeEvaluationSourceReader {
  async loadOperatorMetrics(): Promise<AiDisputeOperatorMetrics> {
    const providerLabelSql =
      "CASE WHEN provider IN ('ai_council', 'clawagent') THEN 'clawagent' ELSE COALESCE(NULLIF(TRIM(provider), ''), 'unknown') END"
    const [providerRows, totals] = await Promise.all([
      db
        .from('ai_dispute_evaluations')
        .select(
          db.raw(`${providerLabelSql} as provider`),
          db.raw('COUNT(*)::int as total'),
          db.raw(
            "SUM(CASE WHEN status IN ('queued', 'processing') THEN 1 ELSE 0 END)::int as active"
          ),
          db.raw("SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::int as completed"),
          db.raw(
            "SUM(CASE WHEN status IN ('failed', 'cancelled') THEN 1 ELSE 0 END)::int as failed"
          )
        )
        .groupByRaw(providerLabelSql)
        .orderBy('provider', 'asc') as Promise<AiEvaluationMetricRow[]>,
      db
        .from('ai_dispute_evaluations')
        .select(
          db.raw('COUNT(*)::int as total'),
          db.raw(
            "SUM(CASE WHEN status IN ('queued', 'processing') THEN 1 ELSE 0 END)::int as active"
          ),
          db.raw("SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::int as completed"),
          db.raw(
            "SUM(CASE WHEN status IN ('failed', 'cancelled') THEN 1 ELSE 0 END)::int as failed"
          )
        )
        .first() as Promise<AiEvaluationMetricRow | undefined>,
    ])

    return {
      totalEvaluations: Number(totals?.total ?? 0),
      activeEvaluations: Number(totals?.active ?? 0),
      completedEvaluations: Number(totals?.completed ?? 0),
      failedEvaluations: Number(totals?.failed ?? 0),
      providers: providerRows.map((row) => ({
        provider: row.provider ?? 'unknown',
        total: Number(row.total ?? 0),
        active: Number(row.active ?? 0),
        completed: Number(row.completed ?? 0),
        failed: Number(row.failed ?? 0),
      })),
    }
  }

  async listEvaluationRecords(
    sourceType: AiDisputeEvaluationSourceKind,
    sourceId: string
  ): Promise<AiDisputeEvaluationRecordSource[]> {
    const query = db.from('ai_dispute_evaluations')
    if (sourceType === 'review_dispute') {
      void query.where('dispute_id', sourceId)
    } else {
      void query.where('source_type', sourceType).where('source_id', sourceId)
    }
    return (await query
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')
      .select(
        'ai_dispute_evaluations.*',
        db.raw(`
          COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', approval.id,
                'proposal_index', approval.proposal_index,
                'approved_observed_level', approval.approved_observed_level,
                'approved_at', approval.approved_at
              )
              ORDER BY approval.proposal_index ASC
            )
            FROM ai_profile_capability_approvals AS approval
            WHERE approval.ai_evaluation_id = ai_dispute_evaluations.id
          ), '[]'::jsonb) AS profile_approvals
        `)
      )) as AiDisputeEvaluationRecordSource[]
  }

  async findActorSystemRole(actorId: string): Promise<string | null> {
    const actor = (await db.from('users').where('id', actorId).select('system_role').first()) as
      | { system_role: string }
      | undefined
    return actor?.system_role ?? null
  }

  async findReviewDispute(disputeId: string): Promise<ReviewDisputeAiSource | null> {
    const row = (await db
      .from('review_disputes')
      .where('id', disputeId)
      .select('status', 'dispute_reason')
      .first()) as ReviewDisputeAiSource | undefined
    return row ?? null
  }

  async findLatestReviewDisputeCaseFile(
    disputeId: string
  ): Promise<ReviewDisputeCaseFileAiSource | null> {
    const row = (await db
      .from('review_dispute_case_files')
      .where('dispute_id', disputeId)
      .orderBy('case_version', 'desc')
      .first()) as ReviewDisputeCaseFileAiSource | undefined
    return row ?? null
  }

  async findSprintReviewDispute(disputeId: string): Promise<SprintReviewDisputeAiSource | null> {
    const row = (await db.from('sprint_review_disputes').where('id', disputeId).first()) as
      | SprintReviewDisputeAiSource
      | undefined
    return row ?? null
  }

  async findSprintReverseReviewWorkflow(
    workflowId: string
  ): Promise<SprintReverseReviewWorkflowAiSource | null> {
    const row = (await db
      .from('sprint_reverse_review_workflows')
      .where('id', workflowId)
      .first()) as SprintReverseReviewWorkflowAiSource | undefined
    return row ?? null
  }

  async findSprintReverseReviewReportMessage(
    workflowId: string
  ): Promise<ReviewWorkflowReportMessageAiSource | null> {
    const row = (await db
      .from('sprint_reverse_review_messages')
      .where('workflow_id', workflowId)
      .where('message_type', 'report')
      .orderBy('created_at', 'desc')
      .first()) as ReviewWorkflowReportMessageAiSource | undefined
    return row ?? null
  }

  async findTaskReviewWorkflow(workflowId: string): Promise<TaskReviewWorkflowAiSource | null> {
    const row = (await db
      .from('task_review_workflows as workflow')
      .leftJoin('tasks as task', 'task.id', 'workflow.task_id')
      .where('workflow.id', workflowId)
      .select('workflow.*', 'task.project_sprint_id as sprint_id')
      .first()) as
      | TaskReviewWorkflowAiSource
      | undefined
    return row ?? null
  }

  async findTaskReviewReportMessage(
    workflowId: string
  ): Promise<TaskReviewWorkflowReportMessageAiSource | null> {
    const row = (await db
      .from('task_review_messages')
      .where('workflow_id', workflowId)
      .where('message_type', 'system')
      .orderBy('created_at', 'desc')
      .first()) as TaskReviewWorkflowReportMessageAiSource | undefined
    return row ?? null
  }
}
