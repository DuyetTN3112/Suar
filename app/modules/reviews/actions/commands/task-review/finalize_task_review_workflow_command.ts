import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BACKEND_NOTIFICATION_TYPES } from '#modules/notifications/public_contracts/notification_constants'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { TaskReviewWorkflowOutcome } from '#modules/reviews/actions/dtos/task_review_workflow_outcome'
import type { ReviewActorAccessReader } from '#modules/reviews/actions/ports/outbound/review_external_dependencies'
import type { ReviewTaskWorkflowUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_task_workflow_unit_of_work'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { TASK_REVIEW_WORKFLOW_STATUSES } from '#modules/reviews/domain/task-review/task_review_workflow'

export interface FinalizeTaskReviewWorkflowDTO {
  workflowId: string
}

function requireUserId(ctx: ReviewActionContext): string {
  if (!ctx.userId) throw new UnauthorizedException()
  return ctx.userId
}

/**
 * The final, explicit gate for a Task Review Board workflow. Resolving a case
 * records its outcome; an accountable organization governor must still make
 * the workflow terminal before profile projection may run.
 */
export default class FinalizeTaskReviewWorkflowCommand extends BaseCommand<
  FinalizeTaskReviewWorkflowDTO,
  TaskReviewWorkflowOutcome
> {
  constructor(
    execCtx: ReviewActionContext,
    private readonly actorAccess: ReviewActorAccessReader,
    private readonly workflows: ReviewTaskWorkflowUnitOfWork
  ) {
    super(execCtx)
  }

  async execute(dto: FinalizeTaskReviewWorkflowDTO): Promise<TaskReviewWorkflowOutcome> {
    return this.handle(dto)
  }

  async handle(dto: FinalizeTaskReviewWorkflowDTO): Promise<TaskReviewWorkflowOutcome> {
    const actorId = requireUserId(this.execCtx)
    const access = await this.actorAccess.findActorAccess(actorId)
    if (!access) throw new NotFoundException('User not found')

    return this.workflows.run(async (persistence) => {
      const workflow = await persistence.loadWorkflow(dto.workflowId)
      if (!workflow) throw new NotFoundException('Task review workflow not found')
      if (workflow.status !== TASK_REVIEW_WORKFLOW_STATUSES.RESOLVED) {
        throw new ConflictException('Only a resolved task review workflow can be finalized')
      }
      if (
        this.execCtx.organizationId !== null &&
        this.execCtx.organizationId !== workflow.organizationId
      ) {
        throw new ForbiddenException('Task review workflow is outside the current organization')
      }

      const isSystemAdministrator =
        access.systemRole === 'system_admin' || access.systemRole === 'superadmin'
      const membership = isSystemAdministrator
        ? null
        : await this.actorAccess.findOrganizationMembership(actorId, workflow.organizationId)
      const isOrganizationGovernor =
        membership?.status === 'approved' &&
        (membership.role === 'org_owner' || membership.role === 'org_admin')
      if (!isSystemAdministrator && !isOrganizationGovernor) {
        throw new ForbiddenException(
          'Only an organization owner or administrator can finalize a task review workflow'
        )
      }
      if (!workflow.taskAssignmentId || !workflow.revieweeId) {
        throw new ConflictException('Task review workflow is missing its immutable assignment identity')
      }

      const finalizedAt = new Date()
      await persistence.finalizeResolvedWorkflow({
        workflowId: workflow.id,
        actorId,
        finalizedAt,
        messageBody:
          'An organization governor finalized the resolved review. Profile projection may now process governed evidence.',
      })
      await persistence.stageTaskReviewFinalizedEvent({
        workflowId: workflow.id,
        taskAssignmentId: workflow.taskAssignmentId,
        taskId: workflow.taskId,
        revieweeId: workflow.revieweeId,
        finalizedBy: actorId,
        finalizationSource: isSystemAdministrator
          ? 'admin_resolution'
          : 'organization_governance',
        finalizedAt,
      })

      const reviewerIds = await persistence.listReviewerIds(workflow.id)
      await persistence.stageNotification({
        eventName: 'task_review.finalized',
        businessEventId: `${workflow.id}:done`,
        type: BACKEND_NOTIFICATION_TYPES.REVIEW_RECEIVED,
        organizationId: workflow.organizationId,
        actorId,
        taskId: workflow.taskId,
        parameters: {
          workflowId: workflow.id,
          taskId: workflow.taskId,
          reviewKind: 'task_review',
          status: TASK_REVIEW_WORKFLOW_STATUSES.DONE,
          profileProjection: 'queued',
        },
        recipientIds: [workflow.revieweeId, ...reviewerIds],
        occurredAt: finalizedAt,
        ...(this.execCtx.requestId ? { correlationId: this.execCtx.requestId } : {}),
      })

      return {
        workflowId: workflow.id,
        taskId: workflow.taskId,
        projectId: workflow.projectId,
      }
    })
  }
}
