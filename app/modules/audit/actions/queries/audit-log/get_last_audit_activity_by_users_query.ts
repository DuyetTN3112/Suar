import { BaseQuery } from '#modules/audit/actions/base_query'
import type { AuditLogReadRepository } from '#modules/audit/actions/ports/outbound/audit_log_read_repository'

export class GetLastAuditActivityByUsersQuery extends BaseQuery<
  [string, string, string[]],
  Map<string, Date | null>
> {
  constructor(private readonly repository: AuditLogReadRepository) {
    super()
  }

  execute(
    entityType: string,
    entityId: string,
    userIds: string[]
  ): Promise<Map<string, Date | null>> {
    return this.repository.getLastActivityByUsers(entityType, entityId, userIds)
  }
}
