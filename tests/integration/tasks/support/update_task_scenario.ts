import db from '@adonisjs/lucid/services/db'

import { notificationPublicApi, type NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import type Organization from '#modules/organizations/infra/models/organization'
import type Project from '#modules/projects/infra/models/project'
import UpdateTaskCommand from '#modules/tasks/actions/commands/update_task_command'
import type UpdateTaskDTO from '#modules/tasks/actions/dtos/request/update_task_dto'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { taskExternalDeps } from '#modules/tasks/bootstrap/task_composition_root'
import { TaskCacheInvalidator } from '#modules/tasks/infra/cache/task_cache_invalidator'
import type Task from '#modules/tasks/infra/models/task'
import TaskVersion from '#modules/tasks/infra/models/task_version'
import type User from '#modules/users/infra/models/user'
import {
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

type NotificationPayload = Parameters<NotificationCreator['handle']>[0]

export class UpdateTaskNotificationSpy implements NotificationCreator {
  public calls: NotificationPayload[] = []

  public handle(data: NotificationPayload): Promise<null> {
    this.calls.push(data)
    return Promise.resolve(null)
  }
}

export class UpdateTaskScenario {
  constructor(
    readonly org: Organization,
    readonly owner: User,
    readonly project: Project
  ) {}

  static async create(): Promise<UpdateTaskScenario> {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    return new UpdateTaskScenario(org, owner, project)
  }

  buildActionContext(userId: string, organizationId: string = this.org.id): TaskActionContext {
    return {
      userId,
      organizationId,
      ip: '127.0.0.1',
      userAgent: 'integration-test',
    }
  }

  commandFor(
    actorId: string,
    notification: NotificationCreator = notificationPublicApi,
    organizationId: string = this.org.id
  ): UpdateTaskCommand {
    return new UpdateTaskCommand(
      this.buildActionContext(actorId, organizationId),
      taskExternalDeps,
      notification,
      new TaskCacheInvalidator()
    )
  }

  createNotificationSpy(): UpdateTaskNotificationSpy {
    return new UpdateTaskNotificationSpy()
  }

  async createOrgMember(): Promise<User> {
    const member = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: this.org.id,
      user_id: member.id,
      org_role: 'org_member',
      status: 'approved',
    })
    return member
  }

  async createTask(
    overrides: Partial<{
      title: string
      description: string
      assigned_to: string | null
      estimated_time: number
    }> = {}
  ): Promise<Task> {
    return TaskFactory.create({
      organization_id: this.org.id,
      creator_id: this.owner.id,
      project_id: this.project.id,
      title: overrides.title,
      description: overrides.description,
      assigned_to: overrides.assigned_to,
      estimated_time: overrides.estimated_time,
    })
  }

  async createProject(): Promise<Project> {
    return ProjectFactory.create({
      organization_id: this.org.id,
      creator_id: this.owner.id,
      owner_id: this.owner.id,
    })
  }

  async createForeignOrg(): Promise<{ org: Organization; owner: User }> {
    return OrganizationFactory.createWithOwner()
  }

  async execute(taskId: string, dto: UpdateTaskDTO, actorId: string = this.owner.id) {
    return this.commandFor(actorId).execute(taskId, dto)
  }

  async executeWithNotification(
    taskId: string,
    dto: UpdateTaskDTO,
    actorId: string,
    notification: NotificationCreator,
    organizationId: string = this.org.id
  ) {
    return this.commandFor(actorId, notification, organizationId).execute(taskId, dto)
  }

  async findVersionSnapshot(taskId: string) {
    return TaskVersion.query().where('task_id', taskId).first()
  }

  async countUpdateAuditLogs(taskId: string): Promise<number> {
    const logs = await db.from('audit_events')
      .where('entity_type', 'task')
      .where('entity_id', taskId)
      .where('action', 'update')
    return logs.length
  }
}
