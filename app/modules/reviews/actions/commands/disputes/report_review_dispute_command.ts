import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/application_logger'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { ReviewDisputeCaseFileUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_dispute_case_file_unit_of_work'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { aiDisputeAutoQueuePublicApi } from '#modules/reviews/public_contracts/ai_dispute_auto_queue'
import {
  ACTIVE_REVIEW_DISPUTE_STATUSES,
  ReviewDisputeStatus,
} from '#modules/reviews/public_contracts/review_constants'

export interface ReportReviewDisputeDTO {
  dispute_id: string
  escalation_reason: string
}

function requireUserId(ctx: ReviewActionContext): string {
  if (!ctx.userId) {
    throw new UnauthorizedException()
  }

  return ctx.userId
}

type ReportReviewDisputeResult = { id: string; status: string }

export default class ReportReviewDisputeCommand extends BaseCommand<
  ReportReviewDisputeDTO,
  ReportReviewDisputeResult
> {
  constructor(
    execCtx: ReviewActionContext,
    private readonly unitOfWork: ReviewDisputeCaseFileUnitOfWork
  ) {
    super(execCtx)
  }

  async execute(dto: ReportReviewDisputeDTO): Promise<ReportReviewDisputeResult> {
    return this.handle(dto)
  }

  async handle(dto: ReportReviewDisputeDTO): Promise<ReportReviewDisputeResult> {
    const actorId = requireUserId(this.execCtx)
    const result = await this.unitOfWork.run(async (session) => {
      const now = new Date()
      const dispute = await session.loadDisputeForReport(dto.dispute_id)

      if (!dispute) {
        throw new NotFoundException('Review dispute không tồn tại')
      }

      if (
        !ACTIVE_REVIEW_DISPUTE_STATUSES.includes(
          dispute.status as (typeof ACTIVE_REVIEW_DISPUTE_STATUSES)[number]
        )
      ) {
        throw new ConflictException('Review dispute không còn ở trạng thái có thể report')
      }

      if (dispute.revieweeId !== actorId) {
        throw new ForbiddenException('Chỉ reviewee mới có thể report tranh chấp này lên admin')
      }

      if (dispute.reportedToAdminAt) {
        throw new ConflictException('Review dispute này đã được report lên admin trước đó')
      }

      const task = await session.loadReportTask(dispute.taskId)
      if (!task) {
        throw new PersistedDataIntegrityException('Review dispute references a missing task', {
          disputeId: dispute.id,
          taskId: dispute.taskId,
        })
      }

      const exchangeAuthorIds = await session.listPublicExchangeAuthorIds(dto.dispute_id)
      const hasRevieweeMessage = exchangeAuthorIds.some((authorId) => authorId === actorId)
      const hasCounterpartyMessage = exchangeAuthorIds.some((authorId) => authorId !== actorId)

      if (!hasRevieweeMessage || !hasCounterpartyMessage) {
        throw new ConflictException(
          'Cần có trao đổi thực tế giữa hai bên trong dispute trước khi report lên admin'
        )
      }

      const escalationReason = dto.escalation_reason.trim()
      await session.transitionToAdminReviewing({
        disputeId: dto.dispute_id,
        actorId,
        escalationReason,
        status: ReviewDisputeStatus.ADMIN_REVIEWING,
        now,
      })

      const built = await session.buildCaseFile(dto.dispute_id, actorId)
      const builtCaseFile = {
        id: built.id,
        caseVersion: built.caseVersion,
        completenessScore: built.completenessScore,
      }

      await session.writeAudit(this.execCtx, {
        userId: actorId,
        action: 'report_review_dispute',
        entityId: dto.dispute_id,
        newValues: {
          status: ReviewDisputeStatus.ADMIN_REVIEWING,
          escalation_reason: escalationReason,
          case_file_id: builtCaseFile.id,
          case_version: builtCaseFile.caseVersion,
          case_file_completeness_score: builtCaseFile.completenessScore,
        },
      })

      await session.writeAudit(this.execCtx, {
        userId: actorId,
        action: 'build_review_dispute_case_file',
        entityId: dto.dispute_id,
        newValues: {
          case_file_id: builtCaseFile.id,
          case_version: builtCaseFile.caseVersion,
          completeness_score: builtCaseFile.completenessScore,
          trigger: 'report_review_dispute',
        },
      })

      const shared = {
        businessEventId: dto.dispute_id,
        type: 'review_dispute_escalated',
        organizationId: task.organizationId,
        actorId,
        taskId: dispute.taskId,
        occurredAt: now.toISOString(),
        now,
      }
      await session.stageNotification({
        ...shared,
        eventName: 'review.dispute_escalated_reporter',
        parameters: {
          audience: 'reporter',
          disputeId: dto.dispute_id,
          taskTitle: task.title,
        },
        recipientIds: [actorId],
        ...(this.execCtx.requestId ? { correlationId: this.execCtx.requestId } : {}),
      })

      const adminUserIds = await session.listAdminUserIds(actorId)
      if (adminUserIds.length > 0) {
        await session.stageNotification({
          ...shared,
          eventName: 'review.dispute_escalated_admins',
          parameters: {
            audience: 'admin',
            disputeId: dto.dispute_id,
            taskTitle: task.title,
          },
          recipientIds: adminUserIds,
          ...(this.execCtx.requestId ? { correlationId: this.execCtx.requestId } : {}),
        })
      }

      await session.stageAiDisputeEvaluation(dto.dispute_id, {
        ...this.execCtx,
        organizationId: task.organizationId,
      })

      return {
        id: dto.dispute_id,
        status: ReviewDisputeStatus.ADMIN_REVIEWING,
      }
    })

    await this.settleReportPostCommitEffect(
      'queue_ai_dispute_evaluation',
      () => aiDisputeAutoQueuePublicApi.processAfterReport('review_dispute', dto.dispute_id),
      { disputeId: dto.dispute_id, actorId }
    )

    return result
  }

  private async settleReportPostCommitEffect(
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
