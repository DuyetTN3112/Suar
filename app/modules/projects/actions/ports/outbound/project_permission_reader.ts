import type { ProjectTransaction } from './project_transaction.js'

export interface ProjectPermissionReader {
  checkOrganizationPermission(params: {
    actorUserId: string
    organizationId: string
    permission: string
    trx?: ProjectTransaction
  }): Promise<boolean>
}
