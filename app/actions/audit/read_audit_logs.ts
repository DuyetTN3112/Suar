import { formatAuditChanges as formatChanges } from '#domain/audit/audit_change_formatter'
import {
  getAuditUsersByIds,
  getLastAuditActivityByUsers as getLastActivityByUsers,
  listAuditLogsByEntity as listByEntity,
  type AuditLogRecord,
  type AuditUserField,
} from '#infra/audit/repositories/read/audit_log_read_repository'
import type { DatabaseId } from '#types/database'

export async function listAuditLogsByEntity(
  entityType: string,
  entityId: DatabaseId,
  limit: number
): Promise<AuditLogRecord[]> {
  return await listByEntity(entityType, entityId, limit)
}

export async function getLastAuditActivityByUsers(
  entityType: string,
  entityId: DatabaseId,
  userIds: DatabaseId[]
): Promise<Map<DatabaseId, Date | null>> {
  return await getLastActivityByUsers(entityType, entityId, userIds)
}

export async function buildAuditUserMap(
  logs: AuditLogRecord[],
  fields: AuditUserField[] = ['id', 'username', 'email']
): Promise<Map<DatabaseId, { id: DatabaseId; username: string | null; email: string | null }>> {
  const userIds = [...new Set(logs.map((log) => log.user_id).filter(Boolean))] as DatabaseId[]
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
