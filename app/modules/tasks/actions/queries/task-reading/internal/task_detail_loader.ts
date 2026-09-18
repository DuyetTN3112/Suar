import type GetTaskDetailDTO from '../../../dtos/request/get_task_detail_dto.js'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import {
  collectTaskUserIdentityIds,
  mapTaskDetailUserProjections,
} from '#modules/tasks/actions/mappers/task-reading/task_user_projection_mapper'
import type {
  TaskExternalDependencies,
  TaskReviewZoneSummary,
} from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskSprintSummary as TaskProjectSprintSummary } from '#modules/tasks/actions/ports/outbound/task_sprint_reader'
import type { TaskDetailRecord, TaskDetailRelation } from '#modules/tasks/types/task_records'

export function getOptionalRelations(dto: GetTaskDetailDTO): TaskDetailRelation[] {
  const relations: TaskDetailRelation[] = []

  if (dto.shouldLoadChildTasks()) {
    relations.push('childTasks')
  }

  if (dto.shouldLoadVersions()) {
    relations.push('versions')
  }

  return relations
}

export async function loadTaskDetailWithIdentities(
  taskId: string,
  optionalRelations: TaskDetailRelation[],
  deps: TaskExternalDependencies
): Promise<TaskDetailRecord> {
  const taskRecord = await deps.lifecycle.findTaskDetail(
    taskId,
    undefined,
    optionalRelations
  )
  const identityIds = collectTaskUserIdentityIds([taskRecord], true)
  const identities =
    identityIds.length > 0
      ? await deps.user.findUserIdentities(identityIds)
      : []
  const [task] = mapTaskDetailUserProjections([taskRecord], identities)
  if (!task) {
    throw new InvariantViolationException(`Task ${taskId} identity projection is unavailable`)
  }
  const [organization] =
    await deps.org.findOrganizationSummaries([task.organization_id])
  const [project] = task.project_id
    ? await deps.project.findProjectSummaries([task.project_id])
    : []

  const projectPayload = project
    ? {
        id: project.id,
        name: project.name,
        ...(project.visibility ? { visibility: project.visibility } : {}),
        ...(typeof project.allowExternalContributors === 'boolean'
          ? { allow_external_contributors: project.allowExternalContributors }
          : {}),
      }
    : null

  return {
    ...task,
    organization: organization
      ? {
          id: organization.id,
          name: organization.name,
          logo: organization.logo,
        }
      : null,
    project: projectPayload,
  }
}

export async function loadTaskAuditLogs(
  dto: GetTaskDetailDTO,
  taskId: string,
  deps: TaskExternalDependencies
): Promise<unknown[] | undefined> {
  if (!dto.shouldLoadAuditLogs()) {
    return undefined
  }

  return deps.audit.listTaskAuditTrail(taskId, dto.audit_logs_limit)
}

export async function getReviewZoneSummary(
  taskId: string,
  deps: TaskExternalDependencies
): Promise<TaskReviewZoneSummary | undefined> {
  return (
    (await deps.review.getTaskReviewZoneSummary(taskId)) ??
    undefined
  )
}

export async function getTaskReviewWorkflowDetail(
  taskId: string,
  deps: TaskExternalDependencies
): Promise<Record<string, unknown> | null> {
  const detail = await deps.review.getTaskReviewDetail(taskId)
  if (!canShowTaskReviewWorkflow(detail)) {
    return null
  }

  return detail
}

function canShowTaskReviewWorkflow(detail: Record<string, unknown> | null): boolean {
  if (!detail) {
    return false
  }

  if (detail['workflow']) {
    return true
  }

  const task = detail['task'] as Record<string, unknown> | undefined
  const status = typeof task?.['status'] === 'string' ? task['status'] : ''
  return status === 'done' || status === 'in_review'
}

export async function getProjectSprintSummary(
  task: { id?: unknown; project_sprint_id?: unknown; project_id?: unknown },
  deps: TaskExternalDependencies
): Promise<TaskProjectSprintSummary | null> {
  const taskId = typeof task['id'] === 'string' ? task['id'] : null

  if (!taskId) {
    return null
  }

  const sprintId =
    typeof task['project_sprint_id'] === 'string'
      ? task['project_sprint_id']
      : null
  const projectId =
    typeof task['project_id'] === 'string' ? task['project_id'] : null
  if (!sprintId || !projectId) {
    return null
  }

  return deps.sprint.findSprint(projectId, sprintId)
}
