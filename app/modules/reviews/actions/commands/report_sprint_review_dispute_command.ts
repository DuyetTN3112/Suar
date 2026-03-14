import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/application_logger'
import type { SprintReviewDisputeUnitOfWork } from '#modules/reviews/actions/ports/outbound/sprint_review_dispute_unit_of_work'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { aiDisputeAutoQueuePublicApi } from '#modules/reviews/public_contracts/ai_dispute_auto_queue'

export interface ReportSprintReviewDisputeDTO {
  dispute_id: string
  escalation_reason: string
}

export default class ReportSprintReviewDisputeCommand {
  constructor(
    private readonly execCtx: ReviewActionContext,
    private readonly disputes: SprintReviewDisputeUnitOfWork
  ) {}

  async execute(dto: ReportSprintReviewDisputeDTO): Promise<{ id: string; status: string }> {
    const actorId = this.requireUserId()
    const escalationReason = dto.escalation_reason.trim()

    await this.disputes.run(async (session) => {
      const access = await session.loadAccess(dto.dispute_id, actorId)
      if (access.reviewPackage.reviewer_id !== actorId) {
        throw new ForbiddenException('Only sprint review package reviewer can report dispute')
      }
      if (access.dispute.reported_to_admin_at) {
        throw new BusinessLogicException('Sprint review dispute already reported to admin')
      }
      if (!['pending', 'collecting_evidence'].includes(access.dispute.status)) {
        throw new BusinessLogicException(
          'Sprint review dispute cannot be reported in current status'
        )
      }
      if (escalationReason.length === 0) {
        throw new BusinessLogicException('Sprint review dispute escalation reason is required')
      }

      const comments = await session.listComments(dto.dispute_id)
      const hasReviewerMessage = comments.some((comment) => comment.author_id === actorId)
      const hasCounterpartyMessage = comments.some((comment) => comment.author_id !== actorId)
      if (!hasReviewerMessage || !hasCounterpartyMessage) {
        throw new BusinessLogicException(
          'Cần có trao đổi thực tế giữa hai bên trong sprint review dispute trước khi report lên admin'
        )
      }

      const runtimeContext = await session.loadRuntimeContext(dto.dispute_id, actorId)
      await session.report({
        disputeId: dto.dispute_id,
        actorId,
        escalationReason,
        runtimeContext,
      })
      await session.writeAudit(this.execCtx, {
        action: 'report_sprint_review_dispute',
        entityId: dto.dispute_id,
        newValues: {
          status: 'admin_reviewing',
          escalation_reason: escalationReason,
          runtime_context_schema: 'suar_sprint_review_dispute_runtime_context_v1',
        },
      })
      await session.stageAiEvaluation(dto.dispute_id, this.execCtx)
    })

    await this.settlePostCommitEffect(
      'queue_ai_dispute_evaluation',
      () => aiDisputeAutoQueuePublicApi.processAfterReport('sprint_review_dispute', dto.dispute_id),
      { disputeId: dto.dispute_id, actorId }
    )

    return { id: dto.dispute_id, status: 'admin_reviewing' }
  }

  private requireUserId(): string {
    if (!this.execCtx.userId) {
      throw new UnauthorizedException()
    }
    return this.execCtx.userId
  }

  private async settlePostCommitEffect(
    effectName: string,
    effect: () => Promise<void>,
    context: { disputeId: string; actorId: string }
  ): Promise<void> {
    try {
      await effect()
    } catch (error) {
      try {
        loggerService.error('Review post-commit effect failed', {
          effectName,
          committed: true,
          disputeId: context.disputeId,
          actorId: context.actorId,
          errorName: error instanceof Error ? error.name : 'UnknownError',
        })
      } catch {
        // Telemetry failure must never alter the committed command result.
      }
    }
  }
}
