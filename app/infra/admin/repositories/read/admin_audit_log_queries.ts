import { MongoAuditLogModel } from '#infra/audit/models/audit_log'
import User from '#infra/users/models/user'

export interface ListAuditLogsParams {
  page: number
  perPage: number
  search?: string
  action?: string
  resourceType?: string
  userId?: string
  from?: Date
  to?: Date
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

const buildFilter = async (params: ListAuditLogsParams): Promise<Record<string, unknown>> => {
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
  if (!search) {
    return filter
  }

  const searchRegex = new RegExp(escapeRegex(search), 'i')
  const matchedUsers = await User.query()
    .select('id')
    .where((query) => {
      void query
        .where('username', 'ilike', `%${search}%`)
        .orWhere('email', 'ilike', `%${search}%`)
    })

  const matchedUserIds = matchedUsers.map((user) => user.id)

  filter.$or = [
    { action: searchRegex },
    { entity_type: searchRegex },
    { entity_id: searchRegex },
    { ip_address: searchRegex },
    ...(matchedUserIds.length > 0 ? [{ user_id: { $in: matchedUserIds } }] : []),
  ]

  return filter
}

export const AdminAuditLogReadOps = {
  async listAuditLogs(params: ListAuditLogsParams): Promise<{
    data: AdminAuditLogRecord[]
    total: number
  }> {
    const page = Math.max(1, params.page)
    const perPage = Math.max(1, params.perPage)
    const skip = (page - 1) * perPage
    const filter = await buildFilter(params)

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
  },
}
