import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { TaskReviewWorkflowOutcome } from '#modules/reviews/actions/dtos/task_review_workflow_outcome'
import type { ReviewConfirmationDisputeUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_confirmation_dispute_unit_of_work'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { TASK_REVIEW_WORKFLOW_STATUSES } from '#modules/reviews/domain/task-review/task_review_workflow'
import { ReviewSessionStatus } from '#modules/reviews/public_contracts/review_constants'

interface AcceptTaskReviewDTO {
  workflowId: string
  reviewMessageId: string
  decision: 'accepted' | 'rejected'
}

function requireUserId(ctx: ReviewActionContext): string {
  if (!ctx.userId) {
    throw new UnauthorizedException()
  }
  return ctx.userId
}

export default class AcceptTaskReviewCommand extends BaseCommand<
  AcceptTaskReviewDTO,
  TaskReviewWorkflowOutcome
> {
  constructor(
    execCtx: ReviewActionContext,
    private readonly unitOfWork: ReviewConfirmationDisputeUnitOfWork
  ) {
    super(execCtx)
  }

  async handle(dto: AcceptTaskReviewDTO): Promise<TaskReviewWorkflowOutcome> {
    const userId = requireUserId(this.execCtx)
    return this.unitOfWork.run(async (persistence) => {
      const workflow = await persistence.loadTaskReviewWorkflowForUpdate(dto.workflowId)
      if (!workflow) {
        throw new NotFoundException('Task review workflow not found')
      }

      if (!['awaiting_response', 'disputed'].includes(workflow.status)) {
        throw new ConflictException('Review này không còn ở trạng thái có thể xử lý')
      }
      if (workflow.completedReviewCount < workflow.requiredReviewCount) {
        throw new ConflictException('Task chưa đủ số reviewer bắt buộc')
      }
      const reviewMessage = await persistence.loadTaskReviewMessageForDecision(
        dto.workflowId,
        dto.reviewMessageId
      )
      if (!reviewMessage) {
        throw new NotFoundException('Không tìm thấy review cần xử lý')
      }
      const now = new Date()
      const isReviewee = workflow.revieweeId === userId
      const isReviewAuthor = reviewMessage.authorId === userId

      if (isReviewAuthor) {
        if (
          dto.decision !== 'accepted' ||
          ![
            TASK_REVIEW_WORKFLOW_STATUSES.AWAITING_RESPONSE,
            TASK_REVIEW_WORKFLOW_STATUSES.DISPUTED,
          ].includes(workflow.status)
        ) {
          throw new ForbiddenException('Reviewer chỉ có thể xác nhận sau khi người thực hiện đã phản hồi')
        }
        if (reviewMessage.revieweeDecision === 'rejected') {
          throw new ConflictException('Review này đang ở trạng thái tranh chấp')
        }
        if (!(await persistence.hasTaskRevieweeResponse(dto.workflowId, dto.reviewMessageId))) {
          throw new ConflictException('Cần có phản hồi của người được review trước khi đồng ý')
        }
        if (reviewMessage.reviewerAgreedAt) {
          throw new ConflictException('Reviewer đã xác nhận giải quyết tranh chấp này')
        }
        await persistence.acknowledgeReviewerAgreement({
          reviewMessageId: dto.reviewMessageId,
          agreedAt: now,
        })
      } else if (isReviewee) {
        if (reviewMessage.revieweeDecision === 'accepted') {
          throw new ConflictException('Bạn đã xác nhận review này')
        }
        if (reviewMessage.revieweeDecision === 'rejected' && dto.decision === 'rejected') {
          throw new ConflictException('Review này đang ở trạng thái tranh chấp')
        }
        if (!(await persistence.hasTaskRevieweeResponse(dto.workflowId, dto.reviewMessageId))) {
          throw new ConflictException('Cần phản hồi review này trước khi đưa ra quyết định')
        }
        await persistence.decideTaskReviewMessage({
          reviewMessageId: dto.reviewMessageId,
          decision: dto.decision,
          decidedAt: now,
        })
        if (dto.decision === 'rejected') {
          await persistence.updateTaskReviewWorkflowStatus({
            workflowId: dto.workflowId,
            status: TASK_REVIEW_WORKFLOW_STATUSES.DISPUTED,
            updatedAt: now,
          })
          return {
            workflowId: dto.workflowId,
            taskId: workflow.taskId,
            projectId: workflow.projectId,
          }
        }
      } else {
        throw new ForbiddenException('Chỉ người được review và reviewer của review này mới được xác nhận')
      }
      if ((await persistence.countUnresolvedTaskReviewThreads(dto.workflowId)) > 0) {
        return {
          workflowId: dto.workflowId,
          taskId: workflow.taskId,
          projectId: workflow.projectId,
        }
      }
      const outcome = {
        workflowId: dto.workflowId,
        taskId: workflow.taskId,
        projectId: workflow.projectId,
      }

      await persistence.markTaskReviewWorkflowAccepted({
        workflowId: dto.workflowId,
        actorId: userId,
        status: TASK_REVIEW_WORKFLOW_STATUSES.DONE,
        messageBody: 'Both parties confirmed every submitted task review.',
        acceptedAt: now,
      })

      // A Task Review Board reaching `done` is the only task-workflow
      // transition that can trigger profile aggregation. It is staged before
      // the optional legacy review-session bridge because native workflows do
      // not necessarily have a review session.
      if (workflow.taskAssignmentId) {
        await persistence.stageTaskReviewFinalizedEvent({
          workflowId: workflow.id,
          taskAssignmentId: workflow.taskAssignmentId,
          taskId: workflow.taskId,
          revieweeId: workflow.revieweeId,
          finalizedBy: userId,
          finalizationSource: 'consensus',
          finalizedAt: now,
        })
      }

      const assignment = await persistence.findLatestCompletedAssignment(
        workflow.taskId,
        workflow.revieweeId
      )
      if (!assignment) {
        return outcome
      }

      const session = await persistence.loadSessionForAssignmentForUpdate(
        assignment.id,
        workflow.revieweeId
      )
      if (!session || session.status !== ReviewSessionStatus.COMPLETED) {
        return outcome
      }

      const confirmations = [...session.confirmations]
      const hasConfirmation = confirmations.some(
        (confirmation) =>
          confirmation.user_id === workflow.revieweeId && confirmation.action === 'confirmed'
      )
      if (!hasConfirmation) {
        confirmations.push({
          user_id: workflow.revieweeId,
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

      const confirmationId = `review-confirmed:${session.id}:${workflow.revieweeId}`
      await persistence.stageReviewConfirmedEvent({
        confirmationId,
        reviewSessionId: session.id,
        revieweeId: session.revieweeId,
        reviewerIds,
        confirmedBy: workflow.revieweeId,
        action: 'confirmed',
      })
      return outcome
    })
  }

  async execute(dto: AcceptTaskReviewDTO): Promise<TaskReviewWorkflowOutcome> {
    return this.handle(dto)
  }
}
