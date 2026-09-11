<script lang="ts">
  import { Plus } from 'lucide-svelte'
  import {
    getTaskDoneGateDecision,
  } from '@/apps/shared/tasks/done_gate'
  import type { TaskStore } from '@/apps/user/modules/tasks/stores/tasks.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import type { TaskDetail } from '@/apps/user/modules/tasks/types/index.svelte'
  import KanbanColumn from '@/apps/user/modules/tasks/components/views/kanban/kanban_column.svelte'

  interface Props {
    store: TaskStore
    metadata: {
      statuses: {
        value: string
        label: string
        color?: string
        slug?: string
        category?: string
      }[]
      labels: { value: string; label: string; color?: string }[]
      priorities: { value: string; label: string; color?: string }[]
      users: { id: string; username: string; email: string }[]
    }
    onTaskClick?: (task: TaskDetail) => void
    onCreateTask?: (status?: string) => void
    onCreateStatus?: () => void
    onDeleteStatus?: (payload: { status: string; label: string; taskCount: number }) => void
    onRenameStatus?: (payload: { status: string; label: string }) => void
    onReorderStatuses?: (payload: { orderedStatusIds: string[]; previousStatusIds: string[] }) => void | Promise<void>
    canDeleteStatus?: (status: string) => boolean
    canCreateTask?: boolean
    canManageStatuses?: boolean
    createTaskDisabledReason?: string | null
    hasProjectOptions?: boolean
  }

  const {
    store,
    metadata,
    onTaskClick,
    onCreateTask,
    onCreateStatus,
    onDeleteStatus,
    onRenameStatus,
    onReorderStatuses,
    canDeleteStatus,
    canCreateTask = false,
    canManageStatuses = false,
    hasProjectOptions = true,
  }: Props = $props()
  const { t } = useTranslation()
  const COLUMN_DRAG_DATA_TYPE = 'application/x-kanban-column'

  let orderedColumnKeys = $state<string[]>([])
  let draggingColumnKey = $state<string | null>(null)
  let columnReorderSubmitting = $state(false)
  let boardMoveRefusal = $state<{ message: string } | null>(null)

  const statusLabelFallback: Record<string, string> = {
    todo: t('task.status_todo', {}, 'To Do'),
    in_progress: t('task.status_in_progress', {}, 'In Progress'),
    in_review: t('task.status_in_review', {}, 'In Review'),
    done: t('task.status_done', {}, 'Done'),
    cancelled: t('task.status_cancelled', {}, 'Cancelled'),
  }

  function getStatusLabelFallback(status: string): string {
    return statusLabelFallback[status] ?? status
  }

  const columns = $derived.by(() => {
    if (metadata.statuses.length > 0) {
      return metadata.statuses.map((status) => ({
        key: status.value,
        label: status.label || getStatusLabelFallback(status.value),
      }))
    }

    return [
      { key: 'todo', label: getStatusLabelFallback('todo') },
      { key: 'in_progress', label: getStatusLabelFallback('in_progress') },
      { key: 'in_review', label: getStatusLabelFallback('in_review') },
      { key: 'done', label: getStatusLabelFallback('done') },
      { key: 'cancelled', label: getStatusLabelFallback('cancelled') },
    ]
  })

  const orderedColumns = $derived.by(() => {
    if (orderedColumnKeys.length === 0) return columns

    const map = new Map(columns.map((column) => [column.key, column]))
    const sorted = orderedColumnKeys
      .map((key) => map.get(key))
      .filter((column): column is { key: string; label: string } => Boolean(column))

    const missing = columns.filter((column) => !orderedColumnKeys.includes(column.key))
    return [...sorted, ...missing]
  })
  const showNoProjectsState = $derived(!hasProjectOptions)
  const showNoTasksState = $derived(!showNoProjectsState && store.totalCount === 0)
  const showFilteredEmptyState = $derived(
    !showNoProjectsState && store.totalCount > 0 && store.filteredCount === 0
  )
  const emptyStateMessage = $derived.by(() => {
    if (showNoProjectsState) return t('task.kanban.no_projects', {}, 'Create a project before creating tasks.')
    if (showFilteredEmptyState) return t('task.kanban.filtered_empty', {}, 'No tasks match the filters.')
    if (showNoTasksState) return t('task.kanban.empty', {}, 'No tasks yet.')
    return ''
  })

  function isKanbanDebugEnabled(): boolean {
    if (import.meta.env.DEV) return true
    if (typeof window === 'undefined') return false

    return window.localStorage.getItem('tasks:kanban:debug') === '1'
  }

  function debugKanbanBoard(message: string, payload?: Record<string, unknown>) {
    if (!isKanbanDebugEnabled()) return

    console.warn(`[KanbanBoard] ${message}`, payload ?? {})
  }

  $effect(() => {
    if (typeof window === 'undefined') return

    const keys = columns.map((column) => column.key)
    if (keys.length === 0) {
      orderedColumnKeys = []
      return
    }

    orderedColumnKeys = keys
  })

  function handleColumnDragStart(event: DragEvent, columnKey: string) {
    if (columnReorderSubmitting) {
      event.preventDefault()
      return
    }
    draggingColumnKey = columnKey
    event.stopPropagation()

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData(COLUMN_DRAG_DATA_TYPE, columnKey)
    }
  }

  function handleColumnDragOver(event: DragEvent) {
    if (!isColumnDrag(event)) {
      return
    }

    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
  }

  async function handleColumnDrop(event: DragEvent, targetKey: string) {
    if (!isColumnDrag(event)) {
      return
    }

    event.preventDefault()

    const draggedColumnKey = event.dataTransfer?.getData(COLUMN_DRAG_DATA_TYPE)
    if (!draggedColumnKey && !draggingColumnKey) {
      return
    }

    const sourceKey = draggingColumnKey ?? draggedColumnKey
    draggingColumnKey = null

    if (!sourceKey || sourceKey === targetKey) return

    const current = [...orderedColumnKeys]
    const from = current.indexOf(sourceKey)
    const to = current.indexOf(targetKey)
    if (from === -1 || to === -1) return

    const previous = [...current]
    current.splice(from, 1)
    current.splice(to, 0, sourceKey)
    orderedColumnKeys = current

    if (!onReorderStatuses) return
    columnReorderSubmitting = true
    try {
      await onReorderStatuses({ orderedStatusIds: current, previousStatusIds: previous })
    } catch {
      orderedColumnKeys = previous
    } finally {
      columnReorderSubmitting = false
    }
  }

  function handleColumnDragEnd() {
    draggingColumnKey = null
  }

  function isColumnDrag(event: DragEvent): boolean {
    if (draggingColumnKey) {
      return true
    }

    return Array.from(event.dataTransfer?.types ?? []).includes(COLUMN_DRAG_DATA_TYPE)
  }

  function handleDropTask(taskId: string, newStatus: string, sortOrder: number) {
    debugKanbanBoard('move task requested', { taskId, newStatus, sortOrder })
    const task = store.getTaskById(taskId)
    const targetStatus = metadata.statuses.find((status) => status.value === newStatus)
    const decision = getTaskDoneGateDecision({
      task,
      targetStatus,
      isBoardSyncing: store.isOptimisticActive,
      reason: {
        boardSyncing: t('task.workflow.board_sync_retry_error', {}, 'Board is syncing. Please try again in a few seconds.'),
        permissionDenied: t('task.workflow.status_permission_denied', {}, 'You do not have permission to update this task status.'),
        missingAssignee: t('task.workflow.assignee_required_for_done', {}, 'Assign a person to the task before moving it to Done.'),
      },
    })

    if (!decision.allowed) {
      boardMoveRefusal = {
        message: decision.reason,
      }
      return
    }

    boardMoveRefusal = null
    void store.moveTaskStatus(taskId, newStatus, sortOrder)
  }

  function handleCreateTask(status: string) {
    if (!canCreateTask) {
      return
    }

    onCreateTask?.(status)
  }

  function handleCreateStatus() {
    onCreateStatus?.()
  }

  function handleDeleteStatus(status: string, label: string, taskCount: number) {
    onDeleteStatus?.({ status, label, taskCount })
  }

  function getTasksForColumn(statusId: string): TaskDetail[] {
    const directTasks = store.tasksByStatus[statusId] ?? []

    const definition = metadata.statuses.find((status) => status.value === statusId)
    if (!definition) {
      return directTasks
    }

    const legacyTasks = store.sortedTasks.filter((task): task is TaskDetail => {
      // A project workflow migration replaces status IDs. A board response
      // already cached before that migration can therefore carry an ID no
      // longer present in this project's metadata. In that one case, use the
      // durable legacy status value so tasks remain visible until refresh.
      const hasCurrentStatusId = task.task_status_id
        ? metadata.statuses.some((status) => status.value === task.task_status_id)
        : false
      if (hasCurrentStatusId) {
        return false
      }

      if (!task.status) {
        return false
      }

      return task.status === definition.slug || task.status === definition.category
    })

    if (legacyTasks.length === 0) {
      return directTasks
    }

    const deduped = new Map<string, TaskDetail>()
    for (const task of directTasks) {
      deduped.set(task.id, task)
    }
    for (const task of legacyTasks) {
      deduped.set(task.id, task)
    }

    return [...deduped.values()]
  }
</script>

<div class="mt-5 w-full overflow-x-auto px-1 pb-3 [scrollbar-width:thin]">
  {#if store.isLoading}
    <div class="grid min-h-[320px] place-items-center gap-4 text-sm font-bold text-muted-foreground" role="status" aria-live="polite">
      <div class="grid w-full max-w-[980px] grid-cols-2 gap-3 lg:grid-cols-5">
        {#each Array(5) as _, index}
          <div class="h-[220px] animate-pulse rounded-2xl border border-border bg-muted/50" style={`animation-delay: ${index * 90}ms`}></div>
        {/each}
      </div>
      <span>{t('common.loading', {}, 'Loading...')}</span>
    </div>
  {:else}
    {#if store.isOptimisticActive}
      <div class="mb-3 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-semibold text-foreground shadow-sm" role="status" aria-live="polite">
        {t('task.workflow.board_sync_title', {}, 'Board is syncing')}
      </div>
    {/if}

    {#if boardMoveRefusal}
      <div class="mb-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-foreground shadow-sm" role="status" aria-live="assertive">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span>{boardMoveRefusal.message}</span>
        </div>
      </div>
    {/if}

    {#if emptyStateMessage}
      <div class="mb-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground shadow-sm" role="status">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span>{emptyStateMessage}</span>
          <div class="inline-flex gap-2">
            {#if showFilteredEmptyState}
              <button
                type="button"
                class="rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold shadow-sm transition hover:border-foreground hover:bg-muted"
                onclick={() => { store.clearFilters() }}
              >
                {t('task.clear_filters', {}, 'Clear filters')}
              </button>
            {:else if canCreateTask && hasProjectOptions}
              <button
                type="button"
                class="rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold shadow-sm transition hover:border-foreground hover:bg-muted"
                onclick={() => { onCreateTask?.() }}
              >
                {t('task.add_task', {}, 'Add task')}
              </button>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    <div
      class="grid min-w-max grid-flow-col auto-cols-[280px] items-start gap-3 pb-2 sm:auto-cols-[300px]"
      role="list"
    >
      {#each orderedColumns as column (column.key)}
        <div
          role="listitem"
          class={`snap-start transition ${draggingColumnKey === column.key ? 'opacity-60' : ''}`}
          ondragover={handleColumnDragOver}
          ondrop={(event) => { handleColumnDrop(event, column.key) }}
        >
          <KanbanColumn
            status={column.key}
            label={column.label}
            tasks={getTasksForColumn(column.key)}
            displayProperties={store.displayProperties}
            {metadata}
            {onTaskClick}
            onDropTask={handleDropTask}
            onCreateTask={handleCreateTask}
            onDeleteStatus={handleDeleteStatus}
            onRenameStatus={(status: string, label: string) => onRenameStatus?.({ status, label })}
            isBoardMutationLocked={store.isOptimisticActive}
            isTaskMutating={store.isTaskMutating}
            {canCreateTask}
            canManageStatus={canManageStatuses && !store.isOptimisticActive}
            canDelete={(canDeleteStatus?.(column.key) ?? false) && !store.isOptimisticActive}
            onColumnDragStart={handleColumnDragStart}
            onColumnDragEnd={handleColumnDragEnd}
          />
        </div>
      {/each}

      <!-- Add Status Button -->
      {#if canManageStatuses}
        <button
          class="grid h-12 w-12 shrink-0 place-items-center self-start rounded-xl border-2 border-dashed border-border bg-background text-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-foreground hover:shadow-md"
          onclick={handleCreateStatus}
          disabled={store.isOptimisticActive}
          type="button"
          aria-label={t('task.workflow.create_dialog_title', {}, 'Add new status')}
          title={t('task.workflow.create_dialog_title', {}, 'Add new status')}
        >
          <Plus class="h-5 w-5" />
        </button>
      {/if}
    </div>
  {/if}
</div>
