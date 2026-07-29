import type {
  TaskExternalDependencies,
  TaskOrgReader,
  TaskProjectReader,
  TaskReviewReader,
  TaskUserReader,
} from '../../ports/outbound/task_external_dependencies.js'

import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi, type AuditLogData } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { PolicyResult as PR } from '#modules/authorization/public_contracts/policy_result'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import DependencyUnavailableException from '#modules/errors/public_contracts/dependency_unavailable_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import { synchronizeTaskAssignment } from '#modules/tasks/actions/commands/internal/synchronize_task_assignment'
import { synchronizeTaskAssignmentContractForTask } from '#modules/tasks/actions/commands/internal/synchronize_task_assignment_contract'
import { safeTaskAuthoringAuditValues } from '#modules/tasks/actions/commands/task-authoring/internal/task_authoring_audit_values'
import type UpdateTaskDTO from '#modules/tasks/actions/dtos/request/update_task_dto'
import { hasTaskVersionRelevantChanges } from '#modules/tasks/actions/mappers/task_version_snapshot_mapper'
import type { TaskAuthoringSubject } from '#modules/tasks/actions/ports/outbound/task-authoring/task_authoring_create_coordinator'
import type { TaskLifecycleRepository } from '#modules/tasks/actions/ports/outbound/task_lifecycle_repository'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TaskVersionWriter } from '#modules/tasks/actions/ports/outbound/task_version_writer'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { buildTaskPermissionContext } from '#modules/tasks/actions/task_permission_context'
import { validateDirectTaskAssignee } from '#modules/tasks/domain/task-assignment/task_assignment_rules'
import { canUpdateTaskFields } from '#modules/tasks/domain/task-assignment/task_permission_policy'
import { TaskVisibility } from '#modules/tasks/public_contracts/task_constants'
import type { TaskAuthoringSummaryRecord, TaskRecord } from '#modules/tasks/types/task_records'

export interface TaskUpdateRepositoryPort {
  lockActiveTask(taskId: string, trx: TaskTransaction): Promise<TaskRecord>
  updateTask(
    taskId: string,
    data: Record<string, unknown>,
    trx: TaskTransaction
  ): Promise<TaskRecord>
}

export type TaskVersionRepositoryPort = TaskVersionWriter

type CreateAuditLogFactory = (execCtx: TaskActionContext) => {
  handle(data: AuditLogData, trx: TaskTransaction): Promise<boolean>
}
type BuildTaskPermissionContextFn = typeof buildTaskPermissionContext
type ProjectReaderLike = Pick<TaskProjectReader, 'ensureProjectBelongsToOrganization'>
type OrganizationReaderLike = Pick<TaskOrgReader, 'isApprovedMember'>
type UserReaderLike = Pick<TaskUserReader, 'isExternalContributor'>
type ReviewReaderLike = Pick<TaskReviewReader, 'hasAnyReviewForTask' | 'hasTaskReviewWorkflow'>

interface TaskParentRow {
  id: string
  organization_id: string
  parent_task_id: string | null
}

export interface PersistedTaskUpdate {
  task: TaskRecord
  oldAssignedTo: string | null
  oldValues: Record<string, unknown>
  changes: ReturnType<UpdateTaskDTO['getChangesForAudit']>
}

export interface UpdateTaskPersistenceInput {
  execCtx: TaskActionContext
  taskId: string
  dto: UpdateTaskDTO
  userId: string
  trx: TaskTransaction
  externalDependencies: TaskExternalDependencies
}

export interface UpdateTaskPersistenceDependencies {
  taskRepository?: TaskUpdateRepositoryPort
  projectReader?: ProjectReaderLike
  orgReader?: OrganizationReaderLike
  userReader?: UserReaderLike
  reviewReader?: ReviewReaderLike
  taskVersionRepository?: TaskVersionRepositoryPort
  createAuditLogFactory: CreateAuditLogFactory
  buildTaskPermissionContext: BuildTaskPermissionContextFn
}

const defaultDependencies: UpdateTaskPersistenceDependencies = {
  createAuditLogFactory: (execCtx: TaskActionContext) => ({
    handle: (data: AuditLogData, trx: TaskTransaction) =>
      auditPublicApi.log(data, execCtx, { trx, critical: true }),
  }),
  buildTaskPermissionContext,
}

async function createTaskVersionIfNeeded(
  task: TaskRecord,
  oldValues: Record<string, unknown>,
  changedBy: string,
  trx: TaskTransaction,
  taskVersionRepository: TaskVersionRepositoryPort
): Promise<void> {
  const newValues = { ...task }
  if (!hasTaskVersionRelevantChanges(oldValues, newValues)) return

  await taskVersionRepository.createSnapshot(task.id, oldValues, changedBy, trx)
}

async function findActiveTaskParentRow(
  tasks: TaskLifecycleRepository,
  trx: TaskTransaction,
  taskId: string
): Promise<TaskParentRow | null> {
  return tasks.findActiveParent(taskId, trx)
}

async function ensureParentUpdateBoundary(
  input: UpdateTaskPersistenceInput,
  existingTask: TaskRecord
): Promise<void> {
  if (input.dto.parent_task_id === undefined || input.dto.parent_task_id === null) {
    return
  }

  const requestedParentId = input.dto.parent_task_id

  if (requestedParentId === input.taskId) {
    enforcePolicy(PR.deny('Task cha không được là chính task hiện tại', 'BUSINESS_RULE'))
  }

  const requestedParent = await findActiveTaskParentRow(
    input.externalDependencies.lifecycle,
    input.trx,
    requestedParentId
  )

  if (!requestedParent) {
    enforcePolicy(PR.deny('Task cha không tồn tại', 'BUSINESS_RULE'))
    return
  }

  if (requestedParent.organization_id !== existingTask.organization_id) {
    enforcePolicy(PR.deny('Task cha phải thuộc cùng tổ chức với task con', 'BUSINESS_RULE'))
  }

  const visitedTaskIds = new Set<string>([requestedParentId])
  let ancestorId = requestedParent.parent_task_id

  while (ancestorId) {
    if (ancestorId === input.taskId) {
      enforcePolicy(PR.deny('Không thể tạo vòng lặp phân cấp task', 'BUSINESS_RULE'))
    }

    if (visitedTaskIds.has(ancestorId)) {
      enforcePolicy(PR.deny('Phân cấp task hiện tại đã có vòng lặp', 'BUSINESS_RULE'))
    }

    visitedTaskIds.add(ancestorId)
    const ancestor = await findActiveTaskParentRow(
      input.externalDependencies.lifecycle,
      input.trx,
      ancestorId
    )

    if (!ancestor) {
      break
    }

    if (ancestor.organization_id !== existingTask.organization_id) {
      enforcePolicy(PR.deny('Task cha phải thuộc cùng tổ chức với task con', 'BUSINESS_RULE'))
    }

    ancestorId = ancestor.parent_task_id
  }
}

function ensureUpdateVersionMatches(dto: UpdateTaskDTO, existingTask: TaskRecord): void {
  if (!dto.expected_updated_at) {
    return
  }

  if (!existingTask.updated_at || existingTask.updated_at !== dto.expected_updated_at) {
    throw new ConflictException(
      'Task đã được cập nhật bởi người khác. Vui lòng tải lại trước khi sửa tiếp.'
    )
  }
}

function buildTaskAuthoringSubject(
  dto: UpdateTaskDTO,
  task: TaskRecord
): TaskAuthoringSubject {
  if (!dto.authoring) {
    throw new InvariantViolationException('Task authoring update is missing authoring metadata')
  }
  const projectId = task.project_id
  if (!projectId) {
    throw new InvariantViolationException('Task authoring requires a project-scoped Task')
  }
  const subject = {
    title: task.title,
    description: task.description,
    task_visibility: task.task_visibility ?? TaskVisibility.INTERNAL,
    assigned_to: task.assigned_to,
    organization_id: task.organization_id,
    project_id: projectId,
    authoring: dto.authoring,
  }

  return {
    ...subject,
    toObject: () => ({ ...subject }),
  }
}

export async function persistTaskUpdateWithinTransaction(
  input: UpdateTaskPersistenceInput,
  dependencies: Partial<UpdateTaskPersistenceDependencies> = {}
): Promise<PersistedTaskUpdate> {
  const deps = {
    ...defaultDependencies,
    ...dependencies,
  }
  const projectReader = deps.projectReader ?? input.externalDependencies.project
  const reviewReader = deps.reviewReader ?? input.externalDependencies.review
  const permissionReader = input.externalDependencies.permission
  const taskRepository = deps.taskRepository ?? input.externalDependencies.lifecycle
  const taskVersionRepository =
    deps.taskVersionRepository ?? input.externalDependencies.versions

  // Fetch the task as a plain record (Lucid model stays inside infra)
  const existingTask = await taskRepository.lockActiveTask(
    input.taskId,
    input.trx
  )

  if (existingTask.organization_id !== input.execCtx.organizationId) {
    enforcePolicy(PR.deny('Task không thuộc tổ chức hiện tại'))
  }

  ensureUpdateVersionMatches(input.dto, existingTask)

  // A task contract becomes immutable once work is completed or review has
  // started. Changing it at this point would retroactively alter the facts
  // that reviewers, disputes, and profile scoring rely on. A later revision
  // workflow must create a new version and explicitly reopen review instead.
  const normalizedStatus = existingTask.status.trim().toLowerCase()
  const [hasReviewSession, hasReviewWorkflow] = await Promise.all([
    reviewReader.hasAnyReviewForTask(existingTask.id, input.trx),
    reviewReader.hasTaskReviewWorkflow(existingTask.id, input.trx),
  ])
  if ((normalizedStatus === 'done' || hasReviewSession || hasReviewWorkflow) && !input.dto.hasAuthoringUpdate()) {
    enforcePolicy(
      PR.deny(
        'Không thể sửa trực tiếp task đã hoàn thành hoặc đã vào review. Hãy tạo yêu cầu thay đổi để lưu version mới và đánh giá lại.'
      )
    )
  }

  if (input.dto.project_id !== undefined) {
    await projectReader.ensureProjectBelongsToOrganization(
      input.dto.project_id,
      existingTask.organization_id,
      input.trx
    )
  }

  let sprintDecision: Awaited<ReturnType<TaskExternalDependencies['sprint']['validateAssignment']>> | undefined
  const requestedSprintId = input.dto.project_sprint_id
  if (requestedSprintId !== undefined && requestedSprintId !== existingTask.project_sprint_id) {
    const targetProjectId = input.dto.project_id ?? existingTask.project_id ?? null
    if (targetProjectId === null) {
      enforcePolicy(PR.deny('Sprint phải thuộc một dự án của task', 'BUSINESS_RULE'))
      throw new InvariantViolationException('Sprint project boundary enforcement failed')
    }

    sprintDecision = await input.externalDependencies.sprint.validateAssignment({
      context: input.execCtx,
      organizationId: existingTask.organization_id,
      projectId: targetProjectId,
      sprintId: requestedSprintId,
      transaction: input.trx,
    })
    if (!sprintDecision.allowed) {
      enforcePolicy(PR.deny(sprintDecision.reason ?? 'Task sprint assignment is not allowed', 'BUSINESS_RULE'))
    }
  }

  await ensureParentUpdateBoundary(input, existingTask)

  const candidateAssignedTo = input.dto.assigned_to !== undefined
    ? input.dto.assigned_to
    : existingTask.assigned_to

  if (candidateAssignedTo !== null && candidateAssignedTo !== undefined) {
    const isProjectMember = Boolean(
      existingTask.project_id &&
        (await permissionReader.getProjectRoleName(
          candidateAssignedTo,
          existingTask.project_id,
          input.trx
        ))
    )
    const isActorProjectMember = Boolean(
      existingTask.project_id &&
        (await permissionReader.getProjectRoleName(input.userId, existingTask.project_id, input.trx))
    )
    const incomingReviewerIds = input.dto.authoring?.evidence_contract?.verifierPolicy?.reviewerIds
    const reviewerIds = incomingReviewerIds ?? (existingTask.project_id
      ? await input.externalDependencies.review.listTaskReviewerIds(existingTask.id, input.trx)
      : [])
    let isReviewerProjectMember: boolean | undefined
    if (reviewerIds[0] && existingTask.project_id) {
      isReviewerProjectMember = Boolean(
        await permissionReader.getProjectRoleName(
          reviewerIds[0],
          existingTask.project_id,
          input.trx
        )
      )
    }

    enforcePolicy(
      validateDirectTaskAssignee({
        taskVisibility:
          input.dto.task_visibility ?? existingTask.task_visibility ?? TaskVisibility.INTERNAL,
        isActorProjectMember,
        isAssigneeProjectMember: isProjectMember,
        ...(isReviewerProjectMember === undefined ? {} : { isReviewerProjectMember }),
      })
    )
  }

  const permissionContext = await deps.buildTaskPermissionContext(
    input.userId,
    existingTask,
    input.trx,
    permissionReader,
    input.externalDependencies.activeAssignmentReader
  )
  const fieldsResult = canUpdateTaskFields(permissionContext, input.dto.getUpdatedFields())
  enforcePolicy(fieldsResult)

  const oldValues: Record<string, unknown> = { ...existingTask }
  const oldAssignedTo = existingTask.assigned_to

  const hasTaskRowUpdates = input.dto.getUpdatedFields().length > 0
  // Apply legacy row updates only when a real Task column changed. An immutable authoring
  // version is persisted separately and must not manufacture an updated_by-only write.
  const updatedTask = hasTaskRowUpdates
    ? await taskRepository.updateTask(input.taskId, input.dto.toObject(), input.trx)
    : existingTask

  if (requestedSprintId !== undefined && requestedSprintId !== existingTask.project_sprint_id) {
    await input.externalDependencies.sprint.recordAssignmentTransition({
      organizationId: existingTask.organization_id,
      projectId: input.dto.project_id ?? existingTask.project_id ?? '',
      taskId: input.taskId,
      previousSprintId: existingTask.project_sprint_id ?? null,
      nextSprintId: requestedSprintId,
      entryReason: existingTask.project_sprint_id || sprintDecision?.sprintStatus === 'active'
        ? 'scope_change'
        : 'planned',
      exitReason: requestedSprintId ? 'moved_to_sprint' : 'moved_to_backlog',
      addedAfterStart: sprintDecision?.sprintStatus === 'active',
      actorId: input.userId,
    }, input.trx)
  }

  let authoringSummary: TaskAuthoringSummaryRecord | undefined
  if (input.dto.hasAuthoringUpdate()) {
    const authoring = input.externalDependencies.authoring
    if (!authoring) {
      throw new DependencyUnavailableException('task_authoring', 'persist_version_bundle')
    }
    authoringSummary = await authoring.persistVersion({
      taskId: input.taskId,
      actorId: input.userId,
      dto: buildTaskAuthoringSubject(input.dto, updatedTask),
      trx: input.trx,
    })
  }

  const assigneeToSynchronize =
    input.dto.assigned_to !== undefined
      ? input.dto.assigned_to
      : authoringSummary
        ? updatedTask.assigned_to
        : undefined
  if (assigneeToSynchronize !== undefined) {
    const assignment = await synchronizeTaskAssignment(
      {
        taskId: input.taskId,
        assigneeId: assigneeToSynchronize,
        assignedBy: input.userId,
        taskRowAlreadySynchronized: true,
        enforceSkillEligibility: false,
      },
      input.trx,
      input.externalDependencies.assignments,
      input.externalDependencies.lifecycle,
      input.externalDependencies.skill
    )
    if (assignment) {
      await synchronizeTaskAssignmentContractForTask(
        assignment,
        updatedTask,
        input.trx,
        input.externalDependencies
      )
    }
  }

  const resultTask = authoringSummary
    ? { ...updatedTask, authoring: authoringSummary }
    : updatedTask

  const changes = input.dto.getChangesForAudit(oldValues)
  await deps.createAuditLogFactory(input.execCtx).handle(
    {
      user_id: input.userId,
      action: AuditAction.UPDATE,
      entity_type: EntityType.TASK,
      entity_id: input.taskId,
      old_values: hasTaskRowUpdates
        ? oldValues
        : { authoring: { head_revision: input.dto.authoring?.expected_head_revision ?? null } },
      new_values: authoringSummary
        ? {
            ...(hasTaskRowUpdates ? { ...updatedTask } : {}),
            authoring: safeTaskAuthoringAuditValues(authoringSummary),
          }
        : { ...updatedTask },
    },
    input.trx
  )

  if (hasTaskRowUpdates) {
    await createTaskVersionIfNeeded(
      updatedTask,
      oldValues,
      input.userId,
      input.trx,
      taskVersionRepository
    )
  }

  return {
    task: resultTask,
    oldAssignedTo,
    oldValues,
    changes,
  }
}
