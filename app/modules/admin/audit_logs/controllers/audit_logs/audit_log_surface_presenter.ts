import type { HttpContext } from '@adonisjs/core/http'

import {
  normalizeAuditLogSurfaceInput,
  readAuditLogListInput,
  toAuditLogListDTO,
  type AuditLogListInput,
  type AuditLogSurface,
  type AuditLogSurfaceScope,
} from '../mappers/request/audit_logs/audit_log_list_request_mapper.js'
import { mapAdminAuditLogResponse } from '../mappers/response/audit_logs/admin_api_response_mapper.js'
import {
  mapOrganizationAuditActivityResponse,
  mapUserAuditActivityResponse,
} from '../mappers/response/audit_logs/audit_log_surface_response_mapper.js'

import type { AdminAuditLogActionFactory } from '#modules/admin/audit_logs/actions/ports/inbound/audit_logs/admin_audit_log_action_factory'
import type { ListAuditLogsResult } from '#modules/admin/audit_logs/actions/queries/audit_logs/list_audit_logs_query'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { toCanonicalPagePagination } from '#modules/pagination/public_contracts/pagination_public_api'

export interface LoadedAuditLogs {
  result: ListAuditLogsResult
  filters: AuditLogListInput
  surface: AuditLogSurface
  scope: AuditLogSurfaceScope
}

export async function loadAuditLogs(
  ctx: HttpContext,
  actions: AdminAuditLogActionFactory,
  surface: AuditLogSurface,
  scope: AuditLogSurfaceScope = {}
): Promise<LoadedAuditLogs> {
  const filters = normalizeAuditLogSurfaceInput(readAuditLogListInput(ctx), surface)
  const result = await actions
    .makeListAuditLogsQuery(actionContextFromHttp(ctx))
    .handle(toAuditLogListDTO(filters, surface, scope))

  return { result, filters, surface, scope }
}

export function auditLogFilterProps(filters: AuditLogListInput, surface: AuditLogSurface) {
  if (surface === 'user') {
    return {
      search: filters.search ?? '',
      resourceType: filters.resourceType ?? null,
      outcome: filters.outcome ?? null,
      from: filters.from?.toISOString() ?? null,
      to: filters.to?.toISOString() ?? null,
      after: filters.after ?? null,
      before: filters.before ?? null,
    }
  }

  return {
    search: filters.search ?? '',
    action: filters.action ?? null,
    resourceType: filters.resourceType ?? null,
    module: filters.module ?? null,
    workflow: filters.workflow ?? null,
    severity: filters.severity ?? null,
    outcome: filters.outcome ?? null,
    actorType: filters.actorType ?? null,
    retentionClass: filters.retentionClass ?? null,
    traceId: filters.traceId ?? null,
    userId: filters.userId ?? null,
    from: filters.from?.toISOString() ?? null,
    to: filters.to?.toISOString() ?? null,
    after: filters.after ?? null,
    before: filters.before ?? null,
  }
}

export function renderAuditLogPage(ctx: HttpContext, loaded: LoadedAuditLogs, title: string) {
  const { result, filters, surface, scope } = loaded
  const pageName =
    surface === 'organization'
      ? 'org/audit_logs/index'
      : surface === 'user'
        ? 'settings/audit_logs'
        : 'admin/audit_logs/index'
  const auditLogs =
    surface === 'user'
      ? result.data.map((log) => mapUserAuditActivityResponse(log, scope.actorUserId ?? ''))
      : surface === 'organization'
        ? result.data.map(mapOrganizationAuditActivityResponse)
        : result.data.map(mapAdminAuditLogResponse)

  return ctx.inertia.render(pageName, {
    auditLogs,
    pagination: toCanonicalPagePagination(result.meta),
    title,
    filters: auditLogFilterProps(filters, surface),
    ...(surface === 'user' ? {} : { surface }),
  })
}
