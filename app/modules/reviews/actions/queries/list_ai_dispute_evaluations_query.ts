import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type {
  AiDisputeEvaluationResult,
  AiDisputeRequestPayload,
} from '#modules/reviews/actions/commands/start_ai_dispute_evaluation_command'
import type {
  AiDisputeEvaluationRecordSource,
  AiDisputeEvaluationSourceReader,
} from '#modules/reviews/actions/ports/outbound/ai_dispute_evaluation_source_reader'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import type { AiDisputeSourceType } from '#modules/reviews/public_contracts/ai_dispute_auto_queue'

export interface ListAiDisputeEvaluationsDTO {
  dispute_id: string
  source_type?: AiDisputeSourceType
}

type AiDisputeEvaluationRow = AiDisputeEvaluationRecordSource & {
  request_payload: string | AiDisputeRequestPayload
  response_payload?: string | Record<string, unknown> | null
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
  constructor(
    private execCtx: ReviewActionContext,
    private readonly sources: AiDisputeEvaluationSourceReader
  ) {}

  async execute(dto: ListAiDisputeEvaluationsDTO): Promise<AiDisputeEvaluationResult[]> {
    const actorId = requireUserId(this.execCtx)
    const [actorRole, reviewDispute, sprintDispute, reverseWorkflow, taskWorkflow] =
      await Promise.all([
        this.sources.findActorSystemRole(actorId),
        this.sources.findReviewDispute(dto.dispute_id),
        this.sources.findSprintReviewDispute(dto.dispute_id),
        this.sources.findSprintReverseReviewWorkflow(dto.dispute_id),
        this.sources.findTaskReviewWorkflow(dto.dispute_id),
      ])

    if (!actorRole) {
      throw new NotFoundException('User not found')
    }

    if (actorRole !== 'system_admin' && actorRole !== 'superadmin') {
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

    const rows = (await this.sources.listEvaluationRecords(
      sourceType,
      dto.dispute_id
    )) as AiDisputeEvaluationRow[]

    return rows.map(normalize)
  }
}
