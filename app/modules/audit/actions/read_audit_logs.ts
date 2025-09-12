import { formatAuditChanges as formatChanges } from '#modules/audit/domain/audit_change_formatter'
import {
  listAdminAuditLogs as listAdminLogs,
  getAuditUsersByIds,
  getLastAuditActivityByUsers as getLastActivityByUsers,
  listAuditLogsByEntity as listByEntity,
  type AdminAuditLogListParams,
  type AdminAuditLogRecord,
  type AuditLogRecord,
  type AuditUserField,
} from '#modules/audit/infra/repositories/read/audit_log_read_repository'

export type {
  AdminAuditLogListParams,
  AdminAuditLogRecord,
} from '#modules/audit/infra/repositories/read/audit_log_read_repository'

export async function listAuditLogsByEntity(
  entityType: string,
  entityId: string,
  limit: number
): Promise<AuditLogRecord[]> {
  return await listByEntity(entityType, entityId, limit)
}

export async function listAdminAuditLogs(
  params: AdminAuditLogListParams
): Promise<{ data: AdminAuditLogRecord[]; total: number }> {
  return await listAdminLogs(params)
}

export async function getLastAuditActivityByUsers(
  entityType: string,
  entityId: string,
  userIds: string[]
): Promise<Map<string, Date | null>> {
  return await getLastActivityByUsers(entityType, entityId, userIds)
}

export async function buildAuditUserMap(
  logs: AuditLogRecord[],
  fields: AuditUserField[] = ['id', 'username', 'email']
): Promise<Map<string, { id: string; username: string | null; email: string | null }>> {
  const userIds = [...new Set(logs.map((log) => log.user_id).filter(Boolean))] as string[]
  const users = await getAuditUsersByIds(userIds, fields)

  return new Map(
    users.map((user) => [
      user.id,
      {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    ])
  )
}

export function formatAuditChanges(
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>
): { field: string; oldValue: unknown; newValue: unknown }[] {
  return formatChanges(oldValues, newValues)
}
