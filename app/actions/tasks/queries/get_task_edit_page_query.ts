import GetTaskDetailDTO from '../dtos/request/get_task_detail_dto.js'
import type { TaskQueryRecord } from '../mapper/task_query_output_mapper.js'

import GetTaskDetailQuery from './get_task_detail_query.js'
import GetTaskMetadataQuery from './get_task_metadata_query.js'

import { enforcePolicy } from '#actions/authorization/public_api'
import { canAccessTaskEditPage } from '#modules/tasks/domain/task_permission_policy'
import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'

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
    users: { id: DatabaseId; username: string; email: string }[]
    parentTasks: { id: DatabaseId; title: string; task_status_id: string | null }[]
    projects: { id: DatabaseId; name: string }[]
  }
}

/**
 * Composite Query: Get Task Edit Page Data
 *
 * Aggregates all data needed to render the task edit form
 * by running GetTaskDetailQuery and GetTaskMetadataQuery in parallel.
 */
export default class GetTaskEditPageQuery {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(taskId: string, organizationId: string): Promise<TaskEditPageResult> {
    const dto = GetTaskDetailDTO.createMinimal(taskId)

    const [taskData, metadata] = await Promise.all([
      new GetTaskDetailQuery(this.execCtx).execute(dto),
      new GetTaskMetadataQuery(this.execCtx).execute(organizationId),
    ])

    enforcePolicy(canAccessTaskEditPage({ canEdit: taskData.permissions.canEdit }))

    return {
      task: taskData.task,
      permissions: taskData.permissions,
      metadata,
    }
  }
}
