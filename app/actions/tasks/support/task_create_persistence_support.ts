import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import { auditPublicApi, type AuditLogData } from '#actions/audit/public_api'
import type CreateTaskDTO from '#actions/tasks/dtos/request/create_task_dto'
import type { TaskCommandRepositoryPort } from '#actions/tasks/ports/task_command_repository_port'
import { buildCreateTaskPersistencePayload } from '#actions/tasks/support/task_create_payload_builder'
import {
  ensureTaskCreationPreconditions,
  resolveTaskStatusForCreation,
} from '#actions/tasks/support/task_create_preconditions'
import { persistTaskRequiredSkills } from '#actions/tasks/support/task_required_skill_persistence'
import { AuditAction, EntityType } from '#constants/audit_constants'
import { taskCommandRepository } from '#infra/tasks/repositories/write/task_command_repository'
import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'
import type { TaskRecord } from '#types/task_records'

type EnsureTaskCreationPreconditionsFn = typeof ensureTaskCreationPreconditions
type ResolveTaskStatusForCreationFn = typeof resolveTaskStatusForCreation
type PersistTaskRequiredSkillsFn = typeof persistTaskRequiredSkills
type CreateAuditLogFactory = (execCtx: ExecutionContext) => {
  handle(data: AuditLogData): Promise<boolean>
}
type NowFactory = () => DateTime

export interface CreateTaskPersistenceInput {
  execCtx: ExecutionContext
  dto: CreateTaskDTO
  userId: DatabaseId
  trx: TransactionClientContract
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
  createAuditLogFactory: (execCtx: ExecutionContext) => ({
    handle: (data: AuditLogData) => auditPublicApi.log(data, execCtx),
  }),
  getNow: () => DateTime.now(),
}

export async function persistTaskCreateWithinTransaction(
  input: CreateTaskPersistenceInput,
  dependencies: Partial<CreateTaskPersistenceDependencies> = {}
): Promise<TaskRecord> {
  const deps = {
    ...defaultDependencies,
    ...dependencies,
  }

  await deps.ensureTaskCreationPreconditions(input.userId, input.dto, input.trx)
  const selectedStatus = await deps.resolveTaskStatusForCreation(input.dto, input.trx)
  const resolvedDueDate = input.dto.due_date ?? deps.getNow().plus({ days: 7 })

  const result = await deps.taskRepository.create(
    buildCreateTaskPersistencePayload(input.dto, input.userId, selectedStatus, resolvedDueDate),
    input.trx
  )

  await deps.persistTaskRequiredSkills(result.task.id, input.dto.required_skills, input.trx)
  await deps.createAuditLogFactory(input.execCtx).handle({
    user_id: input.userId,
    action: AuditAction.CREATE,
    entity_type: EntityType.TASK,
    entity_id: result.task.id,
    new_values: result.auditValues,
  })

  return result.task
}
