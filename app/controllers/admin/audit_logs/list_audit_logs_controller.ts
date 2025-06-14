import type { HttpContext } from '@adonisjs/core/http'

/**
 * ListAuditLogsController
 *
 * Show system audit logs
 *
 * GET /admin/audit-logs
 */
export default class ListAuditLogsController {
  async handle({ inertia, response, params, session }: HttpContext) {
    // TODO Phase 1.4: Implement action/query logic
    return inertia.render('admin/audit_logs/index', {})
  }
}
