import CreateAuditLog, { type AuditLogData } from '../create_audit_log.js'
import {
  buildAuditUserMap,
  formatAuditChanges,
  getLastAuditActivityByUsers,
  listAuditLogsByEntity,
} from '../read_audit_logs.js'
import {
  writeAuditLog,
  writeAuditLogAllowAnonymous,
  type WriteAuditLogAllowAnonymousInput,
  type WriteAuditLogInput,
} from '../write_audit_log.js'

import type {
  AuditLogRecord,
  AuditUserField,
} from '#infra/audit/repositories/read/audit_log_read_repository'
import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'

export class AuditPublicApi {
  async log(data: AuditLogData, execCtx: ExecutionContext): Promise<boolean> {
    return new CreateAuditLog(execCtx).handle(data)
  }

  async write(execCtx: ExecutionContext, input: WriteAuditLogInput): Promise<void> {
    await writeAuditLog(execCtx, input)
  }

  async writeAllowAnonymous(
    execCtx: ExecutionContext,
    input: WriteAuditLogAllowAnonymousInput
  ): Promise<void> {
    await writeAuditLogAllowAnonymous(execCtx, input)
  }

  async listByEntity(
    entityType: string,
    entityId: DatabaseId,
    limit: number
  ): Promise<AuditLogRecord[]> {
    return listAuditLogsByEntity(entityType, entityId, limit)
  }

  async getLastActivityByUsers(
    entityType: string,
    entityId: DatabaseId,
    userIds: DatabaseId[]
  ): Promise<Map<DatabaseId, Date | null>> {
    return getLastAuditActivityByUsers(entityType, entityId, userIds)
  }

  async buildUserMap(
    logs: AuditLogRecord[],
    fields?: AuditUserField[]
  ): Promise<Map<DatabaseId, { id: DatabaseId; username: string | null; email: string | null }>> {
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
