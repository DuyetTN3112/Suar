import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { loadAuditLogs, renderAuditLogPage } from './audit_log_surface_presenter.js'

import { AdminAuditLogActionFactory } from '#modules/admin/audit_logs/actions/ports/inbound/audit_logs/admin_audit_log_action_factory'

@inject()
export default class ListSystemAuditLogsPageController {
  constructor(private readonly actions: AdminAuditLogActionFactory) {}

  async handle(ctx: HttpContext) {
    return renderAuditLogPage(
      ctx,
      await loadAuditLogs(ctx, this.actions, 'system'),
      'Audit log hệ thống'
    )
  }
}
