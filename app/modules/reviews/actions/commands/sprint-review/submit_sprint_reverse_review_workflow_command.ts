import { DateTime } from 'luxon'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { SprintReverseReviewWorkflowOutcome } from '#modules/reviews/actions/dtos/sprint_reverse_review_workflow_outcome'
import type { ReviewCryptography } from '#modules/reviews/actions/ports/outbound/review_cryptography'
import type {
  ReviewSprintReverseWorkflow,
  ReviewSprintReverseWorkflowPersistenceSession,
  ReviewSprintReverseWorkflowUnitOfWork,
} from '#modules/reviews/actions/ports/outbound/review_sprint_reverse_workflow_unit_of_work'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

export interface SubmitSprintReverseReviewWorkflowDTO {
  workflow_id: string
  rating: number
  comment: string
}

export default class SubmitSprintReverseReviewWorkflowCommand extends BaseCommand<
  SubmitSprintReverseReviewWorkflowDTO,
  SprintReverseReviewWorkflowOutcome
> {
  constructor(
    execCtx: ReviewActionContext,
    private readonly cryptography: ReviewCryptography,
    private readonly unitOfWork: ReviewSprintReverseWorkflowUnitOfWork
  ) {
    super(execCtx)
  }

  async execute(
    dto: SubmitSprintReverseReviewWorkflowDTO
  ): Promise<SprintReverseReviewWorkflowOutcome> {
    return this.handle(dto)
  }

  async handle(
    dto: SubmitSprintReverseReviewWorkflowDTO
  ): Promise<SprintReverseReviewWorkflowOutcome> {
    const actorId = this.requireUserId()
    this.assertValidInput(dto)

    return this.unitOfWork.run(async (session) => {
      const workflow = await session.loadWorkflowForUpdate(dto.workflow_id)
      if (!workflow) {
        throw new NotFoundException('Review sau sprint workflow not found')
      }
      if (workflow.reviewerId !== actorId) {
        throw new ForbiddenException('Only workflow reviewer can submit review sau sprint')
      }
      if (workflow.status !== 'awaiting_review') {
        throw new BusinessLogicException('Review sau sprint workflow is not awaiting review')
      }
      if (!workflow.packageId) {
        throw new BusinessLogicException('Review sau sprint workflow has no review package')
      }

      const now = DateTime.utc()
      const comment = dto.comment.trim()
      await this.persistSubmittedReview(workflow, dto, session, now.toJSDate())
      await session.markSubmitted(workflow.id, dto.rating, comment, now.toJSDate())
      await session.appendMessage({
        id: this.cryptography.nextId(),
        workflowId: workflow.id,
        authorId: actorId,
        messageType: 'review',
        body: comment,
        metadata: { rating: dto.rating },
        createdAt: now.toJSDate(),
      })

      if (workflow.targetUserId) {
        const occurredAt = now.toJSDate().toISOString()
        await session.stageNotification({
          eventName: 'sprint_reverse_review.submitted',
          businessEventId: workflow.id,
          type: BACKEND_NOTIFICATION_TYPES.REVERSE_REVIEW_RECEIVED,
          scope: { kind: 'organization', id: workflow.organizationId },
          actor: { type: 'user', id: actorId },
          subject: {
            type: BACKEND_NOTIFICATION_ENTITY_TYPES.PROJECT_SPRINT,
            id: workflow.sprintId,
          },
          parameters: {
            sprintId: workflow.sprintId,
            workflowId: workflow.id,
            targetType: workflow.targetType,
          },
          occurredAt,
          correlationId: workflow.id,
          recipientIds: [workflow.targetUserId],
          now: now.toJSDate(),
        })
      }

      return {
        id: workflow.id,
        status: 'awaiting_response',
        sprintId: workflow.sprintId,
        projectId: workflow.projectId,
        targetType: workflow.targetType,
      }
    })
  }

  private requireUserId(): string {
    if (!this.execCtx.userId) {
      throw new UnauthorizedException()
    }
    return this.execCtx.userId
  }

  private assertValidInput(dto: SubmitSprintReverseReviewWorkflowDTO): void {
    if (!Number.isInteger(dto.rating) || dto.rating < 1 || dto.rating > 5) {
      throw new BusinessLogicException('Review sau sprint rating must be an integer from 1 to 5')
    }
    if (!dto.comment.trim()) {
      throw new BusinessLogicException('Review sau sprint comment is required')
    }
  }

  private async persistSubmittedReview(
    workflow: ReviewSprintReverseWorkflow,
    dto: SubmitSprintReverseReviewWorkflowDTO,
    session: ReviewSprintReverseWorkflowPersistenceSession,
    now: Date
  ): Promise<void> {
    if (!workflow.packageId) {
      throw new BusinessLogicException('Review sau sprint workflow has no review package')
    }

    if (workflow.targetType === 'assigner') {
      if (!workflow.targetUserId) {
        throw new BusinessLogicException('Review người giao việc target is missing')
      }
      await session.createManagerReview({
        id: this.cryptography.nextId(),
        packageId: workflow.packageId,
        targetUserId: workflow.targetUserId,
        rating: dto.rating,
        comment: dto.comment.trim(),
        createdAt: now,
      })
      return
    }

    await session.createEnvironmentReview({
      id: this.cryptography.nextId(),
      packageId: workflow.packageId,
      organizationId: workflow.organizationId,
      rating: dto.rating,
      comment: dto.comment.trim(),
      createdAt: now,
    })
  }
}
