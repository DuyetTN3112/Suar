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

export default AuditLog
