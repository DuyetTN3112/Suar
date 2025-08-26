import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'
import { projectPublicApi } from '#modules/projects/public_contracts/project_public_api'
import type { TaskPermissionReader } from '#modules/tasks/actions/ports/task_external_dependencies'
import { userPublicApi } from '#modules/users/public_contracts/user_public_api'

export class MonolithTaskPermissionReader implements TaskPermissionReader {
  async getSystemRoleName(
    userId: string,
    trx?: TransactionClientContract
  ): Promise<string | null> {
    return userPublicApi.getSystemRoleName(userId, trx)
  }

  async getOrgRoleName(
    userId: string,
    organizationId: string,
    trx?: TransactionClientContract
  ): Promise<string | null> {
    const orgMembership = await organizationPublicApi.getMembershipContext(
      organizationId,
      userId,
      trx,
      true
    )
    return orgMembership?.role ?? null
  }

  async getProjectRoleName(
    userId: string,
    projectId: string,
    trx?: TransactionClientContract
  ): Promise<string | null> {
    const projectMembership = await projectPublicApi.getMembershipContext(projectId, userId, trx)
    return projectMembership?.project_role ?? null
  }
}
