import GetTaskDetailDTO from '../dtos/request/get_task_detail_dto.js'
import type { TaskQueryRecord } from '../mapper/task_query_output_mapper.js'

import GetTaskDetailQuery from './get_task_detail_query.js'
import GetTaskMetadataQuery from './get_task_metadata_query.js'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canAccessTaskEditPage } from '#modules/tasks/domain/task_permission_policy'

export interface TaskEditPageResult {
  task: TaskQueryRecord
  permissions: {
    isCreator: boolean
    isAssignee: boolean
    canEdit: boolean
    canDelete: boolean
    canAssign: boolean
  }
  metadata: {
    statuses: { value: string; label: string }[]
    labels: { value: string; label: string }[]
    priorities: { value: string; label: string }[]
    users: { id: string; username: string; email: string }[]
    parentTasks: { id: string; title: string; task_status_id: string | null }[]
    projects: { id: string; name: string }[]
  }
}

/**
 * Composite Query: Get Task Edit Page Data
 *
 * Aggregates all data needed to render the task edit form
 * by running GetTaskDetailQuery and GetTaskMetadataQuery in parallel.
 */
export default class GetTaskEditPageQuery {
  constructor(
    protected execCtx: TaskActionContext,
    private taskExternalDependencies: TaskExternalDependencies
  ) {}

  async execute(taskId: string, organizationId: string): Promise<TaskEditPageResult> {
    const dto = GetTaskDetailDTO.createMinimal(taskId)

    const [taskData, metadata] = await Promise.all([
      new GetTaskDetailQuery(this.execCtx, this.taskExternalDependencies).execute(dto),
      new GetTaskMetadataQuery(this.execCtx, this.taskExternalDependencies).execute(organizationId),
    ])

    enforcePolicy(canAccessTaskEditPage({ canEdit: taskData.permissions.canEdit }))

    return {
      task: taskData.task,
      permissions: taskData.permissions,
      metadata,
    }
  }
}
