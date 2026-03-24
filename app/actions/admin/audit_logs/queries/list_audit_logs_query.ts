import { BaseQuery } from '#actions/shared/base_query'
import type { ExecutionContext } from '#types/execution_context'
import AdminAuditLogRepository from '#infra/admin/repositories/admin_audit_log_repository'

export interface ListAuditLogsDTO {
  page?: number
  perPage?: number
  search?: string
  action?: string
  resourceType?: string
}

export interface ListAuditLogsResult {
  data: Array<{
    id: string
    user: {
      id: string
      username: string
    } | null
    action: string
    resource_type: string
    resource_id: string | null
    details: any
    ip_address: string
    user_agent: string
    created_at: string
  }>
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
    const page = dto.page || 1
    const perPage = dto.perPage || 50

    const result = await this.repo.listAuditLogs({
      page,
      perPage,
      search: dto.search,
      action: dto.action,
      resourceType: dto.resourceType,
    })

    const lastPage = Math.ceil(result.total / perPage)

    return {
      data: result.all().map((log) => ({
        id: log.id,
        user: log.user
          ? {
              id: log.user.id,
              username: log.user.username,
            }
          : null,
        action: log.action,
        resource_type: log.entity_type,
        resource_id: log.entity_id ? String(log.entity_id) : null,
        details: {
          old_values: log.old_values,
          new_values: log.new_values,
        },
        ip_address: log.ip_address || '',
        user_agent: log.user_agent || '',
        created_at: log.created_at.toISO() || new Date().toISOString(),
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
