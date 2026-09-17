import type AssignTaskDTO from '../../dtos/request/assign_task_dto.js'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import { buildTaskPermissionContext } from '#modules/tasks/actions/task_permission_context'
import { validateDirectTaskAssignee } from '#modules/tasks/domain/task-assignment/task_assignment_rules'
import { canAssignTask } from '#modules/tasks/domain/task-assignment/task_permission_policy'
import type { TaskRecord } from '#modules/tasks/types/task_records'

export async function ensureAssignmentPreconditions(
  userId: string,
  dto: AssignTaskDTO,
  task: TaskRecord,
  deps: TaskExternalDependencies,
  trx: TaskTransaction
): Promise<void> {
  const permissionContext = await buildTaskPermissionContext(
    userId,
    task,
    trx,
    deps.permission,
    deps.activeAssignmentReader
  )
  enforcePolicy(canAssignTask(permissionContext))

  if (!dto.isAssigning() || dto.assigned_to === null) {
    return
  }

  const assignee = await deps.user.findUserIdentity(dto.assigned_to, trx)
  if (!assignee) {
    throw new NotFoundException('Người được giao không tồn tại')
  }

  const isProjectMember = Boolean(
    task.project_id &&
      (await deps.permission.getProjectRoleName(
        dto.assigned_to,
        task.project_id,
        trx
      ))
  )
  const isActorProjectMember = Boolean(
    task.project_id &&
      (await deps.permission.getProjectRoleName(
        userId,
        task.project_id,
        trx
      ))
  )
  const reviewerIds = task.project_id
    ? await deps.review.listTaskReviewerIds(task.id, trx)
    : []
  let isReviewerProjectMember: boolean | undefined
  if (reviewerIds[0] && task.project_id) {
    isReviewerProjectMember = Boolean(
      await deps.permission.getProjectRoleName(
        reviewerIds[0],
        task.project_id,
        trx
      )
    )
  }

  enforcePolicy(
    validateDirectTaskAssignee({
      taskVisibility: task.task_visibility ?? 'public',
      isActorProjectMember,
      isAssigneeProjectMember: isProjectMember,
      ...(isReviewerProjectMember === undefined ? {} : { isReviewerProjectMember }),
    })
  )
}
