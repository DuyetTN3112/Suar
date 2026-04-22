import { GetLastAuditActivityByUsersQuery } from '#modules/audit/actions/queries/audit-log/get_last_audit_activity_by_users_query'
import { ListAdminAuditLogsQuery } from '#modules/audit/actions/queries/audit-log/list_admin_audit_logs_query'
import { ListAuditLogsByEntityQuery } from '#modules/audit/actions/queries/audit-log/list_audit_logs_by_entity_query'
import { postgresAuditLogReadRepository } from '#modules/audit/infra/repositories/read/audit_log_read_repository'

export const listAuditLogsByEntityQuery = new ListAuditLogsByEntityQuery(
  postgresAuditLogReadRepository
)
export const listAdminAuditLogsQuery = new ListAdminAuditLogsQuery(postgresAuditLogReadRepository)
export const getLastAuditActivityByUsersQuery = new GetLastAuditActivityByUsersQuery(
  postgresAuditLogReadRepository
)

export const listAuditLogsByEntity = listAuditLogsByEntityQuery.execute.bind(
  listAuditLogsByEntityQuery
)
export const listAdminAuditLogs = listAdminAuditLogsQuery.execute.bind(listAdminAuditLogsQuery)
export const getLastAuditActivityByUsers = getLastAuditActivityByUsersQuery.execute.bind(
  getLastAuditActivityByUsersQuery
)
export { formatAuditChanges } from '#modules/audit/domain/audit-log/audit_change_formatter'
