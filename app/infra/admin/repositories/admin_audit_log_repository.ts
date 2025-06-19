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
        void q.select('id', 'username')
      })
      .orderBy('created_at', 'desc')

    const search = params.search
    if (search) {
      void query.where((q) => {
        void q
          .where('action', 'ilike', `%${search}%`)
          .orWhere('entity_type', 'ilike', `%${search}%`)
          .orWhereHas('user', (userQuery) => {
            void userQuery.where('username', 'ilike', `%${search}%`)
          })
      })
    }

    if (params.action) {
      void query.where('action', params.action)
    }

    if (params.resourceType) {
      void query.where('entity_type', params.resourceType)
    }

    return await query.paginate(params.page, params.perPage)
  }
}
