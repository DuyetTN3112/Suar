import { DateTime } from 'luxon'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/application_logger'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { SprintReverseReviewWorkflowOutcome } from '#modules/reviews/actions/dtos/sprint_reverse_review_workflow_outcome'
import type { ReviewCryptography } from '#modules/reviews/actions/ports/outbound/review_cryptography'
import type { ReviewSprintReverseWorkflowUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_sprint_reverse_workflow_unit_of_work'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { aiDisputeAutoQueuePublicApi } from '#modules/reviews/public_contracts/ai_dispute_auto_queue'

type ReportSprintReverseReviewWorkflowInput = { workflow_id: string; body: string }

export default class ReportSprintReverseReviewWorkflowCommand extends BaseCommand<
  ReportSprintReverseReviewWorkflowInput,
  SprintReverseReviewWorkflowOutcome
> {
  constructor(
    execCtx: ReviewActionContext,
    private readonly cryptography: ReviewCryptography,
    private readonly unitOfWork: ReviewSprintReverseWorkflowUnitOfWork
  ) {
    super(execCtx)
  }

  async execute(dto: ReportSprintReverseReviewWorkflowInput): Promise<SprintReverseReviewWorkflowOutcome> {
    return this.handle(dto)
  }

  async handle(dto: ReportSprintReverseReviewWorkflowInput): Promise<SprintReverseReviewWorkflowOutcome> {
    const actorId = this.requireUserId()
    const body = dto.body.trim()
    if (!body) {
      throw new BusinessLogicException('Review sau sprint report reason is required')
    }

    const outcome = await this.unitOfWork.run(async (session) => {
      const workflow = await session.loadWorkflowForUpdate(dto.workflow_id)
      if (!workflow) {
        throw new NotFoundException('Review sau sprint workflow not found')
      }
      if (workflow.reviewerId !== actorId && workflow.responderId !== actorId) {
        throw new ForbiddenException('Only workflow participants can report review sau sprint')
      }
      if (workflow.status !== 'disputed') {
        throw new ConflictException('Only disputed review sau sprint can be reported')
      }

      const now = DateTime.utc()
      const runtimeContext = await session.loadReportRuntimeContext(workflow)
      await session.markReported(workflow.id, now.toJSDate())
      await session.appendMessage({
        id: this.cryptography.nextId(),
        workflowId: workflow.id,
        authorId: actorId,
        messageType: 'report',
        body,
        metadata: { runtime_context: runtimeContext },
        createdAt: now.toJSDate(),
      })
      await session.stageAiDisputeAutoQueue(workflow, {
        ...this.execCtx,
        organizationId: workflow.organizationId,
      })

      return {
        id: workflow.id,
        status: 'reported' as const,
        sprintId: workflow.sprintId,
        projectId: workflow.projectId,
        targetType: workflow.targetType,
      }
    })

    await this.settleReportPostCommitEffect(
      'queue_ai_dispute_evaluation',
      () =>
        aiDisputeAutoQueuePublicApi.processAfterReport(
          'sprint_reverse_review_workflow',
          outcome.id
        ),
      { disputeId: outcome.id, actorId }
    )

    return outcome
  }

  private requireUserId(): string {
    if (!this.execCtx.userId) {
      throw new UnauthorizedException()
    }
    return this.execCtx.userId
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
