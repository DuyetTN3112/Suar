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

const isAuditRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const normalizeAuditValues = (value: unknown): Record<string, unknown> | null => {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown
      return isAuditRecord(parsed) ? parsed : null
    } catch {
      return null
    }
  }

  return isAuditRecord(value) ? value : null
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
        old_values: normalizeAuditValues(data.old_values),
        new_values: normalizeAuditValues(data.new_values),
        ip_address: ipAddress,
        user_agent: userAgent,
      })

      return true
    } catch (_error) {
      return false
    }
  }
}
