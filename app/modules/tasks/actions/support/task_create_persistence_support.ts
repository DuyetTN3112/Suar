import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi, type AuditLogData } from '#modules/audit/public_contracts/audit_log_writer'
import type CreateTaskDTO from '#modules/tasks/actions/dtos/request/create_task_dto'
import type { TaskCommandRepositoryPort } from '#modules/tasks/actions/ports/task_command_repository_port'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import { buildCreateTaskPersistencePayload } from '#modules/tasks/actions/support/task_create_payload_builder'
import {
  ensureTaskCreationPreconditions,
  resolveTaskStatusForCreation,
} from '#modules/tasks/actions/support/task_create_preconditions'
import { persistTaskRequiredSkills } from '#modules/tasks/actions/support/task_required_skill_persistence'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { taskCommandRepository } from '#modules/tasks/infra/repositories/write/task_command_repository'
import type { TaskRecord } from '#modules/tasks/types/task_records'

type EnsureTaskCreationPreconditionsFn = typeof ensureTaskCreationPreconditions
type ResolveTaskStatusForCreationFn = typeof resolveTaskStatusForCreation
type PersistTaskRequiredSkillsFn = typeof persistTaskRequiredSkills
type CreateAuditLogFactory = (execCtx: TaskActionContext) => {
  handle(data: AuditLogData): Promise<boolean>
}
type NowFactory = () => DateTime

export interface CreateTaskPersistenceInput {
  execCtx: TaskActionContext
  dto: CreateTaskDTO
  userId: string
  trx: TransactionClientContract
  externalDependencies?: TaskExternalDependencies
}

export interface CreateTaskPersistenceDependencies {
  taskRepository: TaskCommandRepositoryPort
  ensureTaskCreationPreconditions: EnsureTaskCreationPreconditionsFn
  resolveTaskStatusForCreation: ResolveTaskStatusForCreationFn
  persistTaskRequiredSkills: PersistTaskRequiredSkillsFn
  createAuditLogFactory: CreateAuditLogFactory
  getNow: NowFactory
}

const defaultDependencies: CreateTaskPersistenceDependencies = {
  taskRepository: taskCommandRepository,
  ensureTaskCreationPreconditions,
  resolveTaskStatusForCreation,
  persistTaskRequiredSkills,
  createAuditLogFactory: (execCtx: TaskActionContext) => ({
    handle: (data: AuditLogData) => auditPublicApi.log(data, execCtx),
  }),
  getNow: () => DateTime.now(),
}

const nullTaskExternalDependencies: TaskExternalDependencies = {
  org: {
    ensureActiveOrganization: () => Promise.resolve(),
    isApprovedMember: () => Promise.resolve(false),
  },
  project: {
    ensureProjectBelongsToOrganization: () => Promise.resolve(),
    listProjectsByOrganization: () => Promise.resolve([]),
  },
  user: {
    ensureActiveUser: () => Promise.resolve(),
    findUserIdentity: () => Promise.resolve(null),
    isFreelancer: () => Promise.resolve(false),
    listUsersByOrganization: () => Promise.resolve([]),
  },
  review: {
    hasAnyReviewForTask: () => Promise.resolve(false),
    hasAnyReviewForTasksWithStatus: () => Promise.resolve(false),
  },
  skill: {
    listActiveSkills: () => Promise.resolve([]),
    listActiveProficiencyLevels: () => Promise.resolve([]),
    findActiveSkillIds: () => Promise.resolve([]),
  },
  permission: {
    getSystemRoleName: () => Promise.resolve(null),
    getOrgRoleName: () => Promise.resolve(null),
    getProjectRoleName: () => Promise.resolve(null),
  },
}

export async function persistTaskCreateWithinTransaction(
  input: CreateTaskPersistenceInput,
  dependencies: Partial<CreateTaskPersistenceDependencies> = {}
): Promise<TaskRecord> {
  const deps = {
    ...defaultDependencies,
    ...dependencies,
  }

  const externalDependencies = input.externalDependencies ?? nullTaskExternalDependencies

  await deps.ensureTaskCreationPreconditions(input.userId, input.dto, input.trx, {
    externalDependencies,
  })
  const selectedStatus = await deps.resolveTaskStatusForCreation(input.dto, input.trx)
  const resolvedDueDate = input.dto.due_date ?? deps.getNow().plus({ days: 7 })

  const result = await deps.taskRepository.create(
    buildCreateTaskPersistencePayload(input.dto, input.userId, selectedStatus, resolvedDueDate),
    input.trx
  )

  await deps.persistTaskRequiredSkills(
    result.task.id,
    input.dto.required_skills,
    input.trx,
    externalDependencies.skill
  )
  await deps.createAuditLogFactory(input.execCtx).handle({
    user_id: input.userId,
    action: AuditAction.CREATE,
    entity_type: EntityType.TASK,
    entity_id: result.task.id,
    new_values: result.auditValues,
  })

  return result.task
}
