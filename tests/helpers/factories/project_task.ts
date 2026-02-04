import { DateTime } from 'luxon'

import { testId } from '../test_utils.js'

import { toFactoryDateTime, type FactoryDateValue } from './core.js'
import { OrganizationFactory, UserFactory } from './user_org.js'

import Project from '#infra/projects/models/project'
import ProjectMember from '#infra/projects/models/project_member'
import Task from '#infra/tasks/models/task'
import TaskApplication from '#infra/tasks/models/task_application'
import TaskAssignment from '#infra/tasks/models/task_assignment'
import TaskStatusModel from '#infra/tasks/models/task_status'
import { DEFAULT_TASK_STATUSES, TaskStatusCategory } from '#modules/tasks/constants/task_constants'

const taskStatusCategoryBySlug: Record<string, TaskStatusCategory> = {
  todo: TaskStatusCategory.TODO,
  in_progress: TaskStatusCategory.IN_PROGRESS,
  in_review: TaskStatusCategory.IN_PROGRESS,
  done_dev: TaskStatusCategory.IN_PROGRESS,
  in_testing: TaskStatusCategory.IN_PROGRESS,
  rejected: TaskStatusCategory.IN_PROGRESS,
  done: TaskStatusCategory.DONE,
  cancelled: TaskStatusCategory.CANCELLED,
}

async function ensureTaskStatusId(organizationId: string, statusSlug: string): Promise<string> {
  const existing = await TaskStatusModel.query()
    .where('organization_id', organizationId)
    .where('slug', statusSlug)
    .first()

  if (existing) {
    return existing.id
  }

  const hasAnyStatus =
    (await TaskStatusModel.query().where('organization_id', organizationId).first()) !== null

  if (!hasAnyStatus) {
    await TaskStatusModel.createMany(
      DEFAULT_TASK_STATUSES.map((def) => ({
        organization_id: organizationId,
        name: def.name,
        slug: def.slug,
        category: def.category,
        color: def.color,
        sort_order: def.sort_order,
        is_default: def.is_default,
        is_system: def.is_system,
      }))
    )

    const seeded = await TaskStatusModel.query()
      .where('organization_id', organizationId)
      .where('slug', statusSlug)
      .first()

    if (seeded) {
      return seeded.id
    }
  }

  const customStatus = await TaskStatusModel.create({
    organization_id: organizationId,
    name: statusSlug.toUpperCase(),
    slug: statusSlug,
    category: taskStatusCategoryBySlug[statusSlug] ?? TaskStatusCategory.TODO,
    color: '#6B7280',
    sort_order: 999,
    is_default: statusSlug === 'todo',
    is_system: false,
  })

  return customStatus.id
}

export const ProjectFactory = {
  async create(
    overrides: Partial<{
      id: string
      name: string
      organization_id: string
      creator_id: string
      owner_id: string
      status: string
      visibility: Project['visibility']
      allow_freelancer: boolean
      budget: number
      start_date: FactoryDateValue
      end_date: FactoryDateValue
      deleted_at: FactoryDateValue
      manager_id: string | null
    }> = {}
  ): Promise<Project> {
    const startDate = toFactoryDateTime(overrides.start_date)
    const endDate = toFactoryDateTime(overrides.end_date)
    const deletedAt = toFactoryDateTime(overrides.deleted_at)

    return Project.create({
      id: overrides.id ?? testId(),
      name: overrides.name ?? `Test Project ${Math.random().toString(36).substring(2, 6)}`,
      organization_id: overrides.organization_id ?? testId(),
      creator_id: overrides.creator_id ?? testId(),
      owner_id: overrides.owner_id ?? overrides.creator_id ?? testId(),
      status: overrides.status ?? 'in_progress',
      visibility: overrides.visibility ?? 'team',
      allow_freelancer: overrides.allow_freelancer ?? false,
      budget: overrides.budget ?? 0,
      ...(startDate !== undefined && { start_date: startDate }),
      ...(endDate !== undefined && { end_date: endDate }),
      ...(deletedAt !== undefined && { deleted_at: deletedAt }),
      ...(overrides.manager_id !== undefined && { manager_id: overrides.manager_id }),
    })
  },
}

export const ProjectMemberFactory = {
  async create(
    overrides: Partial<{
      project_id: string
      user_id: string
      project_role: string
    }> = {}
  ): Promise<ProjectMember> {
    return ProjectMember.create({
      project_id: overrides.project_id ?? testId(),
      user_id: overrides.user_id ?? testId(),
      project_role: overrides.project_role ?? 'project_member',
    })
  },
}

export const TaskFactory = {
  async create(
    overrides: Partial<{
      id: string
      title: string
      description: string
      status: string
      label: string
      priority: string
      difficulty: string | null
      organization_id: string
      creator_id: string
      assigned_to: string | null
      project_id: string
      parent_task_id: string | null
      estimated_time: number
      actual_time: number
      task_visibility: string
      application_deadline: FactoryDateValue
      sort_order: number
      due_date: FactoryDateValue
      task_status_id: string | null
    }> = {}
  ): Promise<Task> {
    let creatorId = overrides.creator_id
    if (creatorId === undefined) {
      const creator = await UserFactory.create()
      creatorId = creator.id
    }

    let organizationId = overrides.organization_id
    let projectId = overrides.project_id
    if (projectId !== undefined) {
      const project = await Project.findOrFail(projectId)
      if (organizationId !== undefined && project.organization_id !== organizationId) {
        throw new Error(
          `TaskFactory.create requires project ${projectId} to belong to organization ${organizationId}`
        )
      }
      organizationId = project.organization_id
    }

    if (organizationId === undefined) {
      const organization = await OrganizationFactory.create({ owner_id: creatorId })
      organizationId = organization.id
    }

    if (projectId === undefined) {
      const project = await ProjectFactory.create({
        organization_id: organizationId,
        creator_id: creatorId,
        owner_id: creatorId,
      })
      projectId = project.id
    }

    const statusSlug = overrides.status ?? 'todo'
    const taskStatusId =
      overrides.task_status_id ?? (await ensureTaskStatusId(organizationId, statusSlug))
    const applicationDeadline = toFactoryDateTime(overrides.application_deadline)
    const dueDate = toFactoryDateTime(overrides.due_date)

    return Task.create({
      id: overrides.id ?? testId(),
      title: overrides.title ?? `Test Task ${Math.random().toString(36).substring(2, 6)}`,
      description: overrides.description ?? 'Test task description',
      status: statusSlug,
      label: overrides.label ?? 'feature',
      priority: overrides.priority ?? 'medium',
      difficulty: overrides.difficulty ?? null,
      organization_id: organizationId,
      creator_id: creatorId,
      assigned_to: overrides.assigned_to ?? null,
      project_id: projectId,
      parent_task_id: overrides.parent_task_id ?? null,
      estimated_time: overrides.estimated_time ?? 0,
      actual_time: overrides.actual_time ?? 0,
      task_visibility: overrides.task_visibility ?? 'internal',
      ...(applicationDeadline !== undefined && {
        application_deadline: applicationDeadline,
      }),
      sort_order: overrides.sort_order ?? 0,
      due_date: dueDate === undefined ? DateTime.now().plus({ days: 7 }) : dueDate,
      task_status_id: taskStatusId,
      acceptance_criteria: 'Hoan thanh duoc nghiem thu',
    })
  },
}

export const TaskApplicationFactory = {
  async create(
    overrides: Partial<{
      id: string
      task_id: string
      applicant_id: string
      application_status: 'pending' | 'approved' | 'rejected' | 'withdrawn'
      application_source: 'public_listing' | 'invitation' | 'referral'
      message: string | null
      expected_rate: number | null
      portfolio_links: string[] | null
      rejection_reason: string | null
    }> = {}
  ): Promise<TaskApplication> {
    return TaskApplication.create({
      id: overrides.id ?? testId(),
      task_id: overrides.task_id ?? testId(),
      applicant_id: overrides.applicant_id ?? testId(),
      application_status: overrides.application_status ?? 'pending',
      application_source: overrides.application_source ?? 'public_listing',
      message: overrides.message ?? null,
      expected_rate: overrides.expected_rate ?? null,
      portfolio_links: overrides.portfolio_links ?? null,
      rejection_reason: overrides.rejection_reason ?? null,
    })
  },
}

export const TaskAssignmentFactory = {
  async create(
    overrides: Partial<{
      id: string
      task_id: string
      assignee_id: string
      assigned_by: string
      assignment_type: 'member' | 'freelancer' | 'volunteer'
      assignment_status: 'active' | 'completed' | 'cancelled'
      estimated_hours: number | null
      progress_percentage: number
    }> = {}
  ): Promise<TaskAssignment> {
    return TaskAssignment.create({
      id: overrides.id ?? testId(),
      task_id: overrides.task_id ?? testId(),
      assignee_id: overrides.assignee_id ?? testId(),
      assigned_by: overrides.assigned_by ?? testId(),
      assignment_type: overrides.assignment_type ?? 'member',
      assignment_status: overrides.assignment_status ?? 'active',
      estimated_hours: overrides.estimated_hours ?? null,
      progress_percentage: overrides.progress_percentage ?? 0,
    })
  },
}
