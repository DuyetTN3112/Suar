import {
  formatAuditChanges,
  listAuditLogsByEntity,
} from '#composition/admin/audit/audit_read_composition'
import { userPublicApi } from '#composition/users/user-application/user_application_composition'
import type { AuditLogRecord } from '#modules/audit/public_contracts/audit_read_contract'
import type {
  TaskAuditTrailEntry,
  TaskAuditTrailReader,
} from '#modules/tasks/actions/ports/outbound/task_audit_trail_reader'

type AuditIdentity = { id: string; username: string | null; email: string | null }

export class TaskAuditTrailReaderAdapter implements TaskAuditTrailReader {
  constructor(
    private readonly listLogs: (
      entityType: string,
      entityId: string,
      limit: number
    ) => Promise<AuditLogRecord[]> = listAuditLogsByEntity,
    private readonly findUsers: (userIds: string[]) => Promise<AuditIdentity[]> = (userIds) =>
      userPublicApi.findByIds(userIds, ['id', 'username', 'email']),
    private readonly formatChanges: (
      oldValues: Record<string, unknown>,
      newValues: Record<string, unknown>
    ) => { field: string; oldValue: unknown; newValue: unknown }[] = formatAuditChanges
  ) {}

  async listTaskAuditTrail(taskId: string, limit: number): Promise<TaskAuditTrailEntry[]> {
    const logs = await this.listLogs('task', taskId, limit)
    const userIds = [...new Set(logs.map((log) => log.user_id).filter(Boolean))] as string[]
    const users = await this.findUsers(userIds)
    const userMap = new Map(users.map((user) => [user.id, user]))

    return logs.map((log) => {
      const user = userMap.get(log.user_id ?? '')
      return {
        id: log.id,
        action: log.action,
        user: user
          ? {
              id: user.id,
              name: user.username ?? 'Unknown',
              email: user.email ?? '',
            }
          : null,
        timestamp: log.created_at,
        changes: this.formatChanges(log.old_values ?? {}, log.new_values ?? {}),
      }
    })
  }
}
