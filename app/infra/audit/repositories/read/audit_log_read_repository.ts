import { auditRepositoryProvider } from '../audit_repository_provider.js'

import UserRepository from '#infra/users/repositories/user_repository'
import type { DatabaseId } from '#types/database'

export interface AuditLogRecord {
  id: DatabaseId
  user_id: DatabaseId | null
  entity_type: string
  entity_id: DatabaseId | null
  action: string
  created_at: Date
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
}

export type AuditUserField = 'id' | 'username' | 'email'

export async function listAuditLogsByEntity(
  entityType: string,
  entityId: DatabaseId,
  limit: number
): Promise<AuditLogRecord[]> {
  const auditRepo = auditRepositoryProvider.getAuditLogRepository()
  const { data: logs } = await auditRepo.findMany({
    entity_type: entityType,
    entity_id: entityId,
    limit,
  })

  return logs
}

export async function getLastAuditActivityByUsers(
  entityType: string,
  entityId: DatabaseId,
  userIds: DatabaseId[]
): Promise<Map<DatabaseId, Date | null>> {
  if (userIds.length === 0) {
    return new Map<DatabaseId, Date | null>()
  }

  const auditRepo = auditRepositoryProvider.getAuditLogRepository()
  return await auditRepo.getLastActivityByUsers(entityType, entityId, userIds)
}

export async function getAuditUsersByIds(
  userIds: DatabaseId[],
  fields: AuditUserField[] = ['id', 'username', 'email']
): Promise<{ id: DatabaseId; username: string | null; email: string | null }[]> {
  return await UserRepository.findByIds(userIds, fields)
}
