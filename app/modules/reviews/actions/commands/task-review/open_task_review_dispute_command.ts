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

interface OpenTaskReviewDisputeDTO {
  workflowId: string
  reviewMessageId: string
  responseMessageId?: string
}

/**
 * Explicitly opens a discussion after the reviewee has responded.
 * A response alone never escalates a workflow into dispute.
 */
export default class OpenTaskReviewDisputeCommand extends BaseCommand<
  OpenTaskReviewDisputeDTO,
  TaskReviewWorkflowOutcome
> {
  constructor(
    execCtx: ReviewActionContext,
    private readonly unitOfWork: ReviewTaskWorkflowUnitOfWork
  ) {
    super(execCtx)
  }

  async handle(dto: OpenTaskReviewDisputeDTO): Promise<TaskReviewWorkflowOutcome> {
    return this.execute(dto)
  }

  async execute(dto: OpenTaskReviewDisputeDTO): Promise<TaskReviewWorkflowOutcome> {
    const userId = this.requireUserId()

    return this.unitOfWork.run(async (session) => {
      const workflow = await session.loadWorkflow(dto.workflowId)
      if (!workflow) throw new NotFoundException('Task review workflow not found')
      if (workflow.status !== TASK_REVIEW_WORKFLOW_STATUSES.AWAITING_RESPONSE) {
        throw new ConflictException('Review này không còn ở trạng thái chờ mở tranh luận')
      }

      const review = await session.findMessage(dto.workflowId, dto.reviewMessageId)
      if (!review || review.messageType !== 'review') {
        throw new NotFoundException('Không tìm thấy review cần mở tranh luận')
      }
      if (review.revieweeDecision === 'accepted') {
        throw new ConflictException('Review này đã được đồng ý và không thể mở tranh luận')
      }
      if (!(await session.hasRevieweeResponse(dto.workflowId, review.id))) {
        throw new ConflictException('Cần có phản hồi của người được review trước khi mở tranh luận')
      }

      const reviewerIds = await session.listReviewerIds(dto.workflowId)
      const isReviewee = workflow.revieweeId === userId
      const isReviewer = review.authorId === userId
      if (!isReviewee && !isReviewer) {
        throw new ForbiddenException(
          'Chỉ người được review hoặc reviewer của review này mới được mở tranh luận'
        )
      }

      const now = DateTime.now().toJSDate()
      await session.markDisputed(dto.workflowId, now)
      const recipientIds = isReviewee
        ? reviewerIds
        : workflow.revieweeId
          ? [workflow.revieweeId]
          : []
      await session.stageNotification({
        eventName: 'task_review.dispute_opened',
        businessEventId: `${dto.workflowId}:${review.id}:dispute-opened:${dto.responseMessageId?.trim() || userId}`,
        type: BACKEND_NOTIFICATION_TYPES.REVIEW_RECEIVED,
        organizationId: workflow.organizationId,
        actorId: userId,
        taskId: workflow.taskId,
        parameters: {
          workflowId: dto.workflowId,
          taskId: workflow.taskId,
          reviewKind: 'task_review',
          reviewMessageId: review.id,
          status: TASK_REVIEW_WORKFLOW_STATUSES.DISPUTED,
        },
        recipientIds: recipientIds.filter((recipientId) => recipientId !== userId),
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
