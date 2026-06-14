import { notificationApplication as notificationPublicApi } from '#composition/notifications/notification-feed/notification_composition'
import { makeGetUserNotifications } from '#composition/notifications/notification-feed/notification_feed_composition'
import { organizationCacheInvalidator } from '#composition/organizations/access/organization_cache_composition'
import { makeRemoveMemberCommand } from '#composition/organizations/members/organization_notification_composition'
import {
  organizationEventPublisher,
  organizationMembershipRepository,
  organizationReader,
  organizationTransactionRunner,
} from '#composition/organizations/persistence/organization_persistence_composition'
import AuditLog from '#modules/audit/infra/models/audit-log/audit_log'
import RedisCacheStore from '#modules/cache/infra/adapters/cache-runtime/redis_cache_store'
import {
  CACHE_COLLECTION_GENERATION_NAMESPACES,
  organizationCacheGenerationNamespaces,
} from '#modules/cache/public_contracts/cache_contract'
import { makeSystemOrganizationActionContext } from '#modules/organizations/actions/action_context'
import type Organization from '#modules/organizations/infra/models/directory/organization'
import ProcessJoinRequestCommand from '#modules/organizations/actions/commands/invitations/process_join_request_command'
import { ProcessJoinRequestDTO } from '#modules/organizations/actions/dtos/request/invitations/process_join_request_dto'
import UpdateMemberRoleCommand from '#modules/organizations/actions/commands/members/update_member_role_command'
import { RemoveMemberDTO } from '#modules/organizations/actions/dtos/request/members/remove_member_dto'
import { UpdateMemberRoleDTO } from '#modules/organizations/actions/dtos/request/members/update_member_role_dto'
import type Project from '#modules/projects/infra/models/project-context/project'
import type Task from '#modules/tasks/infra/models/task-authoring/task'
import type User from '#modules/users/infra/models/profile/user'
import {
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

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
    return `org:members:org:${this.org.id}:page:1:limit:20:sort:created_at:desc`
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

  async resolveMemberListCacheKey(): Promise<string> {
    const physicalKey = await RedisCacheStore.resolveVersionedKeyBestEffort(
      organizationCacheGenerationNamespaces(
        CACHE_COLLECTION_GENERATION_NAMESPACES.organizationMembers,
        this.org.id
      ),
      this.memberListCacheKey()
    )
    if (!physicalKey) {
      throw new Error('Expected organization-member generation key to resolve')
    }
    return physicalKey
  }

  async seedMemberListCache(userIds: string[]): Promise<string> {
    const physicalKey = await this.resolveMemberListCacheKey()
    await RedisCacheStore.set(physicalKey, { userIds })
    return physicalKey
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
      makeSystemOrganizationActionContext(actorId),
      notificationPublicApi,
      organizationTransactionRunner,
      organizationReader,
      organizationMembershipRepository,
      organizationEventPublisher
    )

    await command.execute(new UpdateMemberRoleDTO(this.org.id, targetUserId, newRole))
  }

  async executeMemberRemoval(actorId: string, targetUserId: string, reason: string): Promise<void> {
    const command = makeRemoveMemberCommand(
      makeSystemOrganizationActionContext(actorId),
      notificationPublicApi
    )

    await command.execute(new RemoveMemberDTO(this.org.id, targetUserId, reason))
  }

  async executeJoinRequestDecision(
    actorId: string,
    targetUserId: string,
    approve: boolean,
    reason?: string
  ): Promise<void> {
    const command = new ProcessJoinRequestCommand(
      makeSystemOrganizationActionContext(actorId),
      notificationPublicApi,
      organizationTransactionRunner,
      organizationMembershipRepository,
      organizationEventPublisher,
      organizationCacheInvalidator
    )

    await command.execute(new ProcessJoinRequestDTO(this.org.id, targetUserId, approve, reason))
  }

  async getUserNotifications(userId: string) {
    return makeGetUserNotifications(makeSystemOrganizationActionContext(userId)).handle({
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
