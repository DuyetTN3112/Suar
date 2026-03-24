import AuditLog from '#models/audit_log'

/**
 * AdminAuditLogRepository
 *
 * Infrastructure - Data access for audit log operations
 */
export default class AdminAuditLogRepository {
  /**
   * List audit logs with filters
   */
  async listAuditLogs(params: {
    page: number
    perPage: number
    search?: string
    action?: string
    resourceType?: string
  }) {
    const query = AuditLog.query()
      .preload('user', (q) => {
        q.select('id', 'username')
      })
      .orderBy('created_at', 'desc')

    if (params.search) {
      query.where((q) => {
        q.where('action', 'ilike', `%${params.search}%`)
          .orWhere('entity_type', 'ilike', `%${params.search}%`)
          .orWhereHas('user', (userQuery) => {
            userQuery.where('username', 'ilike', `%${params.search}%`)
          })
      })
    }

    if (params.action) {
      query.where('action', params.action)
    }

    if (params.resourceType) {
      query.where('entity_type', params.resourceType)
    }

    return await query.paginate(params.page, params.perPage)
  }
}
