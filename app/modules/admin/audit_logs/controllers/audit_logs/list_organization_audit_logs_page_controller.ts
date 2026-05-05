import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { loadAuditLogs, renderAuditLogPage } from './audit_log_surface_presenter.js'

import { AdminAuditLogActionFactory } from '#modules/admin/audit_logs/actions/ports/inbound/audit_logs/admin_audit_log_action_factory'
import { requireCurrentOrganizationId } from '#modules/http/boundary/http_execution_context'

@inject()
export default class ListOrganizationAuditLogsPageController {
  constructor(private readonly actions: AdminAuditLogActionFactory) {}

  async handle(ctx: HttpContext) {
    return renderAuditLogPage(
      ctx,
      await loadAuditLogs(ctx, this.actions, 'organization', {
        organizationId: requireCurrentOrganizationId(ctx),
      }),
      'Audit log tổ chức'
    )
  }
}
