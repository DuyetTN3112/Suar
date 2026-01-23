import type { PolicyResult } from '#modules/authorization/public_contracts/policy_result'
import type { TaskPermissionReader } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import { buildTaskCreatePermissionContext } from '#modules/tasks/actions/services/task_permission_context_resolver'
import { canCreateTask } from '#modules/tasks/domain/task_permission_policy'

/**
 * Query: Check Task Create Permission
 *
 * Checks if user can create tasks in an organization.
 * User must have Organization or Project permission to create tasks.
 */
export default class CheckTaskCreatePermissionQuery {
  constructor(private readonly permissionReader: TaskPermissionReader) {}

  async execute(
    userId: string,
    organizationId: string,
    projectId: string | null | undefined
  ): Promise<PolicyResult> {
    const permissionContext = await buildTaskCreatePermissionContext(
      userId,
      organizationId,
      projectId ?? null,
      undefined,
      this.permissionReader
    )

    return canCreateTask(permissionContext)
  }
}
