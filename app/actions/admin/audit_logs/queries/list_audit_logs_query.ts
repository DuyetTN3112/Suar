import { BaseQuery } from '#actions/shared/base_query'
import AdminAuditLogRepository from '#infra/admin/repositories/admin_audit_log_repository'
import UserRepository from '#infra/users/repositories/user_repository'
import type { ExecutionContext } from '#types/execution_context'

export interface ListAuditLogsDTO {
  page?: number
  perPage?: number
  search?: string
  action?: string
  resourceType?: string
  userId?: string
  from?: Date
  to?: Date
}

export interface ListAuditLogsResult {
  data: {
    id: string
    user: {
      id: string
      username: string
    } | null
    action: string
    resource_type: string
    resource_id: string | null
    details: Record<string, unknown>
    ip_address: string
    user_agent: string
    created_at: string
  }[]
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
  }
}

/**
 * ListAuditLogsQuery
 *
 * Application Layer - Query for listing audit logs
 */
export default class ListAuditLogsQuery extends BaseQuery<ListAuditLogsDTO, ListAuditLogsResult> {
  constructor(
    execCtx: ExecutionContext,
    private repo = new AdminAuditLogRepository()
  ) {
    super(execCtx)
  }

  async handle(dto: ListAuditLogsDTO): Promise<ListAuditLogsResult> {
    const page = dto.page ?? 1
    const perPage = dto.perPage ?? 50

    const result = await this.repo.listAuditLogs({
      page,
      perPage,
      search: dto.search,
      action: dto.action,
      resourceType: dto.resourceType,
      userId: dto.userId,
      from: dto.from,
      to: dto.to,
    })

    const userIds = [...new Set(result.data.map((log) => log.user_id).filter((value) => !!value))]
    const users =
      userIds.length > 0
        ? await UserRepository.findByIds(userIds as string[], ['id', 'username'])
        : []
    const userMap = new Map(users.map((user) => [user.id, user]))

    const lastPage = Math.max(1, Math.ceil(result.total / perPage))

    return {
      data: result.data.map((log) => ({
        id: log.id,
        user: log.user_id
          ? (() => {
              const user = userMap.get(log.user_id)
              return user ? { id: user.id, username: user.username } : null
            })()
          : null,
        action: log.action,
        resource_type: log.entity_type,
        resource_id: log.entity_id,
        details: {
          old_values: log.old_values,
          new_values: log.new_values,
        },
        ip_address: log.ip_address ?? '',
        user_agent: log.user_agent ?? '',
        created_at: log.created_at.toISOString(),
      })),
      meta: {
        total: result.total,
        perPage,
        currentPage: page,
        lastPage,
      },
    }
  }
}
