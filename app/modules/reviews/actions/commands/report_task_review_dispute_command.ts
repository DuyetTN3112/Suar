import { DateTime } from 'luxon'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/application_logger'
import { BACKEND_NOTIFICATION_TYPES } from '#modules/notifications/public_contracts/notification_constants'
import type { TaskReviewWorkflowOutcome } from '#modules/reviews/actions/dtos/task_review_workflow_outcome'
import type { ReviewTaskWorkflowUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_task_workflow_unit_of_work'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { TASK_REVIEW_WORKFLOW_STATUSES } from '#modules/reviews/domain/task_review_workflow'
import { aiDisputeAutoQueuePublicApi } from '#modules/reviews/public_contracts/ai_dispute_auto_queue'

interface ReportTaskReviewDisputeDTO {
  workflowId: string
  reason: string
}

export default class ReportTaskReviewDisputeCommand {
  constructor(
    private readonly execCtx: ReviewActionContext,
    private readonly unitOfWork: ReviewTaskWorkflowUnitOfWork
  ) {}

  handle(dto: ReportTaskReviewDisputeDTO): Promise<TaskReviewWorkflowOutcome> {
    return this.execute(dto)
  }

  async execute(dto: ReportTaskReviewDisputeDTO): Promise<TaskReviewWorkflowOutcome> {
    const userId = this.requireUserId()
    const outcome = await this.unitOfWork.run(async (session) => {
      const workflow = await session.loadWorkflow(dto.workflowId)
      if (!workflow) {
        throw new NotFoundException('Task review workflow not found')
      }
      const reviewer = await session.findReviewer(dto.workflowId, userId)
      const reviewerIds = await session.listReviewerIds(dto.workflowId)

      if (workflow.revieweeId !== userId && !reviewer) {
        throw new ForbiddenException('Chỉ reviewer hoặc người được review mới được gửi report')
      }

      const runtimeContext = await session.loadReportRuntimeContext(
        dto.workflowId,
        userId,
        dto.reason
      )
      const now = DateTime.now().toJSDate()
      await session.appendMessage({
        workflowId: dto.workflowId,
        authorId: userId,
        messageType: 'system',
        body: `Task review dispute reported: ${dto.reason}`,
        metadata: { runtime_context: runtimeContext },
      })
      await session.markReported({
        workflowId: dto.workflowId,
        reporterId: userId,
        runtimeContext,
        reportedAt: now,
      })
      const counterpartyIds =
        workflow.revieweeId === userId
          ? reviewerIds
          : workflow.revieweeId
            ? [workflow.revieweeId]
            : []
      await session.stageNotification({
        eventName: 'task_review.dispute_reported',
        businessEventId: dto.workflowId,
        type: BACKEND_NOTIFICATION_TYPES.REVIEW_DISPUTE_ESCALATED,
        organizationId: workflow.organizationId,
        actorId: userId,
        taskId: workflow.taskId,
        parameters: {
          workflowId: dto.workflowId,
          taskId: workflow.taskId,
          reviewKind: 'task_review',
          status: TASK_REVIEW_WORKFLOW_STATUSES.REPORTED,
        },
        recipientIds: counterpartyIds,
        occurredAt: now,
        ...(this.execCtx.requestId ? { correlationId: this.execCtx.requestId } : {}),
      })
      await session.stageAiDisputeAutoQueue(dto.workflowId, this.execCtx)

      return {
        workflowId: dto.workflowId,
        taskId: workflow.taskId,
        projectId: workflow.projectId,
      }
    })

    await this.settlePostCommitEffect(
      'queue_ai_dispute_evaluation',
      () => aiDisputeAutoQueuePublicApi.processAfterReport('task_review_workflow', dto.workflowId),
      { disputeId: dto.workflowId, actorId: userId }
    )
    return outcome
  }

  private requireUserId(): string {
    if (!this.execCtx.userId) {
      throw new UnauthorizedException('User must be authenticated to execute this command')
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
