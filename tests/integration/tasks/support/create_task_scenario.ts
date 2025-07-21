import db from '@adonisjs/lucid/services/db'

import CreateNotification from '#actions/common/create_notification'
import CreateTaskCommand from '#actions/tasks/commands/create_task_command'
import { seedDefaultTaskStatuses } from '#actions/tasks/commands/seed_default_task_statuses'
import CreateTaskDTO from '#actions/tasks/dtos/request/create_task_dto'
import type Project from '#models/project'
import type Task from '#models/task'
import TaskStatusModel from '#models/task_status'
import {
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  SkillFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { ExecutionContext } from '#types/execution_context'

type CreatedUser = Awaited<ReturnType<typeof UserFactory.create>>
type CreateTaskScenarioInput = Partial<{
  title: string
  description: string
  task_status_id: string
  organization_id: string
  project_id: string
  required_skill_id: string
  assigned_to: string
  parent_task_id: string
  task_type: string
  acceptance_criteria: string
  verification_method: string
  label: string
  priority: string
}>

interface CreateTaskScenarioContext {
  organizationId: string
  ownerId: string
  project: Project
  todoStatusId: string
  requiredSkillId: string
}

async function seedTaskWorkflow(organizationId: string): Promise<string> {
  const trx = await db.transaction()
  try {
    await seedDefaultTaskStatuses(organizationId, trx)
    await trx.commit()
  } catch (error) {
    await trx.rollback()
    throw error
  }

  const todoStatus = await TaskStatusModel.query()
    .where('organization_id', organizationId)
    .where('slug', 'todo')
    .whereNull('deleted_at')
    .firstOrFail()

  return todoStatus.id
}

export default class CreateTaskScenario {
  public readonly organizationId: string
  public readonly ownerId: string
  public readonly project: Project
  public readonly todoStatusId: string
  public readonly requiredSkillId: string

  private constructor(context: CreateTaskScenarioContext) {
    this.organizationId = context.organizationId
    this.ownerId = context.ownerId
    this.project = context.project
    this.todoStatusId = context.todoStatusId
    this.requiredSkillId = context.requiredSkillId
  }

  public static async build(): Promise<CreateTaskScenario> {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const todoStatusId = await seedTaskWorkflow(org.id)
    const requiredSkill = await SkillFactory.create()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    return new CreateTaskScenario({
      organizationId: org.id,
      ownerId: owner.id,
      project,
      todoStatusId,
      requiredSkillId: requiredSkill.id,
    })
  }

  private buildDto(overrides: CreateTaskScenarioInput = {}): CreateTaskDTO {
    return new CreateTaskDTO({
      title: overrides.title ?? 'Test Task Title',
      description: overrides.description ?? 'Test description',
      task_status_id: overrides.task_status_id ?? this.todoStatusId,
      organization_id: overrides.organization_id ?? this.organizationId,
      project_id: overrides.project_id ?? this.project.id,
      acceptance_criteria: overrides.acceptance_criteria ?? 'Task is accepted when all checks pass',
      required_skills: [
        {
          id: overrides.required_skill_id ?? this.requiredSkillId,
          level: 'middle',
        },
      ],
      assigned_to: overrides.assigned_to,
      parent_task_id: overrides.parent_task_id,
      task_type: overrides.task_type ?? 'feature_development',
      verification_method: overrides.verification_method ?? 'manual_qa',
      label: overrides.label,
      priority: overrides.priority,
    })
  }

  private commandFor(actorId: string): CreateTaskCommand {
    return new CreateTaskCommand(ExecutionContext.system(actorId), new CreateNotification())
  }

  public async create(overrides: CreateTaskScenarioInput = {}): Promise<Task> {
    return this.commandFor(this.ownerId).execute(this.buildDto(overrides))
  }

  public async createAs(actorId: string, overrides: CreateTaskScenarioInput = {}): Promise<Task> {
    return this.commandFor(actorId).execute(this.buildDto(overrides))
  }

  public async createInactiveUser(): Promise<Awaited<ReturnType<typeof UserFactory.create>>> {
    return UserFactory.create({ status: 'inactive' })
  }

  public async createOutsider(): Promise<Awaited<ReturnType<typeof UserFactory.create>>> {
    return UserFactory.create()
  }

  public async createFreelancer(): Promise<Awaited<ReturnType<typeof UserFactory.createFreelancer>>> {
    return UserFactory.createFreelancer()
  }

  public async createSuperadmin(): Promise<CreatedUser> {
    return UserFactory.createSuperadmin()
  }

  public async createInactiveSkill(): Promise<Awaited<ReturnType<typeof SkillFactory.create>>> {
    return SkillFactory.create({ is_active: false })
  }

  public async createProject(): Promise<Project> {
    return ProjectFactory.create({
      organization_id: this.organizationId,
      creator_id: this.ownerId,
      owner_id: this.ownerId,
    })
  }

  public async createOrgMember(
    overrides: Partial<{
      username: string
      email: string
      system_role: string
    }> = {}
  ): Promise<CreatedUser> {
    const member = await UserFactory.create(overrides)
    await OrganizationUserFactory.create({
      organization_id: this.organizationId,
      user_id: member.id,
      org_role: 'org_member',
      status: 'approved',
    })

    return member
  }

  public async createProjectManager(): Promise<CreatedUser> {
    const manager = await this.createOrgMember()
    await ProjectMemberFactory.create({
      project_id: this.project.id,
      user_id: manager.id,
      project_role: 'project_manager',
    })

    return manager
  }

  public async createForeignProject(): Promise<Project> {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    return ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
  }

  public async createForeignParentTask(): Promise<Task> {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    return TaskFactory.create({
      creator_id: owner.id,
      project_id: project.id,
    })
  }
}
