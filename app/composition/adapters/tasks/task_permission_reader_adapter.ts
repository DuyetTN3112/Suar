import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import * as organizationMembershipQueries from '#modules/organizations/infra/repositories/members/organization_user_repository/read/membership_queries'
import * as projectMemberQueries from '#modules/projects/infra/repositories/project-members/read/project_member_queries'
import type { TaskPermissionReader } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'

export class TaskPermissionReaderAdapter implements TaskPermissionReader {
  async getOrgRoleName(
    userId: string,
    organizationId: string,
    trx?: Parameters<TaskPermissionReader['getOrgRoleName']>[2]
  ): Promise<string | null> {
    const membership = await organizationMembershipQueries.getMembershipContext(
      organizationId,
      userId,
      trx as TransactionClientContract | undefined,
      true
    )
    return membership?.role ?? null
  }

  async getProjectRoleName(
    userId: string,
    projectId: string,
    trx?: Parameters<TaskPermissionReader['getProjectRoleName']>[2]
  ): Promise<string | null> {
    const membership = await projectMemberQueries.findMember(
      projectId,
      userId,
      trx as TransactionClientContract | undefined
    )
    return membership?.project_role ?? null
  }
}
