import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export interface ProjectPermissionReader {
  checkOrganizationPermission(params: {
    actorUserId: string
    organizationId: string
    permission: string
    trx?: TransactionClientContract
  }): Promise<boolean>

  isSystemSuperadmin(actorUserId: string, trx?: TransactionClientContract): Promise<boolean>
}
