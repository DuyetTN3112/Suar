import { auditRepositoryProvider } from '../repositories/audit_repository_provider.js'

import loggerService from '#modules/logger/public_contracts/logger_service'

interface AuditLogCreateData {
  user_id?: string | null
  action: string
  entity_type: string
  entity_id?: string | null
  old_values?: object | null
  new_values?: object | null
  ip_address?: string | null
  user_agent?: string | null
}

interface AuditLogFilterData {
  user_id?: string
  action?: string
  entity_type?: string
  entity_id?: string
  created_at?: {
    $gte?: Date
    $lte?: Date
  }
}

interface AuditLogQueryRecord {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: Date
}

class AuditLogQueryBuilder implements PromiseLike<AuditLogQueryRecord[]> {
  constructor(private readonly filter: AuditLogFilterData = {}) {}

  where(field: keyof AuditLogFilterData, value: AuditLogFilterData[keyof AuditLogFilterData]) {
    return new AuditLogQueryBuilder({
      ...this.filter,
      [field]: value,
    })
  }

  async exec(): Promise<AuditLogQueryRecord[]> {
    return findAuditLogs(this.filter) as Promise<AuditLogQueryRecord[]>
  }

  then<TResult1 = AuditLogQueryRecord[], TResult2 = never>(
    onfulfilled?:
      | ((value: AuditLogQueryRecord[]) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected)
  }
}

async function createAuditLog(data: AuditLogCreateData): Promise<unknown> {
  try {
    const repo = auditRepositoryProvider.getAuditLogRepository()
    await repo.create({
      action: data.action,
      entity_type: data.entity_type,
      user_id: data.user_id ?? null,
      entity_id: data.entity_id ?? null,
      old_values: (data.old_values as Record<string, unknown> | null | undefined) ?? null,
      new_values: (data.new_values as Record<string, unknown> | null | undefined) ?? null,
      ip_address: data.ip_address ?? null,
      user_agent: data.user_agent ?? null,
    })
    return null
  } catch (error) {
    loggerService.warn('[AuditLog] Failed to create audit log', {
      action: data.action,
      entity_type: data.entity_type,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

function queryAuditLogs() {
  return new AuditLogQueryBuilder()
}

async function findAuditLogs(filter: AuditLogFilterData): Promise<unknown[]> {
  try {
    const repo = auditRepositoryProvider.getAuditLogRepository()
    const { data } = await repo.findMany({
      user_id: filter.user_id,
      action: filter.action,
      entity_type: filter.entity_type,
      entity_id: filter.entity_id,
      from: filter.created_at?.$gte,
      to: filter.created_at?.$lte,
      limit: 1000,
    })

    return data
  } catch (error) {
    loggerService.warn('[AuditLog] Failed to query audit logs', {
      error: error instanceof Error ? error.message : String(error),
    })
    return []
  }
}

const AuditLog = {
  create: createAuditLog,
  query: queryAuditLogs,
  find: findAuditLogs,
}

export default AuditLog
