import db from '@adonisjs/lucid/services/db'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'

export interface TaskCompletionAccessTask {
  id: string
  organization_id: string
  creator_id: string
  assigned_to: string | null
}

export function requireTaskActionUser(ctx: TaskActionContext): string {
  if (!ctx.userId) {
    throw new UnauthorizedException()
  }

  return ctx.userId
}

export async function loadTaskForCompletionPackage(taskId: string): Promise<TaskCompletionAccessTask> {
  const task = (await db
    .from('tasks')
    .where('id', taskId)
    .whereNull('deleted_at')
    .select('id', 'organization_id', 'creator_id', 'assigned_to')
    .first()) as TaskCompletionAccessTask | undefined

  if (!task) {
    throw new NotFoundException('Task not found')
  }

  return task
}

export async function assertTaskCompletionPackageAccess(
  ctx: TaskActionContext,
  task: TaskCompletionAccessTask,
  ownerIds: string[] = []
): Promise<string> {
  const actorId = requireTaskActionUser(ctx)

  if (ctx.organizationId && ctx.organizationId !== task.organization_id) {
    throw new ForbiddenException('Task does not belong to the current organization context')
  }

  if (task.creator_id === actorId || task.assigned_to === actorId || ownerIds.includes(actorId)) {
    return actorId
  }

  const membership = (await db
    .from('organization_users')
    .where('organization_id', task.organization_id)
    .where('user_id', actorId)
    .where('status', 'approved')
    .first()) as Record<string, unknown> | undefined

  if (!membership) {
    throw new ForbiddenException('User cannot access this task completion package')
  }

  return actorId
}

export function assertHttpUrl(url: string): void {
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Unsupported protocol')
    }
  } catch {
    throw new BusinessLogicException('Invalid URL')
  }
}
