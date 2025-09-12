import CreateAuditLog, { type AuditLogData } from '../create_audit_log.js'
import {
  type AdminAuditLogListParams,
  type AdminAuditLogRecord,
  buildAuditUserMap,
  formatAuditChanges,
  getLastAuditActivityByUsers,
  listAdminAuditLogs,
  listAuditLogsByEntity,
} from '../read_audit_logs.js'
import {
  writeAuditLog,
  writeAuditLogAllowAnonymous,
  type WriteAuditLogAllowAnonymousInput,
  type WriteAuditLogInput,
} from '../write_audit_log.js'

import type { AuditActionContext } from '#modules/audit/actions/audit_action_context'
import type {
  AuditLogRecord,
  AuditUserField,
} from '#modules/audit/infra/repositories/read/audit_log_read_repository'

export class AuditPublicApi {
  async log(data: AuditLogData, execCtx: AuditActionContext): Promise<boolean> {
    return new CreateAuditLog(execCtx).handle(data)
  }

  async write(execCtx: AuditActionContext, input: WriteAuditLogInput): Promise<void> {
    await writeAuditLog(execCtx, input)
  }

  async writeAllowAnonymous(
    execCtx: AuditActionContext,
    input: WriteAuditLogAllowAnonymousInput
  ): Promise<void> {
    await writeAuditLogAllowAnonymous(execCtx, input)
  }

  async listByEntity(
    entityType: string,
    entityId: string,
    limit: number
  ): Promise<AuditLogRecord[]> {
    return listAuditLogsByEntity(entityType, entityId, limit)
  }

  async getLastActivityByUsers(
    entityType: string,
    entityId: string,
    userIds: string[]
  ): Promise<Map<string, Date | null>> {
    return getLastAuditActivityByUsers(entityType, entityId, userIds)
  }

  async listForAdmin(params: AdminAuditLogListParams): Promise<{
    data: AdminAuditLogRecord[]
    total: number
  }> {
    return await listAdminAuditLogs(params)
  }

  async buildUserMap(
    logs: AuditLogRecord[],
    fields?: AuditUserField[]
  ): Promise<Map<string, { id: string; username: string | null; email: string | null }>> {
    return buildAuditUserMap(logs, fields)
  }

  formatChanges(
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>
  ): { field: string; oldValue: unknown; newValue: unknown }[] {
    return formatAuditChanges(oldValues, newValues)
  }
}

export const auditPublicApi = new AuditPublicApi()
