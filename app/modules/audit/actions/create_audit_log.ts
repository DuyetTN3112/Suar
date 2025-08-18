import type { AuditActionContext } from '#modules/audit/actions/audit_action_context'
import { writeAuditLog } from '#modules/audit/actions/write_audit_log'

export interface AuditLogData {
  user_id: string
  action: string
  entity_type: string
  entity_id: string
  old_values?: unknown
  new_values?: unknown
}

export default class CreateAuditLog {
  constructor(protected execCtx: AuditActionContext) {}

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
