import type { AdminActionContext } from '#modules/admin/actions/admin_action_context'
import { BaseQuery } from '#modules/admin/actions/base_query'
import { ADMIN_PAGINATION } from '#modules/admin/application/dtos/common/admin_pagination'
import { AdminAuditLogReadOps } from '#modules/admin/infra/repositories/read/admin_audit_log_queries'
import { buildAdminAuditLogViewEvent } from '#modules/admin/observability/admin_event_factory'
import {
  PLATFORM_EVENT_NAMES,
  platformWorkflowLogger,
} from '#modules/observability/public_contracts/platform_observability'
import {
  buildPaginationMeta,
  normalizePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'
import { userPublicApi } from '#modules/users/public_contracts/user_public_api'

export interface ListAuditLogsDTO {
  page?: number
  perPage?: number
  after?: string | null
  before?: string | null
  surface?: 'system' | 'organization' | 'user'
  actorUserId?: string
  organizationId?: string
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
    event_name?: string | null
    event_family?: string | null
    module?: string | null
    subsystem?: string | null
    workflow?: string | null
    stage?: string | null
    severity?: string | null
    outcome?: string | null
    actor_type?: string | null
    actor_user_id?: string | null
    actor_org_id?: string | null
    actor_role_surface?: string | null
    target_type?: string | null
    target_id?: string | null
    target_org_id?: string | null
    request_id?: string | null
    trace_id?: string | null
    correlation_key?: string | null
    retention_class?: string | null
    redaction_applied?: boolean
    schema_version?: number
    event_hash?: string | null
    prev_hash?: string | null
  }[]
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
    mode: 'cursor'
    cursor: {
      nextCursor: string | null
      previousCursor: string | null
      hasNextPage: boolean
      hasPreviousPage: boolean
    }
  }
}

/**
 * ListAuditLogsQuery
 *
 * Application Layer - Query for listing audit logs
 */
export default class ListAuditLogsQuery extends BaseQuery<ListAuditLogsDTO, ListAuditLogsResult> {
  constructor(
    execCtx: AdminActionContext,
    private repo = AdminAuditLogReadOps
  ) {
    super(execCtx)
  }

  async handle(dto: ListAuditLogsDTO): Promise<ListAuditLogsResult> {
    const pagination = normalizePagination(dto, ADMIN_PAGINATION, { perPage: 50 })

    try {
      const result = await this.repo.listAuditLogs({
        page: pagination.page,
        perPage: pagination.perPage,
        after: dto.after ?? null,
        before: dto.before ?? null,
        surface: dto.surface ?? 'system',
        ...(dto.actorUserId ? { actorUserId: dto.actorUserId } : {}),
        ...(dto.organizationId ? { organizationId: dto.organizationId } : {}),
        ...(dto.search ? { search: dto.search } : {}),
        ...(dto.action ? { action: dto.action } : {}),
        ...(dto.resourceType ? { resourceType: dto.resourceType } : {}),
        ...(dto.userId ? { userId: dto.userId } : {}),
        ...(dto.from ? { from: dto.from } : {}),
        ...(dto.to ? { to: dto.to } : {}),
      })

      const userIds = [...new Set(result.data.map((log) => log.user_id).filter((value) => !!value))]
      const users =
        userIds.length > 0
          ? await userPublicApi.findByIds(userIds as string[], ['id', 'username'])
          : []
      const userMap = new Map(users.map((user) => [user.id, user]))
      const meta = buildPaginationMeta(result.total, {
        page: 1,
        perPage: pagination.perPage,
      })

      await platformWorkflowLogger.checkpoint(
        this.execCtx,
        buildAdminAuditLogViewEvent(this.execCtx, {
          eventName: PLATFORM_EVENT_NAMES.ADMIN_AUDIT_LOG_VIEWED,
          stage: 'completed',
          outcome: 'success',
          actorUserId: dto.userId ?? null,
          filters: {
            surface: dto.surface ?? 'system',
            actor_user_id: dto.actorUserId ?? null,
            organization_id: dto.organizationId ?? null,
            search: dto.search ?? null,
            action: dto.action ?? null,
            resource_type: dto.resourceType ?? null,
            from: dto.from?.toISOString() ?? null,
            to: dto.to?.toISOString() ?? null,
            page: 1,
            per_page: pagination.perPage,
            after: dto.after ?? null,
            before: dto.before ?? null,
          },
          runtime: {
            result_count: result.data.length,
            total: result.total,
          },
          retentionClass: 'security_audit',
        })
      )

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
          event_name: log.event_name ?? null,
          event_family: log.event_family ?? null,
          module: log.module ?? null,
          subsystem: log.subsystem ?? null,
          workflow: log.workflow ?? null,
          stage: log.stage ?? null,
          severity: log.severity ?? null,
          outcome: log.outcome ?? null,
          actor_type: log.actor_type ?? null,
          actor_user_id: log.actor_user_id ?? null,
          actor_org_id: log.actor_org_id ?? null,
          actor_role_surface: log.actor_role_surface ?? null,
          target_type: log.target_type ?? null,
          target_id: log.target_id ?? null,
          target_org_id: log.target_org_id ?? null,
          request_id: log.request_id ?? null,
          trace_id: log.trace_id ?? null,
          correlation_key: log.correlation_key ?? null,
          retention_class: log.retention_class ?? null,
          redaction_applied: log.redaction_applied ?? false,
          schema_version: log.schema_version ?? 1,
          event_hash: log.event_hash ?? null,
          prev_hash: log.prev_hash ?? null,
        })),
        meta: {
          total: meta.total,
          perPage: meta.perPage,
          currentPage: meta.currentPage,
          lastPage: meta.lastPage,
          mode: 'cursor',
          cursor: {
            nextCursor: result.nextCursor,
            previousCursor: result.previousCursor,
            hasNextPage: result.hasNextPage,
            hasPreviousPage: result.hasPreviousPage,
          },
        },
      }
    } catch (error) {
      await platformWorkflowLogger.checkpoint(
        this.execCtx,
        buildAdminAuditLogViewEvent(this.execCtx, {
          eventName: PLATFORM_EVENT_NAMES.ADMIN_AUDIT_LOG_VIEW_FAILED,
          stage: 'failed',
          outcome: 'failure',
          actorUserId: dto.userId ?? null,
          filters: {
            surface: dto.surface ?? 'system',
            actor_user_id: dto.actorUserId ?? null,
            organization_id: dto.organizationId ?? null,
            search: dto.search ?? null,
            action: dto.action ?? null,
            resource_type: dto.resourceType ?? null,
            from: dto.from?.toISOString() ?? null,
            to: dto.to?.toISOString() ?? null,
            page: 1,
            per_page: pagination.perPage,
            after: dto.after ?? null,
            before: dto.before ?? null,
          },
          error,
          retentionClass: 'security_audit',
        })
      )
      throw error
    }
  }
}
