import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import AuditLog from '#models/audit_log'

type AuditLogData = {
  user_id: number
  action: string
  entity_type: string
  entity_id: number
  old_values?: any
  new_values?: any
}

@inject()
export default class CreateAuditLog {
  constructor(protected ctx: HttpContext) {}

  async handle(data: AuditLogData): Promise<boolean> {
    try {
      const ipAddress = this.ctx.request.ip()
      const userAgent = this.ctx.request.header('user-agent') || ''
      // Chuyển đổi các giá trị thành JSON nếu cần
      const oldValues = data.old_values
        ? typeof data.old_values === 'string'
          ? data.old_values
          : JSON.stringify(data.old_values)
        : null
      const newValues = data.new_values
        ? typeof data.new_values === 'string'
          ? data.new_values
          : JSON.stringify(data.new_values)
        : null

      // Sử dụng stored procedure để ghi log
      await db.rawQuery('CALL log_audit(?, ?, ?, ?, ?, ?, ?, ?)', [
        data.user_id,
        data.action,
        data.entity_type,
        data.entity_id,
        oldValues,
        newValues,
        ipAddress,
        userAgent,
      ])

      return true
    } catch (error) {
      return false
    }
  }
}
