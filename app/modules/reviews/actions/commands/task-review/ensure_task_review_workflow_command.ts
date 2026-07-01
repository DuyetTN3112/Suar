import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BACKEND_NOTIFICATION_TYPES } from '#modules/notifications/public_contracts/notification_constants'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type {
  ReviewTaskWorkflowPersistenceSession,
  ReviewTaskWorkflowUnitOfWork,
} from '#modules/reviews/actions/ports/outbound/review_task_workflow_unit_of_work'
import type { ReviewTransaction } from '#modules/reviews/actions/ports/outbound/review_transaction'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import type { TaskReviewWorkflowStatus } from '#modules/reviews/domain/task-review/task_review_workflow'

export interface EnsureTaskReviewWorkflowDTO {
  taskId: string
  taskAssignmentId: string
}

export interface EnsureTaskReviewWorkflowResult {
  workflowId: string
  taskId: string
  taskAssignmentId: string
  status: TaskReviewWorkflowStatus
  requiredReviewCount: number
}

export default class EnsureTaskReviewWorkflowCommand extends BaseCommand<
  EnsureTaskReviewWorkflowDTO,
  EnsureTaskReviewWorkflowResult
> {
  constructor(
    execCtx: ReviewActionContext,
    private readonly unitOfWork: ReviewTaskWorkflowUnitOfWork
  ) {
    super(execCtx)
  }

  handle(dto: EnsureTaskReviewWorkflowDTO): Promise<EnsureTaskReviewWorkflowResult> {
    return this.execute(dto)
  }

  execute(dto: EnsureTaskReviewWorkflowDTO): Promise<EnsureTaskReviewWorkflowResult> {
    return this.unitOfWork.run((session) => this.persistWorkflow(dto, session))
  }

  executeWithTransaction(
    dto: EnsureTaskReviewWorkflowDTO,
    transaction: ReviewTransaction
  ): Promise<EnsureTaskReviewWorkflowResult> {
    return this.unitOfWork.runIn(transaction, (session) => this.persistWorkflow(dto, session))
  }

  /**
   * Task-only callers must reuse an already-pinned native workflow. They may
   * not infer a completed assignment from task history.
   */
  async requireSingleNativeWorkflowForTask(
    taskId: string
  ): Promise<EnsureTaskReviewWorkflowResult> {
    return this.unitOfWork.run(async (session) => {
      const workflows = await session.listNativeWorkflowsByTaskId(taskId)
      if (workflows.length === 0) {
        throw new NotFoundException(
          'Task review workflow must be created from an exact completed assignment'
        )
      }
      if (workflows.length > 1) {
        throw new ConflictException(
          'Task has multiple assignment-pinned review workflows; use workflowId instead'
        )
      }
      const workflow = workflows[0]
      if (!workflow?.taskAssignmentId) {
        throw new InvariantViolationException(
          'Native task review workflow is missing assignment pin'
        )
      }
      return {
        workflowId: workflow.id,
        taskId: workflow.taskId,
        taskAssignmentId: workflow.taskAssignmentId,
        status: workflow.status,
        requiredReviewCount: workflow.requiredReviewCount,
      }
    })
  }

  private async persistWorkflow(
    dto: EnsureTaskReviewWorkflowDTO,
    session: ReviewTaskWorkflowPersistenceSession
  ): Promise<EnsureTaskReviewWorkflowResult> {
    const existing = await session.findWorkflowByTaskAssignmentId(dto.taskAssignmentId)
    if (existing) {
      return {
        workflowId: existing.id,
        taskId: existing.taskId,
        taskAssignmentId: existing.taskAssignmentId ?? dto.taskAssignmentId,
        status: existing.status,
        requiredReviewCount: existing.requiredReviewCount,
      }
    }

    const seed = await session.loadWorkflowSeed(dto.taskId, dto.taskAssignmentId)
    if (!seed) {
      throw new NotFoundException('Task not found')
    }
    const racedExisting = await session.findWorkflowByTaskAssignmentId(dto.taskAssignmentId)
    if (racedExisting) {
      return {
        workflowId: racedExisting.id,
        taskId: racedExisting.taskId,
        taskAssignmentId: racedExisting.taskAssignmentId ?? dto.taskAssignmentId,
        status: racedExisting.status,
        requiredReviewCount: racedExisting.requiredReviewCount,
      }
    }
    const taskGiverId = seed.assignerId ?? seed.creatorId
    if (!taskGiverId || taskGiverId === seed.revieweeId) {
      throw new ConflictException('Task phải có người giao hoặc tạo task độc lập để review')
    }
    const suggestedReviewers = await session.listSuggestedReviewerCandidates(
      seed.taskId,
      seed.projectId,
      seed.organizationId,
      [seed.revieweeId, taskGiverId].filter((id): id is string => Boolean(id))
    )

    const workflow = await session.createWorkflow({
      taskId: seed.taskId,
      taskAssignmentId: seed.taskAssignmentId,
      projectId: seed.projectId,
      organizationId: seed.organizationId,
      revieweeId: seed.revieweeId,
      requiredReviewCount: 2,
    })
    if (!workflow) {
      throw new InvariantViolationException(
        'Task review workflow insert returned no persisted row',
        {
          details: {
            taskId: dto.taskId,
          },
        }
      )
    }

    await session.createWorkflowReviewers(workflow.id, [
      { reviewerId: taskGiverId, role: 'task_giver_required', priorityRank: 1 },
    ])
    const actorId = this.requireUserId()
    const occurredAt = new Date()
    await session.stageNotification({
      eventName: 'task_review.opened',
      businessEventId: workflow.id,
      type: BACKEND_NOTIFICATION_TYPES.REVIEW_REQUESTED,
      organizationId: seed.organizationId,
      actorId,
      taskId: workflow.taskId,
      parameters: {
        workflowId: workflow.id,
        taskId: workflow.taskId,
        reviewKind: 'task_review',
        reviewAudience: 'required',
        status: 'awaiting_review',
        requiredReviewCount: workflow.requiredReviewCount,
      },
      recipientIds: [taskGiverId],
      occurredAt,
      ...(this.execCtx.requestId ? { correlationId: this.execCtx.requestId } : {}),
    })
    for (const reviewer of suggestedReviewers) {
      await session.stageNotification({
        eventName: 'task_review.suggested_reviewer',
        businessEventId: `${workflow.id}:suggested-reviewer:${reviewer.userId}`,
        type: BACKEND_NOTIFICATION_TYPES.REVIEW_REQUESTED,
        organizationId: seed.organizationId,
        actorId,
        taskId: workflow.taskId,
        parameters: {
          workflowId: workflow.id,
          taskId: workflow.taskId,
          reviewKind: 'task_review',
          reviewAudience: 'suggested',
          suggestionReasons: reviewer.reasons,
          status: 'awaiting_review',
          requiredReviewCount: workflow.requiredReviewCount,
        },
        recipientIds: [reviewer.userId],
        occurredAt,
        ...(this.execCtx.requestId ? { correlationId: this.execCtx.requestId } : {}),
      })
    }

    return {
      workflowId: workflow.id,
      taskId: workflow.taskId,
      taskAssignmentId: seed.taskAssignmentId,
      status: workflow.status,
      requiredReviewCount: workflow.requiredReviewCount,
    }
  }

  private requireUserId(): string {
    if (!this.execCtx.userId) {
      throw new UnauthorizedException('User must be authenticated to execute this command')
    }
    return this.execCtx.userId
  }
}
