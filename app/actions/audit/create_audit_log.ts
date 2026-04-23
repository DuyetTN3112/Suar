import { writeAuditLog } from '#actions/audit/write_audit_log'
import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'

interface AuditLogData {
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
      await writeAuditLog(this.execCtx, {
        user_id: data.user_id,
        action: data.action,
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        old_values: data.old_values,
        new_values: data.new_values,
      })
      return true
    } catch (_error) {
      return false
    }
  }
}
