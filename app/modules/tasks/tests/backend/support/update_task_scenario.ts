import db from '@adonisjs/lucid/services/db'

import { notificationApplication as notificationPublicApi } from '#composition/notifications/notification-feed/notification_composition'
import { taskExternalDeps } from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import type Organization from '#modules/organizations/infra/models/directory/organization'
import type Project from '#modules/projects/infra/models/project-context/project'
import UpdateTaskCommand from '#modules/tasks/actions/commands/task-authoring/update_task_command'
import type UpdateTaskDTO from '#modules/tasks/actions/dtos/request/update_task_dto'
import type { TaskNotificationStager as NotificationStager } from '#modules/tasks/actions/ports/outbound/task_notification_stager'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { InProcessTaskEventPublisher } from '#modules/tasks/infra/adapters/task-authoring/in_process_task_event_publisher'
import { TaskCacheInvalidator } from '#modules/tasks/infra/adapters/task-authoring/task_cache_invalidator'
import type Task from '#modules/tasks/infra/models/task-authoring/task'
import TaskVersion from '#modules/tasks/infra/models/task-authoring/task_version'
import type User from '#modules/users/infra/models/profile/user'
import {
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
}


type NotificationPayload = Parameters<NotificationStager['stage']>[0]
const taskEvents = new InProcessTaskEventPublisher()

export class UpdateTaskNotificationSpy implements NotificationStager {
  public calls: NotificationPayload[] = []

  public stage(data: NotificationPayload): Promise<null> {
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
    notification: NotificationStager = notificationPublicApi,
    organizationId: string = this.org.id
  ): UpdateTaskCommand {
    return new UpdateTaskCommand(
      this.buildActionContext(actorId, organizationId),
      taskExternalDeps,
      notification,
      new TaskCacheInvalidator(),
      taskEvents
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
      parent_task_id: string | null
    }> = {}
  ): Promise<Task> {
    return TaskFactory.create(omitUndefined({
      organization_id: this.org.id,
      creator_id: this.owner.id,
      project_id: this.project.id,
      title: overrides.title,
      description: overrides.description,
      assigned_to: overrides.assigned_to,
      estimated_time: overrides.estimated_time,
      parent_task_id: overrides.parent_task_id,
    }))
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
    notification: NotificationStager,
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
