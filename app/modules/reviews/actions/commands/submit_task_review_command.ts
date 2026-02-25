import { DateTime } from 'luxon'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BACKEND_NOTIFICATION_TYPES } from '#modules/notifications/public_contracts/notification_constants'
import type { TaskReviewWorkflowOutcome } from '#modules/reviews/actions/dtos/task_review_workflow_outcome'
import type { ReviewTaskWorkflowUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_task_workflow_unit_of_work'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { TASK_REVIEW_WORKFLOW_STATUSES } from '#modules/reviews/domain/task_review_workflow'

interface SubmitTaskReviewDTO {
  workflowId: string
  body: string
}

export default class SubmitTaskReviewCommand {
  constructor(
    private readonly execCtx: ReviewActionContext,
    private readonly unitOfWork: ReviewTaskWorkflowUnitOfWork
  ) {}

  handle(dto: SubmitTaskReviewDTO): Promise<TaskReviewWorkflowOutcome> {
    return this.execute(dto)
  }

  execute(dto: SubmitTaskReviewDTO): Promise<TaskReviewWorkflowOutcome> {
    const reviewerId = this.requireUserId()

    return this.unitOfWork.run(async (session) => {
      const workflow = await session.loadWorkflow(dto.workflowId)
      if (!workflow) {
        throw new NotFoundException('Task review workflow not found')
      }
      const taskAssigneeId = await session.loadTaskAssignee(workflow.taskId)
      if (taskAssigneeId === undefined) {
        throw new NotFoundException('Task not found')
      }
      if (taskAssigneeId === reviewerId) {
        throw new BusinessLogicException('Bạn không thể review task được giao cho chính mình')
      }

      const reviewer = await session.findReviewer(dto.workflowId, reviewerId)
      if (!reviewer) {
        throw new BusinessLogicException('Bạn không nằm trong danh sách reviewer của task này')
      }
      if (reviewer.status === 'submitted') {
        throw new BusinessLogicException('Bạn đã review task này rồi')
      }

      const now = DateTime.now().toJSDate()
      await session.markReviewerSubmitted(reviewer.id, now)
      await session.appendMessage({
        workflowId: dto.workflowId,
        authorId: reviewerId,
        messageType: 'review',
        body: dto.body,
      })

      const completedReviewCount = await session.countSubmittedReviewers(dto.workflowId)
      const requiredReviewCount = workflow.requiredReviewCount
      const isQuorumReached = completedReviewCount >= requiredReviewCount
      await session.updateWorkflowProgress({
        workflowId: dto.workflowId,
        completedReviewCount,
        status: isQuorumReached
          ? TASK_REVIEW_WORKFLOW_STATUSES.AWAITING_RESPONSE
          : TASK_REVIEW_WORKFLOW_STATUSES.IN_REVIEW,
        updatedAt: now,
      })

      if (isQuorumReached) {
        await session.stageNotification({
          eventName: 'task_review.reviews_complete',
          businessEventId: dto.workflowId,
          type: BACKEND_NOTIFICATION_TYPES.REVIEW_RECEIVED,
          organizationId: workflow.organizationId,
          actorId: reviewerId,
          taskId: workflow.taskId,
          parameters: {
            workflowId: dto.workflowId,
            taskId: workflow.taskId,
            reviewKind: 'task_review',
            status: TASK_REVIEW_WORKFLOW_STATUSES.AWAITING_RESPONSE,
            completedReviewCount,
            requiredReviewCount,
          },
          recipientIds: workflow.revieweeId ? [workflow.revieweeId] : [],
          occurredAt: now,
          ...(this.execCtx.requestId ? { correlationId: this.execCtx.requestId } : {}),
        })
      }

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
