import {
  getLastAuditActivityByUsers,
  listAuditLogsByEntity,
} from '#composition/audit_read_composition'
import { userPublicApi } from '#composition/user_application_composition'
import type { AuditLogRecord } from '#modules/audit/public_contracts/audit_read_contract'
import type {
  ProjectAuditActivityReader,
  ProjectRecentActivity,
} from '#modules/projects/actions/ports/outbound/project_audit_activity_reader'

type ProjectActivityIdentity = { id: string; username: string | null }

export class ProjectAuditActivityReaderAdapter implements ProjectAuditActivityReader {
  constructor(
    private readonly listLogs: (
      entityType: string,
      entityId: string,
      limit: number
    ) => Promise<AuditLogRecord[]> = listAuditLogsByEntity,
    private readonly findUsers: (userIds: string[]) => Promise<ProjectActivityIdentity[]> = (
      userIds
    ) => userPublicApi.findByIds(userIds, ['id', 'username']),
    private readonly getLastActivity: (
      entityType: string,
      entityId: string,
      userIds: string[]
    ) => Promise<Map<string, Date | null>> = getLastAuditActivityByUsers
  ) {}

  async listRecentProjectActivity(
    projectId: string,
    limit: number
  ): Promise<ProjectRecentActivity[]> {
    const logs = await this.listLogs('project', projectId, limit)
    const userIds = [...new Set(logs.map((log) => log.user_id).filter(Boolean))] as string[]
    const users = await this.findUsers(userIds)
    const userMap = new Map(users.map((user) => [user.id, user]))

    return logs.map((log) => ({
      id: log.id,
      user_id: log.user_id ?? null,
      entity_type: log.entity_type,
      entity_id: log.entity_id ?? null,
      action: log.action,
      created_at: log.created_at,
      username: userMap.get(log.user_id ?? '')?.username ?? null,
    }))
  }

  async getLastProjectActivityByUsers(
    projectId: string,
    userIds: string[]
  ): Promise<Map<string, Date | null>> {
    return this.getLastActivity('project', projectId, userIds)
  }
}
