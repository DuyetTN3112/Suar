import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import type { DatabaseId } from '#types/database'
import type Task from '#models/task'
import GetTaskDetailQuery from './get_task_detail_query.js'
import GetTaskMetadataQuery from './get_task_metadata_query.js'
import GetTaskDetailDTO from '../dtos/request/get_task_detail_dto.js'

export interface TaskEditPageResult {
  task: Task
  taskData: {
    task: Task
    permissions: {
      isCreator: boolean
      isAssignee: boolean
      canEdit: boolean
      canDelete: boolean
      canAssign: boolean
    }
    auditLogs?: unknown[]
  }
  metadata: {
    statuses: Array<{ value: string; label: string }>
    labels: Array<{ value: string; label: string }>
    priorities: Array<{ value: string; label: string }>
    users: Array<{ id: DatabaseId; username: string; email: string }>
    parentTasks: Array<{ id: DatabaseId; title: string; status: string }>
  }
}

/**
 * Composite Query: Get Task Edit Page Data
 *
 * Aggregates all data needed to render the task edit form
 * by running GetTaskDetailQuery and GetTaskMetadataQuery in parallel.
 */
export default class GetTaskEditPageQuery {
  constructor(protected ctx: HttpContext) {}

  async execute(taskId: string, organizationId: string): Promise<TaskEditPageResult> {
    const execCtx = ExecutionContext.fromHttp(this.ctx)
    const dto = GetTaskDetailDTO.createMinimal(taskId)

    const [taskData, metadata] = await Promise.all([
      new GetTaskDetailQuery(execCtx).execute(dto),
      new GetTaskMetadataQuery(execCtx).execute(organizationId),
    ])

    return {
      task: taskData.task,
      taskData,
      metadata,
    }
  }
}
