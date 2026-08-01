import type { TaskPermissionReader } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'

/**
 * Reusable application collaborator that translates role facts into the
 * application-review capability needed by several commands and queries.
 *
 * It contains no persistence or workflow orchestration; callers remain the
 * use-case owners.
 */
export async function hasProjectApplicationReviewRole(
  userId: string,
  projectId: string | null | undefined,
  permissionReader: TaskPermissionReader,
  transaction?: TaskTransaction
): Promise<boolean> {
  if (!projectId) {
    return false
  }

  const role = await permissionReader.getProjectRoleName(
    userId,
    projectId,
    transaction
  )
  return role === 'project_owner' || role === 'project_manager'
}

export async function hasOrganizationApplicationReviewRole(
  userId: string,
  organizationId: string | null | undefined,
  permissionReader: TaskPermissionReader,
  transaction?: TaskTransaction
): Promise<boolean> {
  if (!organizationId) {
    return false
  }

  const role = await permissionReader.getOrgRoleName(
    userId,
    organizationId,
    transaction
  )
  return role === 'org_owner' || role === 'org_admin'
}
