import { notificationPublicApi, type NotificationCreator } from '#actions/notifications/public_api'
import UpdateTaskCommand from '#actions/tasks/commands/update_task_command'
import type UpdateTaskDTO from '#actions/tasks/dtos/request/update_task_dto'
import { MongoAuditLogModel } from '#infra/audit/models/audit_log'
import type Organization from '#infra/organizations/models/organization'
import type Project from '#infra/projects/models/project'
import type Task from '#infra/tasks/models/task'
import TaskVersion from '#infra/tasks/models/task_version'
import type User from '#infra/users/models/user'
import {
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'
import type { ExecutionContext } from '#types/execution_context'

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

  buildExecutionContext(userId: string, organizationId: string = this.org.id): ExecutionContext {
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
    return new UpdateTaskCommand(this.buildExecutionContext(actorId, organizationId), notification)
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
    const auditLogs = await MongoAuditLogModel.find({
      entity_type: 'task',
      entity_id: taskId,
      action: 'update',
    })
      .lean()
      .exec()

    return auditLogs.length
  }
}
