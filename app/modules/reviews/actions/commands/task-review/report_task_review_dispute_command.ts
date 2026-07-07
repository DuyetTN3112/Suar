import { DateTime } from 'luxon'

import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { BACKEND_NOTIFICATION_TYPES } from '#modules/notifications/public_contracts/notification_constants'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { TaskReviewWorkflowOutcome } from '#modules/reviews/actions/dtos/task_review_workflow_outcome'
import type {
  ReviewTaskWorkflowUnitOfWork,
  TaskReviewDisputeReport,
} from '#modules/reviews/actions/ports/outbound/review_task_workflow_unit_of_work'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { TASK_REVIEW_WORKFLOW_STATUSES } from '#modules/reviews/domain/task-review/task_review_workflow'
import { aiDisputeAutoQueuePublicApi } from '#modules/reviews/public_contracts/ai_dispute_auto_queue'

interface ReportTaskReviewDisputeDTO {
  workflowId: string
  reviewMessageId: string
  disputeType: TaskReviewDisputeReport['disputeType']
  claim: string
  evidence: string
  requestedOutcome: TaskReviewDisputeReport['requestedOutcome']
}

const DISPUTE_TYPES = new Set<TaskReviewDisputeReport['disputeType']>([
  'deadline',
  'scope',
  'missing_context',
  'scope_change',
  'review_fairness',
  'review_score',
  'other',
])
const REQUESTED_OUTCOMES = new Set<TaskReviewDisputeReport['requestedOutcome']>([
  'task_giver_re_review',
  'reviewer_re_review',
  'independent_re_review',
  'adjust_scope_or_deadline',
  'adjust_score',
  'keep_current_review',
  'admin_review',
])

function formalReport(dto: ReportTaskReviewDisputeDTO): TaskReviewDisputeReport {
  const claim = dto.claim.trim()
  const evidence = dto.evidence.trim()
  const errors: Record<string, string> = {}
  if (!DISPUTE_TYPES.has(dto.disputeType)) errors['dispute_type'] = 'Loại tranh chấp không hợp lệ'
  if (claim.length < 10) errors['claim'] = 'Claim phải nêu rõ vấn đề (ít nhất 10 ký tự)'
  if (evidence.length < 10) errors['evidence'] = 'Report phải nêu căn cứ (ít nhất 10 ký tự)'
  if (!REQUESTED_OUTCOMES.has(dto.requestedOutcome)) {
    errors['requested_outcome'] = 'Nguyện vọng xử lý không hợp lệ'
  }
  if (Object.keys(errors).length > 0) throw ValidationException.fields(errors)
  return { disputeType: dto.disputeType, claim, evidence, requestedOutcome: dto.requestedOutcome }
}

export default class ReportTaskReviewDisputeCommand extends BaseCommand<
  ReportTaskReviewDisputeDTO,
  TaskReviewWorkflowOutcome
> {
  constructor(
    execCtx: ReviewActionContext,
    private readonly unitOfWork: ReviewTaskWorkflowUnitOfWork
  ) {
    super(execCtx)
  }

  async execute(dto: ReportTaskReviewDisputeDTO): Promise<TaskReviewWorkflowOutcome> {
    return this.handle(dto)
  }

  async handle(dto: ReportTaskReviewDisputeDTO): Promise<TaskReviewWorkflowOutcome> {
    const userId = this.requireUserId()
    const report = formalReport(dto)
    const outcome = await this.unitOfWork.run(async (session) => {
      const workflow = await session.loadWorkflow(dto.workflowId)
      if (!workflow) {
        throw new NotFoundException('Task review workflow not found')
      }
      const review = await session.findMessage(dto.workflowId, dto.reviewMessageId)
      if (!review || review.messageType !== 'review') {
        throw new NotFoundException('Không tìm thấy review cần report')
      }
      if (review.revieweeDecision === 'accepted') {
        throw new ConflictException('Review này đã được đồng ý và không thể gửi report tranh chấp')
      }
      const reviewerIds = await session.listReviewerIds(dto.workflowId)

      if (workflow.revieweeId !== userId && review.authorId !== userId) {
        throw new ForbiddenException(
          'Chỉ người review hoặc người được review trong thread này mới được gửi report'
        )
      }
      if (!(await session.hasRevieweeResponse(dto.workflowId, review.id))) {
        throw new ForbiddenException('Cần có phản hồi của người được review trước khi gửi report')
      }

      const runtimeContext = await session.loadReportRuntimeContext(
        dto.workflowId,
        userId,
        report
      )
      const now = DateTime.now().toJSDate()
      await session.appendMessage({
        workflowId: dto.workflowId,
        authorId: userId,
        messageType: 'system',
        body: `Formal task review dispute reported: ${report.claim}`,
        parentReviewMessageId: review.id,
        metadata: {
          runtime_context: runtimeContext,
          review_message_id: review.id,
          dispute_report: report,
        },
      })
      await session.markReported({
        workflowId: dto.workflowId,
        reporterId: userId,
        runtimeContext,
        reportedAt: now,
      })
      const counterpartyIds =
        workflow.revieweeId === userId
          ? reviewerIds
          : workflow.revieweeId
            ? [workflow.revieweeId]
            : []
      await session.stageNotification({
        eventName: 'task_review.dispute_reported',
        businessEventId: dto.workflowId,
        type: BACKEND_NOTIFICATION_TYPES.REVIEW_DISPUTE_ESCALATED,
        organizationId: workflow.organizationId,
        actorId: userId,
        taskId: workflow.taskId,
        parameters: {
          workflowId: dto.workflowId,
          taskId: workflow.taskId,
          reviewKind: 'task_review',
          reviewMessageId: review.id,
          status: TASK_REVIEW_WORKFLOW_STATUSES.REPORTED,
        },
        recipientIds: counterpartyIds,
        occurredAt: now,
        ...(this.execCtx.requestId ? { correlationId: this.execCtx.requestId } : {}),
      })
      await session.stageAiDisputeAutoQueue(dto.workflowId, this.execCtx)

      return {
        workflowId: dto.workflowId,
        taskId: workflow.taskId,
        projectId: workflow.projectId,
      }
    })

    await this.settlePostCommitEffect(
      'queue_ai_dispute_evaluation',
      () => aiDisputeAutoQueuePublicApi.processAfterReport('task_review_workflow', dto.workflowId),
      { entityId: dto.workflowId, actorId: userId }
    )
    return outcome
  }

  private requireUserId(): string {
    if (!this.execCtx.userId) {
      throw new UnauthorizedException('User must be authenticated to execute this command')
    }
    return this.execCtx.userId
  }
}
