import { buildTaskCreatePermissionContext } from '#actions/tasks/support/task_permission_context_builder'
import type { PolicyResult } from '#domain/shared/policy_result'
import { canCreateTask } from '#domain/tasks/task_permission_policy'
import type { DatabaseId } from '#types/database'

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
    userId: DatabaseId,
    organizationId: DatabaseId,
    projectId?: DatabaseId | null
  ): Promise<PolicyResult> {
    const permissionContext = await buildTaskCreatePermissionContext(
      userId,
      organizationId,
      projectId ?? null
    )

    return canCreateTask(permissionContext)
  }
}
