import db from '@adonisjs/lucid/services/db'

import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

export interface SaveAiDisputeFeedbackDTO {
  ai_evaluation_id: string
  feedback_type: 'accepted' | 'partially_accepted' | 'rejected' | 'insufficient_data'
  admin_notes?: string | null
  final_decision: string
  final_rationale: string
  ai_was_helpful: boolean
  ai_correct_points?: Record<string, unknown> | null
  ai_missed_points?: Record<string, unknown> | null
}

export interface AiDisputeFeedbackResult {
  id: string
  ai_evaluation_id: string
  dispute_id: string
  admin_id: string
  feedback_type: string
}

function requireUserId(ctx: ReviewActionContext): string {
  if (!ctx.userId) throw new UnauthorizedException()
  return ctx.userId
}

export default class SaveAiDisputeFeedbackCommand {
  constructor(private execCtx: ReviewActionContext) {}

  async execute(dto: SaveAiDisputeFeedbackDTO): Promise<AiDisputeFeedbackResult> {
    const actorId = requireUserId(this.execCtx)
    const evaluation = (await db
      .from('ai_dispute_evaluations')
      .where('id', dto.ai_evaluation_id)
      .first()) as { dispute_id: string } | undefined
    if (!evaluation) throw new NotFoundException('AI dispute evaluation not found')

    const [created] = (await db
      .table('ai_dispute_feedback')
      .insert({
        ai_evaluation_id: dto.ai_evaluation_id,
        dispute_id: evaluation.dispute_id,
        admin_id: actorId,
        feedback_type: dto.feedback_type,
        admin_notes: dto.admin_notes ?? null,
        final_decision: dto.final_decision,
        final_rationale: dto.final_rationale,
        ai_was_helpful: dto.ai_was_helpful,
        ai_correct_points: JSON.stringify(dto.ai_correct_points ?? {}),
        ai_missed_points: JSON.stringify(dto.ai_missed_points ?? {}),
      })
      .returning('*')) as Record<string, unknown>[]

    return created as unknown as AiDisputeFeedbackResult
  }
}
