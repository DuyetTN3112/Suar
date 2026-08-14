import db from '@adonisjs/lucid/services/db'

import { notificationApplication as notificationPublicApi } from '#composition/notifications/notification-feed/notification_composition'
import { taskExternalDeps } from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import type Project from '#modules/projects/infra/models/project-context/project'
import ProjectSkill from '#modules/skills/infra/models/project-skills/project_skill'
import CreateTaskCommand from '#modules/tasks/actions/commands/task-authoring/create_task_command'
import { seedDefaultTaskStatuses } from '#modules/tasks/actions/commands/task-status/seed_default_task_statuses'
import type { CreateTaskAuthoringInput } from '#modules/tasks/actions/dtos/request/task-authoring/create_task_authoring'
import CreateTaskDTO from '#modules/tasks/actions/dtos/request/task-authoring/create_task_dto'
import type { TaskNotificationStager as NotificationStager } from '#modules/tasks/actions/ports/outbound/task_notification_stager'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import { InProcessTaskEventPublisher } from '#modules/tasks/infra/adapters/task-authoring/in_process_task_event_publisher'
import { TaskCacheInvalidator } from '#modules/tasks/infra/adapters/task-authoring/task_cache_invalidator'
import type Task from '#modules/tasks/infra/models/task-authoring/task'
import TaskStatusModel from '#modules/tasks/infra/models/task-status/task_status'
import type { TaskDetailRecord } from '#modules/tasks/types/task_records'
import {
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  SkillFactory,
  TaskFactory,
  UserFactory,
  UserSkillFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

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


type CreatedUser = Awaited<ReturnType<typeof UserFactory.create>>
const taskEvents = new InProcessTaskEventPublisher()
type CreateTaskScenarioInput = Partial<{
  title: string
  description: string
  task_status_id: string
  organization_id: string
  project_id: string
  project_sprint_id: string
  required_skill_id: string
  required_skill_ids: string[]
  assigned_to: string
  parent_task_id: string
  due_date: string
  task_type: string
  task_visibility: string
  acceptance_criteria: string
  verification_method: string
  label: string
  priority: string
  authoring: CreateTaskAuthoringInput
}>

interface CreateTaskScenarioContext {
  organizationId: string
  ownerId: string
  project: Project
  todoStatusId: string
  requiredSkillId: string
  requiredSkillIds: string[]
  projectSkillIdBySkillId: Readonly<Record<string, string>>
}

async function seedTaskWorkflow(organizationId: string, projectId: string): Promise<string> {
  const trx = await db.transaction()
  try {
    await seedDefaultTaskStatuses(organizationId, trx, taskExternalDeps.lifecycle, projectId)
    await trx.commit()
  } catch (error) {
    await trx.rollback()
    throw error
  }

  const todoStatus = await TaskStatusModel.query()
    .where('organization_id', organizationId)
    .where('project_id', projectId)
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
  public readonly requiredSkillIds: string[]
  public readonly projectSkillIdBySkillId: Readonly<Record<string, string>>

  private constructor(context: CreateTaskScenarioContext) {
    this.organizationId = context.organizationId
    this.ownerId = context.ownerId
    this.project = context.project
    this.todoStatusId = context.todoStatusId
    this.requiredSkillId = context.requiredSkillId
    this.requiredSkillIds = context.requiredSkillIds
    this.projectSkillIdBySkillId = context.projectSkillIdBySkillId
  }

  public static async build(): Promise<CreateTaskScenario> {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const requiredSkills = await Promise.all([
      SkillFactory.create({ category_code: 'technology' }),
      SkillFactory.create({ category_code: 'engineering' }),
      SkillFactory.create({ category_code: 'soft_skill' }),
      SkillFactory.create({ category_code: 'delivery' }),
    ])
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const levelRows = (await db
      .from('proficiency_levels')
      .whereIn('code', ['l0', 'l14'])
      .select('id', 'code')) as Array<{ id: string; code: string }>
    const levelIdByCode = new Map(levelRows.map((level) => [level.code, level.id]))
    const minimumTaskRequirementLevelId = levelIdByCode.get('l0')
    const maximumTaskRequirementLevelId = levelIdByCode.get('l14')
    if (!minimumTaskRequirementLevelId || !maximumTaskRequirementLevelId) {
      throw new Error('The test proficiency catalog must include L0 and L14')
    }
    const projectSkillIds = await Promise.all(
      requiredSkills.map(async (skill) => {
        const projectSkill = await ProjectSkill.create({
          id: testId(),
          project_id: project.id,
          skill_id: skill.id,
          display_name_override: null,
          description_override: null,
          rubric_version_id: null,
          minimum_task_requirement_level_id: minimumTaskRequirementLevelId,
          maximum_task_requirement_level_id: maximumTaskRequirementLevelId,
          is_active: true,
          is_selectable_for_tasks: true,
          is_visible_in_project: true,
          added_by: owner.id,
        })
        return [skill.id, projectSkill.id] as const
      })
    )
    const todoStatusId = await seedTaskWorkflow(org.id, project.id)

    return new CreateTaskScenario({
      organizationId: org.id,
      ownerId: owner.id,
      project,
      todoStatusId,
      requiredSkillId: requiredSkills[0].id,
      requiredSkillIds: requiredSkills.map((skill) => skill.id),
      projectSkillIdBySkillId: Object.fromEntries(projectSkillIds),
    })
  }

  private buildDto(overrides: CreateTaskScenarioInput = {}): CreateTaskDTO {
    const requiredSkillIds = overrides.required_skill_ids
      ?? (overrides.required_skill_id ? [overrides.required_skill_id] : this.requiredSkillIds)

    return new CreateTaskDTO(omitUndefined({
      title: overrides.title ?? 'Test Task Title',
      description: overrides.description ?? 'Test description',
      task_status_id: overrides.task_status_id ?? this.todoStatusId,
      organization_id: overrides.organization_id ?? this.organizationId,
      project_id: overrides.project_id ?? this.project.id,
      project_sprint_id: overrides.project_sprint_id,
      acceptance_criteria: overrides.acceptance_criteria ?? 'Task is accepted when all checks pass',
      required_skills: requiredSkillIds.map((skillId) => ({
          id: skillId,
          level: 'l7',
          project_skill_id: this.projectSkillIdBySkillId[skillId],
        })),
      assigned_to: overrides.assigned_to,
      due_date: overrides.due_date,
      parent_task_id: overrides.parent_task_id,
      task_type: overrides.task_type ?? 'feature_development',
      task_visibility: overrides.task_visibility,
      verification_method: overrides.verification_method ?? 'manual_qa',
      label: overrides.label,
      priority: overrides.priority,
      authoring: overrides.authoring,
    }))
  }

  private commandFor(
    actorId: string,
    notificationStager: NotificationStager = notificationPublicApi
  ): CreateTaskCommand {
    return new CreateTaskCommand(
      makeSystemTaskActionContext(actorId),
      taskExternalDeps,
      notificationStager,
      new TaskCacheInvalidator(),
      taskEvents
    )
  }

  private async prepareDefaultAssigneeEligibility(
    assigneeId: string | undefined,
    overrides: CreateTaskScenarioInput
  ): Promise<void> {
    if (!assigneeId) return
    const assignee = await db.from('users').where('id', assigneeId).select('id').first()
    if (!assignee) return

    const requiredSkillIds =
      overrides.required_skill_ids ??
      (overrides.required_skill_id ? [overrides.required_skill_id] : this.requiredSkillIds)
    for (const skillId of requiredSkillIds) {
      // Only the Project skills seeded by this scenario receive the default
      // reviewed level. Unknown/explicitly invalid skills must still reach the
      // production validation path the individual test is exercising.
      if (!this.projectSkillIdBySkillId[skillId]) continue
      const existing = await db
        .from('user_skills')
        .where('user_id', assigneeId)
        .where('skill_id', skillId)
        .first()
      if (existing) continue
      await UserSkillFactory.create({
        user_id: assigneeId,
        skill_id: skillId,
        verified_public_proficiency_code: 'l7',
        source: 'reviewed',
      })
    }
  }

  public async create(overrides: CreateTaskScenarioInput = {}): Promise<TaskDetailRecord> {
    await this.prepareDefaultAssigneeEligibility(overrides.assigned_to, overrides)
    return this.commandFor(this.ownerId).execute(this.buildDto(overrides))
  }

  public async createWithNotificationStager(
    overrides: CreateTaskScenarioInput,
    notificationStager: NotificationStager
  ): Promise<TaskDetailRecord> {
    await this.prepareDefaultAssigneeEligibility(overrides.assigned_to, overrides)
    return this.commandFor(this.ownerId, notificationStager).execute(this.buildDto(overrides))
  }

  public async createAs(
    actorId: string,
    overrides: CreateTaskScenarioInput = {}
  ): Promise<TaskDetailRecord> {
    await this.prepareDefaultAssigneeEligibility(overrides.assigned_to, overrides)
    return this.commandFor(actorId).execute(this.buildDto(overrides))
  }

  public async createInactiveUser(): Promise<Awaited<ReturnType<typeof UserFactory.create>>> {
    return UserFactory.create({ status: 'inactive' })
  }

  public async createOutsider(): Promise<Awaited<ReturnType<typeof UserFactory.create>>> {
    return UserFactory.create()
  }

  public async createExternalContributor(): Promise<
    Awaited<ReturnType<typeof UserFactory.createExternalContributor>>
  > {
    return UserFactory.createExternalContributor()
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
