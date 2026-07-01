import { DateTime } from 'luxon'

import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BACKEND_NOTIFICATION_TYPES } from '#modules/notifications/public_contracts/notification_constants'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { TaskReviewWorkflowOutcome } from '#modules/reviews/actions/dtos/task_review_workflow_outcome'
import type { ReviewTaskWorkflowUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_task_workflow_unit_of_work'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { TASK_REVIEW_WORKFLOW_STATUSES } from '#modules/reviews/domain/task-review/task_review_workflow'

interface RespondToTaskReviewDTO {
  workflowId: string
  reviewMessageId: string
  responseMessageId?: string
  withdrawMessageId?: string
  body: string
}

export default class RespondToTaskReviewCommand extends BaseCommand<
  RespondToTaskReviewDTO,
  TaskReviewWorkflowOutcome
> {
  constructor(
    execCtx: ReviewActionContext,
    private readonly unitOfWork: ReviewTaskWorkflowUnitOfWork
  ) {
    super(execCtx)
  }

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
      if (dto.withdrawMessageId) {
        if (!['awaiting_review', 'in_review', 'awaiting_response', 'disputed'].includes(workflow.status)) {
          throw new ConflictException('Nội dung này không còn được phép xóa sau khi đã gửi báo cáo')
        }
        const withdrawn = await session.withdrawOwnMessage({
          workflowId: dto.workflowId,
          messageId: dto.withdrawMessageId,
          authorId: userId,
          withdrawnAt: DateTime.now().toJSDate(),
        })
        if (!withdrawn) {
          throw new ForbiddenException('Bạn chỉ có thể xóa review hoặc phản hồi của chính mình')
        }
        if (withdrawn.messageType === 'review') {
          const completedReviewCount = await session.countSubmittedReviewers(dto.workflowId)
          if (completedReviewCount < workflow.requiredReviewCount) {
            await session.updateWorkflowProgress({
              workflowId: dto.workflowId,
              completedReviewCount,
              status:
                completedReviewCount === 0
                  ? TASK_REVIEW_WORKFLOW_STATUSES.AWAITING_REVIEW
                  : TASK_REVIEW_WORKFLOW_STATUSES.IN_REVIEW,
              updatedAt: DateTime.now().toJSDate(),
            })
          }
        }
        return {
          workflowId: dto.workflowId,
          taskId: workflow.taskId,
          projectId: workflow.projectId,
        }
      }
      if (dto.responseMessageId) {
        if (!['awaiting_response', 'disputed'].includes(workflow.status)) {
          throw new ConflictException('Phản hồi này không còn được phép chỉnh sửa')
        }
        const updated = await session.updateOwnMessage({
          workflowId: dto.workflowId,
          messageId: dto.responseMessageId,
          authorId: userId,
          messageTypes: ['reviewee_response', 'dispute_reply'],
          body: dto.body,
        })
        if (!updated) {
          throw new ForbiddenException('Bạn chỉ có thể chỉnh sửa phản hồi hoặc trao đổi của chính mình')
        }
        return {
          workflowId: dto.workflowId,
          taskId: workflow.taskId,
          projectId: workflow.projectId,
        }
      }
      const review = await session.findMessage(dto.workflowId, dto.reviewMessageId)
      if (!review || review.messageType !== 'review') {
        throw new NotFoundException('Không tìm thấy review cần phản hồi')
      }
      const isInitialRevieweeResponse =
        workflow.status === TASK_REVIEW_WORKFLOW_STATUSES.AWAITING_RESPONSE &&
        workflow.revieweeId === userId
      const isDisputeParticipant =
        workflow.status === TASK_REVIEW_WORKFLOW_STATUSES.DISPUTED &&
        (workflow.revieweeId === userId || review.authorId === userId)
      if (!isInitialRevieweeResponse && !isDisputeParticipant) {
        throw new ForbiddenException(
          'Chỉ người được review và reviewer của luồng tranh chấp mới có thể trao đổi'
        )
      }
      if (
        isInitialRevieweeResponse &&
        (await session.hasRevieweeResponse(dto.workflowId, dto.reviewMessageId))
      ) {
        throw new ConflictException('Review này đã có phản hồi ban đầu')
      }

      const now = DateTime.now().toJSDate()
      const responseMessageId = await session.appendMessage({
        workflowId: dto.workflowId,
        authorId: userId,
        messageType: isInitialRevieweeResponse ? 'reviewee_response' : 'dispute_reply',
        body: dto.body,
        parentReviewMessageId: review.id,
      })
      await session.stageNotification({
        eventName: 'task_review.response_submitted',
        businessEventId: responseMessageId,
        type: BACKEND_NOTIFICATION_TYPES.REVIEW_RECEIVED,
        organizationId: workflow.organizationId,
        actorId: userId,
        taskId: workflow.taskId,
        parameters: {
          workflowId: dto.workflowId,
          taskId: workflow.taskId,
          reviewKind: 'task_review',
          reviewEvent: isInitialRevieweeResponse ? 'reviewee_response' : 'dispute_reply',
          reviewMessageId: review.id,
          status: workflow.status,
        },
        recipientIds: isInitialRevieweeResponse
          ? [review.authorId]
          : [workflow.revieweeId, review.authorId].filter(
              (participantId): participantId is string => Boolean(participantId && participantId !== userId)
            ),
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
