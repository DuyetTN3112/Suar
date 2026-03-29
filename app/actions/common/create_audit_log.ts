import { RepositoryFactory } from '#infra/shared/repositories/index'
import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'

type AuditLogData = {
  user_id: DatabaseId
  action: string
  entity_type: string
  entity_id: DatabaseId
  old_values?: unknown
  new_values?: unknown
}

export default class CreateAuditLog {
  constructor(protected execCtx: ExecutionContext) {}

  async handle(data: AuditLogData): Promise<boolean> {
    try {
      const ipAddress = this.execCtx.ip
      const userAgent = this.execCtx.userAgent
      const repo = await RepositoryFactory.getAuditLogRepository()
      await repo.create({
        user_id: data.user_id,
        action: data.action,
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        old_values: data.old_values
          ? typeof data.old_values === 'string'
            ? (JSON.parse(data.old_values) as object)
            : (data.old_values as object)
          : null,
        new_values: data.new_values
          ? typeof data.new_values === 'string'
            ? (JSON.parse(data.new_values) as object)
            : (data.new_values as object)
          : null,
        ip_address: ipAddress,
        user_agent: userAgent,
      })

      return true
    } catch (_error) {
      return false
    }
  }
}
