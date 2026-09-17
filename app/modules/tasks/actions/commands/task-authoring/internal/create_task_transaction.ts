import { DateTime } from 'luxon'

import {
  assertTaskInheritsBusinessDomains,
  persistTaskRequiredSkills,
} from './task_required_skill_persistence_coordinator.js'

import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi, type AuditLogData } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { PolicyResult as PR } from '#modules/authorization/public_contracts/policy_result'
import DependencyUnavailableException from '#modules/errors/public_contracts/dependency_unavailable_exception'
import { synchronizeTaskAssignment } from '#modules/tasks/actions/commands/internal/synchronize_task_assignment'
import { synchronizeTaskAssignmentContractForTask } from '#modules/tasks/actions/commands/internal/synchronize_task_assignment_contract'
import {
  ensureTaskCreationPreconditions,
  resolveTaskStatusForCreation,
} from '#modules/tasks/actions/commands/task-authoring/internal/create_task_preconditions'
import { safeTaskAuthoringAuditValues } from '#modules/tasks/actions/commands/task-authoring/internal/task_authoring_audit_values'
import type CreateTaskDTO from '#modules/tasks/actions/dtos/request/task-authoring/create_task_dto'
import { buildCreateTaskPersistencePayload } from '#modules/tasks/actions/mappers/task-authoring/task_create_persistence_mapper'
import type { TaskCommandRepositoryPort } from '#modules/tasks/actions/ports/outbound/task_command_repository_port'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canCreateTaskInStatus } from '#modules/tasks/domain/task-status/task_status_rules'
import type { TaskAuthoringSummaryRecord, TaskRecord } from '#modules/tasks/types/task_records'

// Re-export required skill persistence functions for backward compatibility
export {
  assertRequiredSkillsPresent,
  findInvalidRequiredSkill,
  persistTaskRequiredSkills,
} from './task_required_skill_persistence_coordinator.js'

type EnsureTaskCreationPreconditionsFn = typeof ensureTaskCreationPreconditions
type ResolveTaskStatusForCreationFn = typeof resolveTaskStatusForCreation
type PersistTaskRequiredSkillsFn = typeof persistTaskRequiredSkills
type CreateAuditLogFactory = (execCtx: TaskActionContext) => {
  handle(data: AuditLogData, trx: TaskTransaction): Promise<boolean>
}
type NowFactory = () => DateTime

export interface CreateTaskPersistenceInput {
  execCtx: TaskActionContext
  dto: CreateTaskDTO
  userId: string
  trx: TaskTransaction
  externalDependencies: TaskExternalDependencies
}

export interface CreateTaskPersistenceDependencies {
  taskRepository?: TaskCommandRepositoryPort
  ensureTaskCreationPreconditions: EnsureTaskCreationPreconditionsFn
  resolveTaskStatusForCreation: ResolveTaskStatusForCreationFn
  persistTaskRequiredSkills: PersistTaskRequiredSkillsFn
  createAuditLogFactory: CreateAuditLogFactory
  getNow: NowFactory
}

const defaultDependencies: CreateTaskPersistenceDependencies = {
  ensureTaskCreationPreconditions,
  resolveTaskStatusForCreation,
  persistTaskRequiredSkills,
  createAuditLogFactory: (execCtx: TaskActionContext) => ({
    handle: (data: AuditLogData, trx: TaskTransaction) =>
      auditPublicApi.log(data, execCtx, { trx, critical: true }),
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

  const externalDependencies = input.externalDependencies
  const requiredSkillPersistence = externalDependencies.requiredSkillPersistence
  const taskIdentityRepository = externalDependencies.taskIdentityRepository
  const taskStatusRepository = externalDependencies.taskStatusRepository
  if (!requiredSkillPersistence || !taskIdentityRepository || !taskStatusRepository) {
    throw new DependencyUnavailableException('task_creation_persistence', 'resolve_capabilities')
  }

  await deps.ensureTaskCreationPreconditions(input.userId, input.dto, input.trx, {
    externalDependencies,
    taskRepository: taskIdentityRepository,
    taskStatusRepository,
  })
  assertTaskInheritsBusinessDomains(input.dto)
  const projectBusinessDomains = await externalDependencies.project.findProjectBusinessDomains(
    input.dto.project_id,
    input.trx
  )
  const selectedStatus = await deps.resolveTaskStatusForCreation(input.dto, input.trx, {
    taskStatusRepository,
  })
  const requestedAuthoringIntent = input.dto.authoring.intent
  const authoringIntent =
    input.dto.authoring.explicit &&
    (requestedAuthoringIntent === 'publish' || requestedAuthoringIntent === 'save_draft')
      ? requestedAuthoringIntent
      : undefined
  const taskCreationStatusContext = {
    ...(input.dto.assigned_to === undefined ? {} : { assigneeId: input.dto.assigned_to }),
    ...(authoringIntent ? { authoringIntent } : {}),
  }
  enforcePolicy(canCreateTaskInStatus(selectedStatus, taskCreationStatusContext))
  const resolvedDueDate = input.dto.due_date ?? deps.getNow().plus({ days: 7 })

  const sprintDecision = input.dto.project_sprint_id
    ? await externalDependencies.sprint.validateAssignment({
        context: input.execCtx,
        organizationId: input.dto.organization_id,
        projectId: input.dto.project_id,
        sprintId: input.dto.project_sprint_id,
        transaction: input.trx,
      })
    : { allowed: true as const }
  if (!sprintDecision.allowed) {
    enforcePolicy(PR.deny(sprintDecision.reason ?? 'Task sprint assignment is not allowed', 'BUSINESS_RULE'))
  }

  const result = await (deps.taskRepository ?? externalDependencies.taskCommands).create(
    buildCreateTaskPersistencePayload(
      input.dto,
      input.userId,
      selectedStatus,
      resolvedDueDate,
      projectBusinessDomains
    ),
    input.trx
  )

  const isDraftCreation = authoringIntent === 'save_draft'
  if (!isDraftCreation || input.dto.required_skills.length > 0) {
    await deps.persistTaskRequiredSkills(
      result.task.id,
      input.dto.project_id,
      input.dto.required_skills,
      input.trx,
      externalDependencies.skill,
      requiredSkillPersistence.resolver,
      requiredSkillPersistence.writer
    )
  }

  let authoringSummary: TaskAuthoringSummaryRecord | undefined
  if (input.dto.authoring.explicit) {
    if (!externalDependencies.authoring) {
      throw new DependencyUnavailableException('task_authoring', 'persist_initial_bundle')
    }
    authoringSummary = await externalDependencies.authoring.persistInitial({
      taskId: result.task.id,
      actorId: input.userId,
      dto: input.dto,
      trx: input.trx,
    })
  }

  if (input.dto.assigned_to !== undefined) {
    const assignment = await synchronizeTaskAssignment(
      {
        taskId: result.task.id,
        assigneeId: input.dto.assigned_to,
        assignedBy: input.userId,
        taskRowAlreadySynchronized: true,
        enforceSkillEligibility: false,
      },
      input.trx,
      externalDependencies.assignments,
      externalDependencies.lifecycle,
      externalDependencies.skill
    )
    if (assignment) {
      await synchronizeTaskAssignmentContractForTask(
        assignment,
        result.task,
        input.trx,
        externalDependencies
      )
    }
  }

  if (input.dto.project_sprint_id) {
    await externalDependencies.sprint.recordInitialAssignment(
      {
        organizationId: input.dto.organization_id,
        projectId: input.dto.project_id,
        taskId: result.task.id,
        sprintId: input.dto.project_sprint_id,
        entryReason:
          sprintDecision.sprintStatus === 'active' ? 'scope_change' : 'planned',
        addedAfterStart: sprintDecision.sprintStatus === 'active',
        actorId: input.userId,
      },
      input.trx
    )
  }

  const auditLogger = deps.createAuditLogFactory(input.execCtx)
  await auditLogger.handle(
    {
      user_id: input.userId,
      action: AuditAction.CREATE,
      entity_type: EntityType.TASK,
      entity_id: result.task.id,
      new_values: authoringSummary
        ? { ...result.auditValues, authoring: safeTaskAuthoringAuditValues(authoringSummary) }
        : result.auditValues,
    },
    input.trx
  )

  return authoringSummary ? { ...result.task, authoring: authoringSummary } : result.task
}
