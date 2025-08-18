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

import type { AuditActionContext } from '#modules/audit/actions/audit_action_context'
import { MongoAuditLogModel } from '#modules/audit/infra/models/audit_log'
import type {
  AuditLogRecord,
  AuditUserField,
} from '#modules/audit/infra/repositories/read/audit_log_read_repository'

export interface AdminAuditLogListParams {
  page: number
  perPage: number
  search?: string
  action?: string
  resourceType?: string
  userId?: string
  from?: Date
  to?: Date
  searchMatchedUserIds?: string[]
}

export interface AdminAuditLogRecord {
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

interface MongoAuditLogDoc {
  _id: { toString(): string }
  user_id?: string
  action: string
  entity_type: string
  entity_id?: string
  old_values?: Record<string, unknown>
  new_values?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
  created_at?: Date
}

const escapeRegex = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const buildAdminAuditLogFilter = (
  params: AdminAuditLogListParams
): Record<string, unknown> => {
  const filter: Record<string, unknown> = {}

  if (params.action) {
    filter.action = params.action
  }

  if (params.resourceType) {
    filter.entity_type = params.resourceType
  }

  if (params.userId) {
    filter.user_id = params.userId
  }

  if (params.from || params.to) {
    const createdAt: Record<string, Date> = {}
    if (params.from) {
      createdAt.$gte = params.from
    }
    if (params.to) {
      createdAt.$lte = params.to
    }
    filter.created_at = createdAt
  }

  const search = params.search?.trim()
  if (search) {
    const searchRegex = new RegExp(escapeRegex(search), 'i')
    filter.$or = [
      { action: searchRegex },
      { entity_type: searchRegex },
      { entity_id: searchRegex },
      { ip_address: searchRegex },
      ...((params.searchMatchedUserIds?.length ?? 0) > 0
        ? [{ user_id: { $in: params.searchMatchedUserIds } }]
        : []),
    ]
  }

  return filter
}

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
    const page = Math.max(1, params.page)
    const perPage = Math.max(1, params.perPage)
    const skip = (page - 1) * perPage
    const filter = buildAdminAuditLogFilter(params)

    const [rawDocs, total] = await Promise.all([
      MongoAuditLogModel.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(perPage)
        .lean()
        .exec(),
      MongoAuditLogModel.countDocuments(filter).exec(),
    ])

    const docs = rawDocs as unknown as MongoAuditLogDoc[]

    return {
      data: docs.map((doc) => ({
        id: doc._id.toString(),
        user_id: doc.user_id ?? null,
        action: doc.action,
        entity_type: doc.entity_type,
        entity_id: doc.entity_id ?? null,
        old_values: doc.old_values ?? null,
        new_values: doc.new_values ?? null,
        ip_address: doc.ip_address ?? null,
        user_agent: doc.user_agent ?? null,
        created_at: doc.created_at ?? new Date(),
      })),
      total,
    }
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
