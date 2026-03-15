import db from '@adonisjs/lucid/services/db'

import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type {
  AiDisputeEvaluationResult,
  AiDisputeRequestPayload,
  AiDisputeSourceType,
} from '#modules/reviews/actions/commands/start_ai_dispute_evaluation_command'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

export interface ListAiDisputeEvaluationsDTO {
  dispute_id: string
  source_type?: AiDisputeSourceType
}

type AiDisputeEvaluationRow = Record<string, unknown> & {
  id: string
  dispute_id: string
  case_file_id: string | null
  source_type?: AiDisputeSourceType | null
  source_id?: string | null
  provider: string
  external_run_id: string | null
  status: string
  request_payload: string | AiDisputeRequestPayload
  recommendation?: string | null
  confidence_score?: number | string | null
  summary?: string | null
  response_payload?: string | Record<string, unknown> | null
  error_message?: string | null
  completed_at?: unknown
}

function requireUserId(ctx: ReviewActionContext): string {
  if (!ctx.userId) {
    throw new UnauthorizedException()
  }

  return ctx.userId
}

function normalize(row: AiDisputeEvaluationRow): AiDisputeEvaluationResult {
  const responsePayload = row.response_payload ? parseJsonObject(row.response_payload) : null
  return {
    id: row.id,
    dispute_id: row.dispute_id,
    case_file_id: row.case_file_id ?? null,
    source_type: row.source_type ?? 'review_dispute',
    source_id: row.source_id ?? row.dispute_id,
    provider: row.provider,
    external_run_id: row.external_run_id,
    status: row.status,
    created_at: toIsoLike(row['created_at']),
    recommendation: row.recommendation ?? null,
    confidence_score: row.confidence_score ?? null,
    summary: row.summary ?? null,
    ...(responsePayload ? { response_payload: responsePayload } : {}),
    error_message: row.error_message ?? null,
    completed_at: row.completed_at ? toIsoLike(row.completed_at) : null,
    request_payload:
      typeof row.request_payload === 'string'
        ? (JSON.parse(row.request_payload) as AiDisputeRequestPayload)
        : row.request_payload,
  }
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') return JSON.parse(value) as Record<string, unknown>
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function toIsoLike(value: unknown): string {
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  return new Date(0).toISOString()
}

export default class ListAiDisputeEvaluationsQuery {
  constructor(private execCtx: ReviewActionContext) {}

  async execute(dto: ListAiDisputeEvaluationsDTO): Promise<AiDisputeEvaluationResult[]> {
    const actorId = requireUserId(this.execCtx)
    const [actor, reviewDispute, sprintDispute, reverseWorkflow, taskWorkflow] = (await Promise.all([
      db.from('users').where('id', actorId).select('system_role').first(),
      db.from('review_disputes').where('id', dto.dispute_id).select('id').first(),
      db.from('sprint_review_disputes').where('id', dto.dispute_id).select('id').first(),
      db.from('sprint_reverse_review_workflows').where('id', dto.dispute_id).select('id').first(),
      db.from('task_review_workflows').where('id', dto.dispute_id).select('id').first(),
    ])) as [
      { system_role?: string } | undefined,
      { id: string } | undefined,
      { id: string } | undefined,
      { id: string } | undefined,
      { id: string } | undefined,
    ]

    if (!actor) {
      throw new NotFoundException('User not found')
    }

    if (actor.system_role !== 'system_admin' && actor.system_role !== 'superadmin') {
      throw new ForbiddenException('Only system admin can view AI dispute evaluations')
    }

    const sourceType =
      dto.source_type ??
      (reviewDispute
        ? 'review_dispute'
        : sprintDispute
          ? 'sprint_review_dispute'
          : reverseWorkflow
            ? 'sprint_reverse_review_workflow'
            : taskWorkflow
              ? 'task_review_workflow'
              : null)

    if (!sourceType) {
      throw new NotFoundException('Review dispute not found')
    }

    if (
      (sourceType === 'review_dispute' && !reviewDispute) ||
      (sourceType === 'sprint_review_dispute' && !sprintDispute) ||
      (sourceType === 'sprint_reverse_review_workflow' && !reverseWorkflow) ||
      (sourceType === 'task_review_workflow' && !taskWorkflow)
    ) {
      throw new NotFoundException('Review dispute not found')
    }

    const query = db.from('ai_dispute_evaluations')
    if (sourceType === 'review_dispute') {
      void query.where('dispute_id', dto.dispute_id)
    } else {
      void query.where('source_type', sourceType).where('source_id', dto.dispute_id)
    }

    const rows = (await query
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')
      .select('*')) as AiDisputeEvaluationRow[]

    return rows.map(normalize)
  }
}
