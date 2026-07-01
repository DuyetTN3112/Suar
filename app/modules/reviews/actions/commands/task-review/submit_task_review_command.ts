import { DateTime } from 'luxon'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BACKEND_NOTIFICATION_TYPES } from '#modules/notifications/public_contracts/notification_constants'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { TaskReviewWorkflowOutcome } from '#modules/reviews/actions/dtos/task_review_workflow_outcome'
import type { ReviewTaskWorkflowUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_task_workflow_unit_of_work'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { TASK_REVIEW_WORKFLOW_STATUSES } from '#modules/reviews/domain/task-review/task_review_workflow'

interface SubmitTaskReviewDTO {
  workflowId: string
  body: string
}

export default class SubmitTaskReviewCommand extends BaseCommand<
  SubmitTaskReviewDTO,
  TaskReviewWorkflowOutcome
> {
  constructor(
    execCtx: ReviewActionContext,
    private readonly unitOfWork: ReviewTaskWorkflowUnitOfWork
  ) {
    super(execCtx)
  }

  handle(dto: SubmitTaskReviewDTO): Promise<TaskReviewWorkflowOutcome> {
    const reviewerId = this.requireUserId()

    return this.unitOfWork.run(async (session) => {
      const workflow = await session.loadWorkflow(dto.workflowId)
      if (!workflow) {
        throw new NotFoundException('Task review workflow not found')
      }
      if (
        !['awaiting_review', 'in_review', 'awaiting_response', 'disputed'].includes(workflow.status)
      ) {
        throw new BusinessLogicException('Task review này đã đóng, không thể gửi thêm review')
      }
      const taskAssigneeId = await session.loadTaskAssignee(workflow.taskId)
      if (taskAssigneeId === undefined) {
        throw new NotFoundException('Task not found')
      }
      if (taskAssigneeId === reviewerId) {
        throw new BusinessLogicException('Bạn không thể review task được giao cho chính mình')
      }

      let reviewer = await session.findReviewer(dto.workflowId, reviewerId)
      if (!reviewer) {
        if (workflow.status === TASK_REVIEW_WORKFLOW_STATUSES.DISPUTED) {
          throw new BusinessLogicException(
            'Đang có tranh chấp, chỉ reviewer đã gửi review mới được chỉnh sửa review của mình'
          )
        }
        const candidates = await session.listReviewerCandidates(
          workflow.projectId,
          workflow.organizationId,
          [workflow.revieweeId].filter((id): id is string => Boolean(id))
        )
        if (!candidates.some((candidate) => candidate.userId === reviewerId)) {
          throw new BusinessLogicException('Bạn không thuộc project nên không thể review task này')
        }
        await session.createWorkflowReviewers(dto.workflowId, [
          {
            reviewerId,
            role: 'project_member_reviewer',
            priorityRank: 1000,
            isRequired: false,
          },
        ])
        reviewer = await session.findReviewer(dto.workflowId, reviewerId)
        if (!reviewer) {
          throw new BusinessLogicException('Không thể đăng ký reviewer cho task này')
        }
      }
      if (reviewer.status === 'submitted') {
        if (!['in_review', 'awaiting_response', 'disputed'].includes(workflow.status)) {
          throw new BusinessLogicException('Review này không còn được phép chỉnh sửa')
        }

        const updated = await session.updateSubmittedReview({
          workflowId: dto.workflowId,
          authorId: reviewerId,
          body: dto.body,
        })
        if (!updated) {
          throw new BusinessLogicException('Không tìm thấy nội dung review đã gửi để chỉnh sửa')
        }

        return {
          workflowId: dto.workflowId,
          taskId: workflow.taskId,
          projectId: workflow.projectId,
        }
      }

      const now = DateTime.now().toJSDate()
      await session.markReviewerSubmitted(reviewer.id, now)
      const reviewMessageId = await session.appendMessage({
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
        status: ['disputed', 'reported'].includes(workflow.status)
          ? workflow.status
          : isQuorumReached
            ? TASK_REVIEW_WORKFLOW_STATUSES.AWAITING_RESPONSE
            : TASK_REVIEW_WORKFLOW_STATUSES.IN_REVIEW,
        updatedAt: now,
      })

      await session.stageNotification({
        eventName: isQuorumReached
          ? 'task_review.reviews_complete'
          : 'task_review.review_submitted',
        businessEventId: isQuorumReached
          ? `${dto.workflowId}:reviews-complete:${reviewMessageId}`
          : reviewMessageId,
        type: BACKEND_NOTIFICATION_TYPES.REVIEW_RECEIVED,
        organizationId: workflow.organizationId,
        actorId: reviewerId,
        taskId: workflow.taskId,
        parameters: {
          workflowId: dto.workflowId,
          taskId: workflow.taskId,
          reviewMessageId,
          reviewKind: 'task_review',
          reviewEvent: isQuorumReached ? 'reviews_complete' : 'review_submitted',
          status: isQuorumReached
            ? TASK_REVIEW_WORKFLOW_STATUSES.AWAITING_RESPONSE
            : TASK_REVIEW_WORKFLOW_STATUSES.IN_REVIEW,
          completedReviewCount,
          requiredReviewCount,
        },
        recipientIds: workflow.revieweeId ? [workflow.revieweeId] : [],
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

  execute(dto: SubmitTaskReviewDTO): Promise<TaskReviewWorkflowOutcome> {
    return this.handle(dto)
  }

  private requireUserId(): string {
    if (!this.execCtx.userId) {
      throw new UnauthorizedException('User must be authenticated to execute this command')
    }
    return this.execCtx.userId
  }
}
