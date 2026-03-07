import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type { TaskReviewWorkflowOutcome } from '#modules/reviews/actions/dtos/task_review_workflow_outcome'
import type { ReviewConfirmationDisputeUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_confirmation_dispute_unit_of_work'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { TASK_REVIEW_WORKFLOW_STATUSES } from '#modules/reviews/domain/task_review_workflow'
import { ReviewSessionStatus } from '#modules/reviews/public_contracts/review_constants'

interface AcceptTaskReviewDTO {
  workflowId: string
}

function requireUserId(ctx: ReviewActionContext): string {
  if (!ctx.userId) {
    throw new UnauthorizedException()
  }
  return ctx.userId
}

export default class AcceptTaskReviewCommand {
  constructor(
    private readonly execCtx: ReviewActionContext,
    private readonly unitOfWork: ReviewConfirmationDisputeUnitOfWork
  ) {}

  async handle(dto: AcceptTaskReviewDTO): Promise<TaskReviewWorkflowOutcome> {
    const userId = requireUserId(this.execCtx)
    return this.unitOfWork.run(async (persistence) => {
      const workflow = await persistence.loadTaskReviewWorkflowForUpdate(dto.workflowId)
      if (!workflow) {
        throw new NotFoundException('Task review workflow not found')
      }

      if (workflow.revieweeId !== userId) {
        throw new ForbiddenException('Chỉ người được review mới được đồng ý review')
      }
      if (workflow.completedReviewCount < workflow.requiredReviewCount) {
        throw new ConflictException('Task chưa đủ số reviewer bắt buộc')
      }
      const outcome = {
        workflowId: dto.workflowId,
        taskId: workflow.taskId,
        projectId: workflow.projectId,
      }

      const now = new Date()
      await persistence.markTaskReviewWorkflowAccepted({
        workflowId: dto.workflowId,
        actorId: userId,
        status: TASK_REVIEW_WORKFLOW_STATUSES.DONE,
        messageBody: 'Reviewee accepted the review result.',
        acceptedAt: now,
      })

      const assignment = await persistence.findLatestCompletedAssignment(workflow.taskId, userId)
      if (!assignment) {
        return outcome
      }

      const session = await persistence.loadSessionForAssignmentForUpdate(assignment.id, userId)
      if (!session || session.status !== ReviewSessionStatus.COMPLETED) {
        return outcome
      }

      const confirmations = [...session.confirmations]
      const hasConfirmation = confirmations.some(
        (confirmation) => confirmation.user_id === userId && confirmation.action === 'confirmed'
      )
      if (!hasConfirmation) {
        confirmations.push({
          user_id: userId,
          action: 'confirmed',
          dispute_reason: null,
          created_at: now.toISOString(),
        })
        await persistence.saveSessionState({
          reviewSessionId: session.id,
          status: session.status,
          confirmations,
          updatedAt: now,
        })
      }

      await persistence.verifyLinkedEvidence(session.id)

      const reviewerIds = [...new Set(await persistence.listReviewerIds(session.id, true))].sort()
      if (reviewerIds.length === 0) {
        return outcome
      }

      const confirmationId = `review-confirmed:${session.id}:${userId}`
      await persistence.stageReviewConfirmedEvent({
        confirmationId,
        reviewSessionId: session.id,
        revieweeId: session.revieweeId,
        reviewerIds,
        confirmedBy: userId,
        action: 'confirmed',
      })
      return outcome
    })
  }

  async execute(dto: AcceptTaskReviewDTO): Promise<TaskReviewWorkflowOutcome> {
    return this.handle(dto)
  }
}
