import { DateTime } from 'luxon'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BACKEND_NOTIFICATION_TYPES } from '#modules/notifications/public_contracts/notification_constants'
import type { TaskReviewWorkflowOutcome } from '#modules/reviews/actions/dtos/task_review_workflow_outcome'
import type { ReviewTaskWorkflowUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_task_workflow_unit_of_work'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { TASK_REVIEW_WORKFLOW_STATUSES } from '#modules/reviews/domain/task_review_workflow'

interface RespondToTaskReviewDTO {
  workflowId: string
  body: string
}

export default class RespondToTaskReviewCommand {
  constructor(
    private readonly execCtx: ReviewActionContext,
    private readonly unitOfWork: ReviewTaskWorkflowUnitOfWork
  ) {}

  handle(dto: RespondToTaskReviewDTO): Promise<TaskReviewWorkflowOutcome> {
    return this.execute(dto)
  }

  execute(dto: RespondToTaskReviewDTO): Promise<TaskReviewWorkflowOutcome> {
    const userId = this.requireUserId()

    return this.unitOfWork.run(async (session) => {
      const workflow = await session.loadWorkflow(dto.workflowId)
      if (!workflow) {
        throw new NotFoundException('Task review workflow not found')
      }
      if (workflow.revieweeId !== userId) {
        throw new ForbiddenException('Chỉ người được review mới được phản hồi review')
      }

      const now = DateTime.now().toJSDate()
      await session.appendMessage({
        workflowId: dto.workflowId,
        authorId: userId,
        messageType: 'reviewee_response',
        body: dto.body,
      })
      await session.markDisputed(dto.workflowId, now)
      const reviewerIds = await session.listReviewerIds(dto.workflowId)
      await session.stageNotification({
        eventName: 'task_review.dispute_raised',
        businessEventId: dto.workflowId,
        type: BACKEND_NOTIFICATION_TYPES.REVIEW_RECEIVED,
        organizationId: workflow.organizationId,
        actorId: userId,
        taskId: workflow.taskId,
        parameters: {
          workflowId: dto.workflowId,
          taskId: workflow.taskId,
          reviewKind: 'task_review',
          status: TASK_REVIEW_WORKFLOW_STATUSES.DISPUTED,
        },
        recipientIds: reviewerIds,
        occurredAt: now,
        ...(this.execCtx.requestId ? { correlationId: this.execCtx.requestId } : {}),
      })

      return {
        workflowId: dto.workflowId,
        taskId: workflow.taskId,
        projectId: workflow.projectId,
      }
    })
  }

  private requireUserId(): string {
    if (!this.execCtx.userId) {
      throw new UnauthorizedException('User must be authenticated to execute this command')
    }
    return this.execCtx.userId
  }
}
