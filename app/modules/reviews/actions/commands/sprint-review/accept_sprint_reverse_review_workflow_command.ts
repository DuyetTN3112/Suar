import { DateTime } from 'luxon'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { SprintReverseReviewWorkflowOutcome } from '#modules/reviews/actions/dtos/sprint_reverse_review_workflow_outcome'
import type { ReviewCryptography } from '#modules/reviews/actions/ports/outbound/review_cryptography'
import type { ReviewSprintReverseWorkflowUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_sprint_reverse_workflow_unit_of_work'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

type AcceptSprintReverseReviewWorkflowInput = { workflow_id: string }

export default class AcceptSprintReverseReviewWorkflowCommand extends BaseCommand<
  AcceptSprintReverseReviewWorkflowInput,
  SprintReverseReviewWorkflowOutcome
> {
  constructor(
    execCtx: ReviewActionContext,
    private readonly cryptography: ReviewCryptography,
    private readonly unitOfWork: ReviewSprintReverseWorkflowUnitOfWork
  ) {
    super(execCtx)
  }

  async execute(dto: AcceptSprintReverseReviewWorkflowInput): Promise<SprintReverseReviewWorkflowOutcome> {
    return this.handle(dto)
  }

  async handle(dto: AcceptSprintReverseReviewWorkflowInput): Promise<SprintReverseReviewWorkflowOutcome> {
    const actorId = this.requireUserId()
    return this.unitOfWork.run(async (session) => {
      const workflow = await session.loadWorkflowForUpdate(dto.workflow_id)
      if (!workflow) {
        throw new NotFoundException('Review sau sprint workflow not found')
      }
      if (workflow.responderId !== actorId) {
        throw new ForbiddenException('Only workflow responder can accept review sau sprint')
      }
      if (!['awaiting_response', 'disputed'].includes(workflow.status)) {
        throw new BusinessLogicException('Review sau sprint workflow cannot be accepted now')
      }

      const now = DateTime.utc()
      await session.markAccepted(workflow.id, now.toJSDate())
      await session.appendMessage({
        id: this.cryptography.nextId(),
        workflowId: workflow.id,
        authorId: actorId,
        messageType: 'accept',
        body: 'Accepted review sau sprint outcome.',
        metadata: {},
        createdAt: now.toJSDate(),
      })

      return {
        id: workflow.id,
        status: 'done',
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
