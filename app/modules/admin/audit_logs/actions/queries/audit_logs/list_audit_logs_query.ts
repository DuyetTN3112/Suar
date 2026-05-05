import type { AdminActionContext } from '#modules/admin/audit_logs/actions/action_context'
import { ADMIN_PAGINATION } from '#modules/admin/audit_logs/actions/dtos/common/audit_logs/admin_pagination'
import type { AdminAuditEventReader } from '#modules/admin/audit_logs/actions/ports/outbound/audit_logs/admin_audit_event_reader'
import type { AdminAuditProjectionReader } from '#modules/admin/audit_logs/actions/ports/outbound/audit_logs/admin_audit_projection_reader'
import { BaseQuery } from '#modules/admin/audit_logs/actions/queries/audit_logs/base_query'
import { buildAdminAuditLogViewEvent } from '#modules/admin/audit_logs/observability/audit_logs/admin_event_factory'
import {
  PLATFORM_EVENT_NAMES,
  platformWorkflowLogger,
} from '#modules/observability/public_contracts/platform_observability'
import {
  buildPaginationMeta,
  normalizePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'

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
  module?: string
  workflow?: string
  severity?: string
  outcome?: string
  actorType?: string
  retentionClass?: string
  traceId?: string
  userId?: string
  from?: Date
  to?: Date
}

export interface ListAuditLogsResult {
  data: {
    id: string
    source_user_id: string | null
    user: {
      id: string
      username: string
    } | null
    action: string
    resource_type: string
    resource_id: string | null
    details: {
      old_values: Record<string, unknown> | null
      new_values: Record<string, unknown> | null
    }
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
    target_label?: string | null
    target_org_id?: string | null
    request_id?: string | null
    trace_id?: string | null
    correlation_key?: string | null
    retention_class?: string | null
    source_occurred_at?: string | null
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
    private readonly eventReader: AdminAuditEventReader,
    private readonly projectionReader: AdminAuditProjectionReader
  ) {
    super(execCtx)
  }

  async handle(dto: ListAuditLogsDTO): Promise<ListAuditLogsResult> {
    const pagination = normalizePagination(dto, ADMIN_PAGINATION, { perPage: 50 })
    const surface = dto.surface ?? 'system'

    try {
      const searchProjection = await this.projectionReader.buildSearchProjection({
        surface,
        ...(dto.organizationId ? { organizationId: dto.organizationId } : {}),
        ...(dto.search ? { search: dto.search } : {}),
      })
      const result = await this.eventReader.list({
        page: pagination.page,
        perPage: pagination.perPage,
        after: dto.after ?? null,
        before: dto.before ?? null,
        surface,
        ...(dto.actorUserId ? { actorUserId: dto.actorUserId } : {}),
        ...(dto.organizationId ? { organizationId: dto.organizationId } : {}),
        ...(dto.search ? { search: dto.search } : {}),
        ...(dto.action ? { action: dto.action } : {}),
        ...(dto.resourceType ? { resourceType: dto.resourceType } : {}),
        ...(dto.module ? { module: dto.module } : {}),
        ...(dto.workflow ? { workflow: dto.workflow } : {}),
        ...(dto.severity ? { severity: dto.severity } : {}),
        ...(dto.outcome ? { outcome: dto.outcome } : {}),
        ...(dto.actorType ? { actorType: dto.actorType } : {}),
        ...(dto.retentionClass ? { retentionClass: dto.retentionClass } : {}),
        ...(dto.traceId ? { traceId: dto.traceId } : {}),
        ...(dto.userId ? { userId: dto.userId } : {}),
        ...(dto.from ? { from: dto.from } : {}),
        ...(dto.to ? { to: dto.to } : {}),
        searchMatchedActorUserIds: searchProjection.matchedActorUserIds,
        organizationScopedTargets: searchProjection.organizationScopedTargets,
        searchMatchedTargets: searchProjection.matchedTargets,
      })

      const userIds = [
        ...new Set(
          result.data
            .map((log) => log.actor_user_id ?? log.user_id)
            .filter((value): value is string => Boolean(value))
        ),
      ]
      const users = userIds.length > 0 ? await this.projectionReader.findActorsByIds(userIds) : []
      const userMap = new Map(users.map((user) => [user.id, user]))
      const targetLabels = await this.projectionReader.resolveTargetLabels({
        events: result.data,
        surface,
        ...(dto.organizationId ? { organizationId: dto.organizationId } : {}),
      })
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
            module: dto.module ?? null,
            workflow: dto.workflow ?? null,
            severity: dto.severity ?? null,
            outcome: dto.outcome ?? null,
            actor_type: dto.actorType ?? null,
            retention_class: dto.retentionClass ?? null,
            trace_id: dto.traceId ?? null,
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
        data: result.data.map((log) => {
          const actorUserId = log.actor_user_id ?? log.user_id
          const actorUser = actorUserId ? userMap.get(actorUserId) : null
          const targetType = log.target_type ?? log.entity_type
          const targetId = log.target_id ?? log.entity_id
          const targetLabel = targetId
            ? (targetLabels.get(`${targetType}:${targetId}`) ?? null)
            : null

          return {
            id: log.id,
            source_user_id: log.user_id,
            user: actorUser ? { id: actorUser.id, username: actorUser.username } : null,
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
            target_label: targetLabel,
            target_org_id: log.target_org_id ?? null,
            request_id: log.request_id ?? null,
            trace_id: log.trace_id ?? null,
            correlation_key: log.correlation_key ?? null,
            retention_class: log.retention_class ?? null,
            source_occurred_at: log.source_occurred_at?.toISOString() ?? null,
            redaction_applied: log.redaction_applied ?? false,
            schema_version: log.schema_version ?? 1,
            event_hash: log.event_hash ?? null,
            prev_hash: log.prev_hash ?? null,
          }
        }),
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
            module: dto.module ?? null,
            workflow: dto.workflow ?? null,
            severity: dto.severity ?? null,
            outcome: dto.outcome ?? null,
            actor_type: dto.actorType ?? null,
            retention_class: dto.retentionClass ?? null,
            trace_id: dto.traceId ?? null,
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
