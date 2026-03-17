import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type {
  TaskCompletionAccessTask,
  TaskCompletionRepository,
} from '#modules/tasks/actions/ports/outbound/task_completion_repository'
import type { TaskOrgReader } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canMutateTaskCompletionPackage } from '#modules/tasks/domain/task_completion_access_policy'

export type { TaskCompletionAccessTask }

function requireTaskActionUser(ctx: TaskActionContext): string {
  if (!ctx.userId) {
    throw new UnauthorizedException()
  }
  return ctx.userId
}

export async function loadTaskForCompletionPackage(
  taskId: string,
  tasks: TaskCompletionRepository
): Promise<TaskCompletionAccessTask> {
  const task = await tasks.findAccessTask(taskId)
  if (!task) {
    throw new NotFoundException('Task not found')
  }
  return task
}

export async function assertTaskCompletionPackageAccess(
  ctx: TaskActionContext,
  task: TaskCompletionAccessTask,
  ownerIds: string[] = [],
  organizations: Pick<TaskOrgReader, 'isApprovedMember'>
): Promise<string> {
  const actorId = requireTaskActionUser(ctx)

  if (ctx.organizationId && ctx.organizationId !== task.organization_id) {
    throw new ForbiddenException('Task does not belong to the current organization context')
  }

  if (
    canMutateTaskCompletionPackage(
      actorId,
      {
        creatorId: task.creator_id,
        assignedTo: task.assigned_to,
      },
      ownerIds
    )
  ) {
    return actorId
  }

  if (ownerIds.length > 0) {
    throw new ForbiddenException('User cannot mutate this task completion package resource')
  }

  if (!(await organizations.isApprovedMember(actorId, task.organization_id))) {
    throw new ForbiddenException('User cannot access this task completion package')
  }

  return actorId
}
