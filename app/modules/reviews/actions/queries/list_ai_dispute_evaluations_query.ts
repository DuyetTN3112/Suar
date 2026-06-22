import db from '@adonisjs/lucid/services/db'

import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { AiDisputeEvaluationResult } from '#modules/reviews/actions/commands/start_ai_dispute_evaluation_command'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import type { buildAiDisputePayload } from '#modules/reviews/domain/ai_dispute_payload_builder'

export interface ListAiDisputeEvaluationsDTO {
  dispute_id: string
}

type AiDisputeEvaluationRow = Record<string, unknown> & {
  id: string
  dispute_id: string
  case_file_id: string
  provider: string
  external_run_id: string | null
  status: string
  request_payload: string | ReturnType<typeof buildAiDisputePayload>
}

function requireUserId(ctx: ReviewActionContext): string {
  if (!ctx.userId) {
    throw new UnauthorizedException()
  }

  return ctx.userId
}

function normalize(row: AiDisputeEvaluationRow): AiDisputeEvaluationResult {
  return {
    id: row.id,
    dispute_id: row.dispute_id,
    case_file_id: row.case_file_id,
    provider: row.provider,
    external_run_id: row.external_run_id,
    status: row.status,
    created_at: toIsoLike(row.created_at),
    request_payload:
      typeof row.request_payload === 'string'
        ? (JSON.parse(row.request_payload) as ReturnType<typeof buildAiDisputePayload>)
        : row.request_payload,
  }
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
    const [actor, dispute] = (await Promise.all([
      db.from('users').where('id', actorId).select('system_role').first(),
      db.from('review_disputes').where('id', dto.dispute_id).select('id').first(),
    ])) as [{ system_role?: string } | undefined, { id: string } | undefined]

    if (!actor) {
      throw new NotFoundException('User not found')
    }

    if (actor.system_role !== 'system_admin' && actor.system_role !== 'superadmin') {
      throw new ForbiddenException('Only system admin can view AI dispute evaluations')
    }

    if (!dispute) {
      throw new NotFoundException('Review dispute not found')
    }

    const rows = (await db
      .from('ai_dispute_evaluations')
      .where('dispute_id', dto.dispute_id)
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')
      .select('*')) as AiDisputeEvaluationRow[]

    return rows.map(normalize)
  }
}
