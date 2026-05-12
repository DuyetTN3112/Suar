import GetUserNotifications from '#actions/notifications/get_user_notifications'
import { notificationPublicApi } from '#actions/notifications/public_api'
import RemoveMemberCommand from '#actions/organizations/commands/remove_member_command'
import UpdateMemberRoleCommand from '#actions/organizations/commands/update_member_role_command'
import { RemoveMemberDTO } from '#actions/organizations/dtos/request/remove_member_dto'
import { UpdateMemberRoleDTO } from '#actions/organizations/dtos/request/update_member_role_dto'
import AuditLog from '#infra/audit/models/audit_log'
import CacheService from '#infra/cache/cache_service'
import type Organization from '#infra/organizations/models/organization'
import type Project from '#infra/projects/models/project'
import type Task from '#infra/tasks/models/task'
import type User from '#infra/users/models/user'
import {
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { ExecutionContext } from '#types/execution_context'

interface AuditLogEntry {
  action: string
  old_values?: Record<string, unknown>
  new_values?: Record<string, unknown>
}

export class OrganizationMembershipScenario {
  constructor(
    readonly org: Organization,
    readonly owner: User
  ) {}

  static async create(): Promise<OrganizationMembershipScenario> {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    return new OrganizationMembershipScenario(org, owner)
  }

  memberListCacheKey(): string {
    return `organization:members:${this.org.id}:member-list`
  }

  async addMember(
    input: {
      role?: string
      status?: 'approved' | 'pending'
      invitedById?: string | null
      user?: User
    } = {}
  ): Promise<User> {
    const user = input.user ?? (await UserFactory.create())
    await OrganizationUserFactory.create({
      organization_id: this.org.id,
      user_id: user.id,
      org_role: input.role ?? 'org_member',
      status: input.status ?? 'approved',
      invited_by: input.invitedById ?? null,
    })
    return user
  }

  async seedMemberListCache(userIds: string[]): Promise<void> {
    await CacheService.set(this.memberListCacheKey(), { userIds })
  }

  async createOwnedProject(): Promise<Project> {
    return ProjectFactory.create({
      organization_id: this.org.id,
      creator_id: this.owner.id,
      owner_id: this.owner.id,
    })
  }

  async createAssignedTask(project: Project, assigneeId: string): Promise<Task> {
    return TaskFactory.create({
      organization_id: this.org.id,
      creator_id: this.owner.id,
      project_id: project.id,
      assigned_to: assigneeId,
    })
  }

  async executeRoleChange(actorId: string, targetUserId: string, newRole: string): Promise<void> {
    const command = new UpdateMemberRoleCommand(
      ExecutionContext.system(actorId),
      notificationPublicApi
    )

    await command.execute(new UpdateMemberRoleDTO(this.org.id, targetUserId, newRole))
  }

  async executeMemberRemoval(actorId: string, targetUserId: string, reason: string): Promise<void> {
    const command = new RemoveMemberCommand(
      ExecutionContext.system(actorId),
      notificationPublicApi
    )

    await command.execute(new RemoveMemberDTO(this.org.id, targetUserId, reason))
  }

  async getUserNotifications(userId: string) {
    return new GetUserNotifications(ExecutionContext.system(userId)).handle({
      page: 1,
      limit: 20,
    })
  }

  async getOrganizationAuditLogs(action: string): Promise<AuditLogEntry[]> {
    return (await AuditLog.find({
      action,
      entity_type: 'organization',
      entity_id: this.org.id,
    })) as AuditLogEntry[]
  }
}
