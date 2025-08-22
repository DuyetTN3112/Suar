import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export interface ProjectMemberActivityReader {
  getLastActivityByUsers(
    projectId: string,
    userIds: string[],
    trx?: TransactionClientContract
  ): Promise<Map<string, string | null>>
}
