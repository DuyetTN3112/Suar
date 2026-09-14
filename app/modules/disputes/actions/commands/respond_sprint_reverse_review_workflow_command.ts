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
import type { ReviewSprintReverseWorkflowUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_sprint_reverse_workflow_unit_of_work'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

type RespondSprintReverseReviewWorkflowInput = { workflow_id: string; body: string }

export default class RespondSprintReverseReviewWorkflowCommand extends BaseCommand<
  RespondSprintReverseReviewWorkflowInput,
  SprintReverseReviewWorkflowOutcome
> {
  constructor(
    execCtx: ReviewActionContext,
    private readonly cryptography: ReviewCryptography,
    private readonly unitOfWork: ReviewSprintReverseWorkflowUnitOfWork
  ) {
    super(execCtx)
  }

  async execute(dto: RespondSprintReverseReviewWorkflowInput): Promise<SprintReverseReviewWorkflowOutcome> {
    return this.handle(dto)
  }

  async handle(dto: RespondSprintReverseReviewWorkflowInput): Promise<SprintReverseReviewWorkflowOutcome> {
    const actorId = this.requireUserId()
    const body = dto.body.trim()
    if (!body) {
      throw new BusinessLogicException('Review sau sprint response is required')
    }
    return this.unitOfWork.run(async (session) => {
      const workflow = await session.loadWorkflowForUpdate(dto.workflow_id)
      if (!workflow) {
        throw new NotFoundException('Review sau sprint workflow not found')
      }
      if (workflow.responderId !== actorId) {
        throw new ForbiddenException('Only workflow responder can dispute review sau sprint')
      }
      if (workflow.status !== 'awaiting_response') {
        throw new BusinessLogicException(
          'Review sau sprint workflow can only be disputed while awaiting response'
        )
      }

      const now = DateTime.utc()
      await session.markDisputed(workflow.id, now.toJSDate())
      await session.appendMessage({
        id: this.cryptography.nextId(),
        workflowId: workflow.id,
        authorId: actorId,
        messageType: 'response',
        body,
        metadata: {},
        createdAt: now.toJSDate(),
      })

      const occurredAt = now.toJSDate().toISOString()
      await session.stageNotification({
        eventName: 'sprint_reverse_review.disputed',
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
        recipientIds: [workflow.reviewerId],
        now: now.toJSDate(),
      })

      return {
        id: workflow.id,
        status: 'disputed',
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
}
