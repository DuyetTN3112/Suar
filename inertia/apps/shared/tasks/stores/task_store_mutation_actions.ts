import axios from 'axios'

import type { TaskDetail, TaskStatus } from '@/apps/user/modules/tasks/types/index.svelte'

import type { TaskStoreDependencies } from '../task_store_types'

export function isTaskDebugEnabled(): boolean {
  if (import.meta.env.DEV) return true
  if (typeof window === 'undefined') return false

  return window.localStorage.getItem('tasks:kanban:debug') === '1'
}

export function debugTaskStore(message: string, payload?: Record<string, unknown>) {
  if (!isTaskDebugEnabled()) return

  console.warn(`[TaskStore] ${message}`, payload ?? {})
}

export interface TaskMutationContext<TTask extends TaskDetail> {
  getTaskById: (id: string) => TTask | undefined
  getTasksMap: () => Record<string, TTask>
  setTasksMap: (map: Record<string, TTask>) => void
  beginOptimistic: () => void
  endOptimistic: () => void
  setTaskMutating: (taskId: string, mutating: boolean) => void
  isTaskMutating: (taskId: string) => boolean
  fetchGroupedTasks: () => Promise<void>
  normalizeTaskMutationError: TaskStoreDependencies['normalizeTaskMutationError']
  notificationStore: TaskStoreDependencies['notificationStore']
  translate: TaskStoreDependencies['translate']
}

export async function executeMoveTaskStatus<TTask extends TaskDetail>(
  ctx: TaskMutationContext<TTask>,
  taskId: string,
  newStatusId: TaskStatus,
  newSortOrder?: number
): Promise<void> {
  const task = ctx.getTaskById(taskId)
  if (!task) {
    debugTaskStore('moveTaskStatus ignored: task not found', { taskId, newStatusId })
    return
  }
  if (ctx.isTaskMutating(taskId)) {
    debugTaskStore('moveTaskStatus ignored: task mutating', { taskId, newStatusId })
    ctx.notificationStore.info(
      ctx.translate('task.workflow.board_sync_title', {}, 'Board is syncing'),
      ctx.translate(
        'task.workflow.current_operation_wait_message',
        {},
        'Please wait for the current operation to finish.'
      )
    )
    return
  }

  debugTaskStore('moveTaskStatus started', {
    taskId,
    fromStatus: task.status,
    fromTaskStatusId: task.task_status_id,
    newStatusId,
    newSortOrder,
  })

  ctx.beginOptimistic()
  ctx.setTaskMutating(taskId, true)

  const prevStatus = task.status
  const prevTaskStatusId = task.task_status_id
  const prevSortOrder = task.sort_order
  const currentMap = ctx.getTasksMap()

  ctx.setTasksMap({
    ...currentMap,
    [taskId]: {
      ...task,
      task_status_id: newStatusId,
      sort_order: newSortOrder ?? task.sort_order ?? 0,
    },
  })

  try {
    debugTaskStore('moveTaskStatus patch request', {
      taskId,
      url: `/api/v1/tasks/${taskId}/sort-order`,
      sortOrder: newSortOrder ?? task.sort_order ?? 0,
      taskStatusId: newStatusId,
    })

    const response = await axios.patch<{ data: TTask }>(
      `/api/v1/tasks/${taskId}/sort-order`,
      {
        sortOrder: newSortOrder ?? task.sort_order ?? 0,
        taskStatusId: newStatusId,
      }
    )

    ctx.setTasksMap({
      ...ctx.getTasksMap(),
      [taskId]: response.data.data,
    })

    debugTaskStore('moveTaskStatus patch success', {
      taskId,
      responseStatusId: response.data.data.task_status_id,
      responseSortOrder: response.data.data.sort_order,
    })
  } catch (error: unknown) {
    const normalizedError = ctx.normalizeTaskMutationError(
      error,
      ctx.translate(
        'task.mutation.move_status_fallback',
        {},
        'Unable to move the task through the current workflow.'
      )
    )

    debugTaskStore('moveTaskStatus patch failed', {
      taskId,
      newStatusId,
      message: normalizedError.message,
      isConflict: normalizedError.isConflict,
      error,
    })

    ctx.notificationStore.error(
      ctx.translate('task.mutation.status_update_failed', {}, 'Status update failed'),
      normalizedError.message
    )

    ctx.setTasksMap({
      ...ctx.getTasksMap(),
      [taskId]: {
        ...task,
        status: prevStatus,
        task_status_id: prevTaskStatusId,
        sort_order: prevSortOrder,
      },
    })

    if (normalizedError.isConflict) {
      await ctx.fetchGroupedTasks()
    }
  } finally {
    ctx.setTaskMutating(taskId, false)
    ctx.endOptimistic()
    debugTaskStore('moveTaskStatus finished', { taskId, newStatusId })
  }
}

export async function executeReorderTask<TTask extends TaskDetail>(
  ctx: TaskMutationContext<TTask>,
  taskId: string,
  newSortOrder: number
): Promise<void> {
  const task = ctx.getTaskById(taskId)
  if (!task) return
  if (ctx.isTaskMutating(taskId)) {
    ctx.notificationStore.info(
      ctx.translate('task.workflow.board_sync_title', {}, 'Board is syncing'),
      ctx.translate(
        'task.workflow.current_operation_wait_message',
        {},
        'Please wait for the current operation to finish.'
      )
    )
    return
  }

  ctx.beginOptimistic()
  ctx.setTaskMutating(taskId, true)

  const prevSortOrder = task.sort_order
  const currentMap = ctx.getTasksMap()
  ctx.setTasksMap({
    ...currentMap,
    [taskId]: { ...task, sort_order: newSortOrder },
  })

  try {
    await axios.patch(`/api/v1/tasks/${taskId}/sort-order`, {
      sortOrder: newSortOrder,
    })
  } catch (error: unknown) {
    ctx.setTasksMap({
      ...ctx.getTasksMap(),
      [taskId]: { ...task, sort_order: prevSortOrder },
    })

    const normalized = ctx.normalizeTaskMutationError(
      error,
      ctx.translate('task.mutation.sort_failed_fallback', {}, 'Unable to update task order.')
    )

    ctx.notificationStore.error(
      ctx.translate('task.mutation.sort_failed_title', {}, 'Task sorting failed'),
      normalized.message
    )

    if (normalized.isConflict) {
      await ctx.fetchGroupedTasks()
    }
  } finally {
    ctx.setTaskMutating(taskId, false)
    ctx.endOptimistic()
  }
}

export async function executeBatchUpdateStatus<TTask extends TaskDetail>(
  ctx: TaskMutationContext<TTask>,
  taskIds: string[],
  newStatusId: TaskStatus
): Promise<void> {
  ctx.beginOptimistic()

  const prevStates: Record<
    string,
    { status: string; task_status_id: string | null | undefined }
  > = {}
  const currentMap = ctx.getTasksMap()
  const updated = { ...currentMap }

  for (const id of taskIds) {
    if (!Object.prototype.hasOwnProperty.call(updated, id)) continue

    const currentTask = updated[id]
    if (!currentTask) continue

    prevStates[id] = {
      status: currentTask.status,
      task_status_id: currentTask.task_status_id,
    }
    updated[id] = { ...currentTask, task_status_id: newStatusId }
  }
  ctx.setTasksMap(updated)

  try {
    await axios.patch('/api/v1/tasks/batch-status', {
      taskIds,
      taskStatusId: newStatusId,
    })
  } catch (error: unknown) {
    const rollback = { ...ctx.getTasksMap() }
    for (const [id, previous] of Object.entries(prevStates)) {
      if (!Object.prototype.hasOwnProperty.call(rollback, id)) continue

      const currentTask = rollback[id]
      if (!currentTask) continue

      rollback[id] = {
        ...currentTask,
        status: previous.status,
        task_status_id: previous.task_status_id,
      }
    }
    ctx.setTasksMap(rollback)

    const normalized = ctx.normalizeTaskMutationError(
      error,
      ctx.translate(
        'task.mutation.batch_failed_fallback',
        {},
        'Unable to update status for the selected tasks.'
      )
    )

    ctx.notificationStore.error(
      ctx.translate('task.mutation.batch_failed_title', {}, 'Batch update failed'),
      normalized.message
    )

    if (normalized.isConflict) {
      await ctx.fetchGroupedTasks()
    }
  } finally {
    ctx.endOptimistic()
  }
}
