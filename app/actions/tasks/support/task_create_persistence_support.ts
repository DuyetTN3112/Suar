import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import CreateAuditLog from '#actions/audit/create_audit_log'
import type CreateTaskDTO from '#actions/tasks/dtos/request/create_task_dto'
import { buildCreateTaskPersistencePayload } from '#actions/tasks/support/task_create_payload_builder'
import {
  ensureTaskCreationPreconditions,
  resolveTaskStatusForCreation,
} from '#actions/tasks/support/task_create_preconditions'
import { persistTaskRequiredSkills } from '#actions/tasks/support/task_required_skill_persistence'
import { AuditAction, EntityType } from '#constants/audit_constants'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import type Task from '#models/task'
import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'

type TaskRepositoryLike = Pick<typeof TaskRepository, 'create'>
type EnsureTaskCreationPreconditionsFn = typeof ensureTaskCreationPreconditions
type ResolveTaskStatusForCreationFn = typeof resolveTaskStatusForCreation
type PersistTaskRequiredSkillsFn = typeof persistTaskRequiredSkills
type CreateAuditLogFactory = (execCtx: ExecutionContext) => Pick<CreateAuditLog, 'handle'>
type NowFactory = () => DateTime

export interface CreateTaskPersistenceInput {
  execCtx: ExecutionContext
  dto: CreateTaskDTO
  userId: DatabaseId
  trx: TransactionClientContract
}

export interface CreateTaskPersistenceDependencies {
  taskRepository: TaskRepositoryLike
  ensureTaskCreationPreconditions: EnsureTaskCreationPreconditionsFn
  resolveTaskStatusForCreation: ResolveTaskStatusForCreationFn
  persistTaskRequiredSkills: PersistTaskRequiredSkillsFn
  createAuditLogFactory: CreateAuditLogFactory
  getNow: NowFactory
}

const defaultDependencies: CreateTaskPersistenceDependencies = {
  taskRepository: TaskRepository,
  ensureTaskCreationPreconditions,
  resolveTaskStatusForCreation,
  persistTaskRequiredSkills,
  createAuditLogFactory: (execCtx: ExecutionContext) => new CreateAuditLog(execCtx),
  getNow: () => DateTime.now(),
}

export async function persistTaskCreateWithinTransaction(
  input: CreateTaskPersistenceInput,
  dependencies: Partial<CreateTaskPersistenceDependencies> = {}
): Promise<Task> {
  const deps = {
    ...defaultDependencies,
    ...dependencies,
  }

  await deps.ensureTaskCreationPreconditions(input.userId, input.dto, input.trx)
  const selectedStatus = await deps.resolveTaskStatusForCreation(input.dto, input.trx)
  const resolvedDueDate = input.dto.due_date ?? deps.getNow().plus({ days: 7 })

  const task = await deps.taskRepository.create(
    buildCreateTaskPersistencePayload(input.dto, input.userId, selectedStatus, resolvedDueDate),
    input.trx
  )

  await deps.persistTaskRequiredSkills(task.id, input.dto.required_skills, input.trx)
  await deps.createAuditLogFactory(input.execCtx).handle({
    user_id: input.userId,
    action: AuditAction.CREATE,
    entity_type: EntityType.TASK,
    entity_id: task.id,
    new_values: task.toJSON(),
  })

  return task
}
