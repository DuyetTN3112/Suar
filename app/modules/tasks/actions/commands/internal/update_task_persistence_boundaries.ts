import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { PolicyResult as PR } from '#modules/authorization/public_contracts/policy_result'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type UpdateTaskDTO from '#modules/tasks/actions/dtos/request/update_task_dto'
import { hasTaskVersionRelevantChanges } from '#modules/tasks/actions/mappers/task_version_snapshot_mapper'
import type { TaskAuthoringSubject } from '#modules/tasks/actions/ports/outbound/task-authoring/task_authoring_create_coordinator'
import type { TaskLifecycleRepository } from '#modules/tasks/actions/ports/outbound/task_lifecycle_repository'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TaskVersionWriter } from '#modules/tasks/actions/ports/outbound/task_version_writer'
import { TaskVisibility } from '#modules/tasks/public_contracts/task_constants'
import type { TaskRecord } from '#modules/tasks/types/task_records'

export interface TaskParentRow {
  id: string
  organization_id: string
  parent_task_id: string | null
}

export async function createTaskVersionIfNeeded(
  task: TaskRecord,
  oldValues: Record<string, unknown>,
  changedBy: string,
  trx: TaskTransaction,
  taskVersionRepository: TaskVersionWriter
): Promise<void> {
  const newValues = { ...task }
  if (!hasTaskVersionRelevantChanges(oldValues, newValues)) return

  await taskVersionRepository.createSnapshot(task.id, oldValues, changedBy, trx)
}

export async function findActiveTaskParentRow(
  tasks: TaskLifecycleRepository,
  trx: TaskTransaction,
  taskId: string
): Promise<TaskParentRow | null> {
  return tasks.findActiveParent(taskId, trx)
}

export async function ensureParentUpdateBoundary(
  input: {
    dto: UpdateTaskDTO
    taskId: string
    trx: TaskTransaction
    externalDependencies: {
      lifecycle: TaskLifecycleRepository
    }
  },
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

export function ensureUpdateVersionMatches(dto: UpdateTaskDTO, existingTask: TaskRecord): void {
  if (!dto.expected_updated_at) {
    return
  }

  if (!existingTask.updated_at || existingTask.updated_at !== dto.expected_updated_at) {
    throw new ConflictException(
      'Task đã được cập nhật bởi người khác. Vui lòng tải lại trước khi sửa tiếp.'
    )
  }
}

export function buildTaskAuthoringSubject(
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
