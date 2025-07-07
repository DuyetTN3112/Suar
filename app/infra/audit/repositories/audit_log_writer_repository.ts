import logger from '@adonisjs/core/services/logger'

import RepositoryFactory from '#infra/shared/repositories/repository_factory'

export async function writeAuditLog(params: {
  userId: string | null
  action: string
  entityType: string
  entityId: string | null
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}): Promise<void> {
  const oldValues = params.oldValues ?? null
  const newValues = params.newValues ?? null

  try {
    const repo = await RepositoryFactory.getAuditLogRepository()
    await repo.create({
      user_id: params.userId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      old_values: oldValues,
      new_values: newValues,
      ip_address: params.ipAddress ?? null,
      user_agent: params.userAgent ?? null,
    })
  } catch (error) {
    logger.warn({ err: error }, 'Failed to create audit log')
  }
}
