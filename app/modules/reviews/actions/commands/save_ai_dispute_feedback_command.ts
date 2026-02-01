import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type { AiDisputeUnitOfWork } from '#modules/reviews/actions/ports/outbound/ai_dispute_unit_of_work'
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
  constructor(
    private execCtx: ReviewActionContext,
    private readonly disputes: AiDisputeUnitOfWork
  ) {}

  async execute(dto: SaveAiDisputeFeedbackDTO): Promise<AiDisputeFeedbackResult> {
    const actorId = requireUserId(this.execCtx)
    return this.disputes.run(async (session) => {
      const evaluation = await session.loadEvaluation(dto.ai_evaluation_id)
      if (!evaluation) throw new NotFoundException('AI dispute evaluation not found')

      const created = await session.createFeedback({
        evaluationId: dto.ai_evaluation_id,
        disputeId: evaluation.disputeId,
        adminId: actorId,
        feedbackType: dto.feedback_type,
        adminNotes: dto.admin_notes ?? null,
        finalDecision: dto.final_decision,
        finalRationale: dto.final_rationale,
        aiWasHelpful: dto.ai_was_helpful,
        aiCorrectPoints: dto.ai_correct_points ?? {},
        aiMissedPoints: dto.ai_missed_points ?? {},
      })
      return created as unknown as AiDisputeFeedbackResult
    })
  }
}
