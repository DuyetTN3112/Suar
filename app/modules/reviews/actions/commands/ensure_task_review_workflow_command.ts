import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BACKEND_NOTIFICATION_TYPES } from '#modules/notifications/public_contracts/notification_constants'
import type {
  ReviewTaskWorkflowPersistenceSession,
  ReviewTaskWorkflowSeed,
  ReviewTaskWorkflowUnitOfWork,
} from '#modules/reviews/actions/ports/outbound/review_task_workflow_unit_of_work'
import type { ReviewTransaction } from '#modules/reviews/actions/ports/outbound/review_transaction'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import type { TaskReviewWorkflowStatus } from '#modules/reviews/domain/task_review_workflow'

export interface EnsureTaskReviewWorkflowDTO {
  taskId: string
}

export interface EnsureTaskReviewWorkflowResult {
  workflowId: string
  taskId: string
  status: TaskReviewWorkflowStatus
  requiredReviewCount: number
}

interface ReviewerCandidate {
  userId: string
  projectRole: string | null
  organizationRole: string | null
}

export default class EnsureTaskReviewWorkflowCommand {
  constructor(
    private readonly execCtx: ReviewActionContext,
    private readonly unitOfWork: ReviewTaskWorkflowUnitOfWork
  ) {}

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

  private async persistWorkflow(
    dto: EnsureTaskReviewWorkflowDTO,
    session: ReviewTaskWorkflowPersistenceSession
  ): Promise<EnsureTaskReviewWorkflowResult> {
    const existing = await session.findWorkflowByTaskId(dto.taskId)
    if (existing) {
      return {
        workflowId: existing.id,
        taskId: existing.taskId,
        status: existing.status,
        requiredReviewCount: existing.requiredReviewCount,
      }
    }

    const seed = await session.loadWorkflowSeed(dto.taskId)
    if (!seed) {
      throw new NotFoundException('Task not found')
    }
    const reviewers = await this.selectReviewers(seed, session)
    if (reviewers.length === 0) {
      throw new ConflictException('Không có reviewer đủ điều kiện cho task này')
    }

    const workflow = await session.createWorkflow({
      taskId: seed.taskId,
      projectId: seed.projectId,
      organizationId: seed.organizationId,
      revieweeId: seed.revieweeId,
      requiredReviewCount: reviewers.length,
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

    await session.createWorkflowReviewers(
      workflow.id,
      reviewers.map((reviewer, index) => ({
        reviewerId: reviewer.reviewerId,
        role: reviewer.role,
        priorityRank: index + 1,
      }))
    )
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
        status: 'awaiting_review',
        requiredReviewCount: workflow.requiredReviewCount,
      },
      recipientIds: reviewers.map((reviewer) => reviewer.reviewerId),
      occurredAt,
      ...(this.execCtx.requestId ? { correlationId: this.execCtx.requestId } : {}),
    })

    return {
      workflowId: workflow.id,
      taskId: workflow.taskId,
      status: workflow.status,
      requiredReviewCount: workflow.requiredReviewCount,
    }
  }

  private async selectReviewers(
    seed: ReviewTaskWorkflowSeed,
    session: ReviewTaskWorkflowPersistenceSession
  ): Promise<Array<{ reviewerId: string; role: string }>> {
    const taskGiverId = seed.assignerId ?? seed.creatorId
    const reviewers: Array<{ reviewerId: string; role: string }> = []
    if (taskGiverId && taskGiverId !== seed.revieweeId) {
      reviewers.push({ reviewerId: taskGiverId, role: 'task_giver_required' })
    }

    const excludedReviewerIds = [seed.revieweeId, taskGiverId].filter((id): id is string =>
      Boolean(id)
    )
    const candidates = await session.listReviewerCandidates(
      seed.projectId,
      seed.organizationId,
      excludedReviewerIds
    )
    reviewers.push(
      ...candidates.slice(0, 1).map((candidate) => ({
        reviewerId: candidate.userId,
        role: this.mapCandidateRole(candidate),
      }))
    )

    return reviewers
  }

  private mapCandidateRole(candidate: ReviewerCandidate): string {
    if (candidate.projectRole === 'project_owner' || candidate.projectRole === 'project_manager') {
      return 'manager_required'
    }
    if (candidate.organizationRole === 'org_owner' || candidate.organizationRole === 'org_admin') {
      return 'org_admin_required'
    }
    return 'peer_required'
  }

  private requireUserId(): string {
    if (!this.execCtx.userId) {
      throw new UnauthorizedException('User must be authenticated to execute this command')
    }
    return this.execCtx.userId
  }
}
