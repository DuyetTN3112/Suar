import db from '@adonisjs/lucid/services/db'

import { notificationPublicApi, type NotificationCreator } from '#actions/notifications/public_api'
import BatchUpdateTaskStatusCommand from '#actions/tasks/commands/batch_update_task_status_command'
import { seedDefaultTaskStatuses } from '#actions/tasks/commands/seed_default_task_statuses'
import UpdateTaskStatusCommand from '#actions/tasks/commands/update_task_status_command'
import UpdateTaskStatusDTO from '#actions/tasks/dtos/request/update_task_status_dto'
import type Project from '#infra/projects/models/project'
import type Task from '#infra/tasks/models/task'
import TaskStatusModel from '#infra/tasks/models/task_status'
import { TaskStatus } from '#modules/tasks/constants/task_constants'
import {
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { ExecutionContext } from '#types/execution_context'

const taskStatusByLegacyStatus: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: 'todo',
  [TaskStatus.IN_PROGRESS]: 'in_progress',
  [TaskStatus.IN_REVIEW]: 'in_review',
  [TaskStatus.DONE]: 'done',
  [TaskStatus.CANCELLED]: 'cancelled',
}

const taskStatusBySlug: Record<string, TaskStatus> = {
  todo: TaskStatus.TODO,
  in_progress: TaskStatus.IN_PROGRESS,
  in_review: TaskStatus.IN_PROGRESS,
  done_dev: TaskStatus.IN_PROGRESS,
  in_testing: TaskStatus.IN_PROGRESS,
  rejected: TaskStatus.IN_PROGRESS,
  done: TaskStatus.DONE,
  cancelled: TaskStatus.CANCELLED,
}

async function seedTaskWorkflow(organizationId: string): Promise<void> {
  const trx = await db.transaction()
  try {
    await seedDefaultTaskStatuses(organizationId, trx)
    await trx.commit()
  } catch (error) {
    await trx.rollback()
    throw error
  }
}

export default class TaskStatusScenario {
  public readonly organizationId: string
  public readonly ownerId: string
  public readonly project: Project

  private readonly statusIdCache = new Map<string, string>()

  private constructor(organizationId: string, ownerId: string, project: Project) {
    this.organizationId = organizationId
    this.ownerId = ownerId
    this.project = project
  }

  public static async create(): Promise<TaskStatusScenario> {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    await seedTaskWorkflow(org.id)
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    return new TaskStatusScenario(org.id, owner.id, project)
  }

  public async statusId(slug: string): Promise<string> {
    const cached = this.statusIdCache.get(slug)
    if (cached !== undefined) {
      return cached
    }

    const status = await TaskStatusModel.query()
      .where('organization_id', this.organizationId)
      .where('slug', slug)
      .whereNull('deleted_at')
      .firstOrFail()

    this.statusIdCache.set(slug, status.id)
    return status.id
  }

  public async createTask(
    overrides: Partial<{
      status: TaskStatus
      task_status_id: string
      task_status_slug: string
      organization_id: string
      project_id: string
      creator_id: string
      assigned_to: string | null
    }> = {}
  ): Promise<Task> {
    const status = overrides.status ?? TaskStatus.TODO
    const taskStatusSlug = overrides.task_status_slug ?? taskStatusByLegacyStatus[status]
    const taskStatusId = overrides.task_status_id ?? (await this.statusId(taskStatusSlug))
    const creatorId = overrides.creator_id ?? this.ownerId
    const projectId = overrides.project_id ?? this.project.id
    const organizationId = overrides.organization_id ?? this.organizationId

    return TaskFactory.create({
      organization_id: organizationId,
      project_id: projectId,
      creator_id: creatorId,
      assigned_to: overrides.assigned_to ?? creatorId,
      status,
      task_status_id: taskStatusId,
    })
  }

  public async setTaskStatus(task: Task, statusSlug: string): Promise<Task> {
    const taskStatusId = await this.statusId(statusSlug)
    await task
      .merge({
        status: taskStatusBySlug[statusSlug] ?? TaskStatus.TODO,
        task_status_id: taskStatusId,
      })
      .save()

    return task
  }

  public async createOrgAdmin() {
    const admin = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: this.organizationId,
      user_id: admin.id,
      org_role: 'org_admin',
      status: 'approved',
    })

    return admin
  }

  public async createProjectManager() {
    const manager = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: this.organizationId,
      user_id: manager.id,
      org_role: 'org_member',
      status: 'approved',
    })
    await ProjectMemberFactory.create({
      project_id: this.project.id,
      user_id: manager.id,
      project_role: 'project_manager',
    })

    return manager
  }

  public async createOutsider() {
    return UserFactory.create()
  }

  public async createProject(): Promise<Project> {
    return ProjectFactory.create({
      organization_id: this.organizationId,
      creator_id: this.ownerId,
      owner_id: this.ownerId,
    })
  }

  public async executeStatusChange(
    actorId: string,
    taskId: string,
    statusId: string,
    notification: NotificationCreator = notificationPublicApi
  ): Promise<unknown> {
    const command = new UpdateTaskStatusCommand(ExecutionContext.system(actorId), notification)
    return command.execute(
      new UpdateTaskStatusDTO({
        task_id: taskId,
        task_status_id: statusId,
      })
    )
  }

  public async executeBatchStatusChange(
    actorId: string,
    taskIds: string[],
    statusId: string
  ): Promise<unknown> {
    const command = new BatchUpdateTaskStatusCommand(ExecutionContext.system(actorId))
    return command.execute(taskIds, statusId, this.organizationId)
  }
}
