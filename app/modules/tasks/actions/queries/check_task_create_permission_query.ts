import type { PolicyResult } from '#modules/authorization/public_contracts/policy_result'
import type { TaskPermissionReader } from '#modules/tasks/actions/ports/task_external_dependencies'
import { buildTaskCreatePermissionContext } from '#modules/tasks/actions/support/task_permission_context_builder'
import { canCreateTask } from '#modules/tasks/domain/task_permission_policy'

/**
 * Query: Check Task Create Permission
 *
 * Checks if user can create tasks in an organization.
 * User must be org_owner, org_admin, or system superadmin.
 */
export default class CheckTaskCreatePermissionQuery {
  private readonly __instanceMarker = true

  static {
    void new CheckTaskCreatePermissionQuery().__instanceMarker
  }

  static async execute(
    userId: string,
    organizationId: string,
    projectId: string | null | undefined,
    permissionReader: TaskPermissionReader
  ): Promise<PolicyResult> {
    const permissionContext = await buildTaskCreatePermissionContext(
      userId,
      organizationId,
      projectId ?? null,
      undefined,
      permissionReader
    )

    return canCreateTask(permissionContext)
  }
}
