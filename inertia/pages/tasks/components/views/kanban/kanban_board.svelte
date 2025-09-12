<script lang="ts">
  import { Plus } from 'lucide-svelte'

  import type { TaskStore } from '@/stores/tasks.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  import type { Task } from '../../../types.svelte'

  import KanbanColumn from './kanban_column.svelte'



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
    onTaskClick?: (task: Task) => void
    onCreateTask?: (status?: string) => void
    onCreateStatus?: () => void
    onDeleteStatus?: (payload: { status: string; label: string; taskCount: number }) => void
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
    canDeleteStatus,
    canCreateTask = false,
    canManageStatuses = false,
    createTaskDisabledReason = null,
    hasProjectOptions = true,
  }: Props = $props()
  const { t } = useTranslation()
  const STATUS_ORDER_STORAGE_KEY = 'tasks:kanban:status-order'
  const COLUMN_DRAG_DATA_TYPE = 'application/x-kanban-column'

  let orderedColumnKeys = $state<string[]>([])
  let draggingColumnKey = $state<string | null>(null)

  const statusLabelFallback: Record<string, string> = {
    todo: t('task.status_todo', {}, 'Chờ xử lý'),
    in_progress: t('task.status_in_progress', {}, 'Đang thực hiện'),
    in_review: t('task.status_in_review', {}, 'Đang review'),
    done: t('task.status_done', {}, 'Hoàn thành'),
    cancelled: t('task.status_cancelled', {}, 'Đã hủy'),
  }

  const columns = $derived.by(() => {
    if (metadata.statuses.length > 0) {
      return metadata.statuses.map((status) => ({
        key: status.value,
        label: status.label || statusLabelFallback[status.value] || status.value,
      }))
    }

    return [
      { key: 'todo', label: statusLabelFallback.todo },
      { key: 'in_progress', label: statusLabelFallback.in_progress },
      { key: 'in_review', label: statusLabelFallback.in_review },
      { key: 'done', label: statusLabelFallback.done },
      { key: 'cancelled', label: statusLabelFallback.cancelled },
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
    if (showNoProjectsState) return 'Bạn cần tạo project trước khi tạo task.'
    if (showFilteredEmptyState) return 'Không có task phù hợp bộ lọc.'
    if (showNoTasksState) return 'Chưa có task.'
    if (createTaskDisabledReason) return createTaskDisabledReason
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

    let storedKeys: string[] = []
    try {
      const raw = window.localStorage.getItem(STATUS_ORDER_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as unknown
        if (Array.isArray(parsed)) {
          storedKeys = parsed.filter((item): item is string => typeof item === 'string')
        }
      }
    } catch {
      storedKeys = []
    }

    const merged = [
      ...storedKeys.filter((key) => keys.includes(key)),
      ...keys.filter((key) => !storedKeys.includes(key)),
    ]

    orderedColumnKeys = merged
  })

  function persistOrder(nextKeys: string[]) {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STATUS_ORDER_STORAGE_KEY, JSON.stringify(nextKeys))
  }

  function handleColumnDragStart(event: DragEvent, columnKey: string) {
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

  function handleColumnDrop(event: DragEvent, targetKey: string) {
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

    current.splice(from, 1)
    current.splice(to, 0, sourceKey)
    orderedColumnKeys = current
    persistOrder(current)
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

  function getTasksForColumn(statusId: string): Task[] {
    const directTasks = store.tasksByStatus[statusId] ?? []

    const definition = metadata.statuses.find((status) => status.value === statusId)
    if (!definition) {
      return directTasks
    }

    const legacyTasks = store.sortedTasks.filter((task): task is Task => {
      if (task.task_status_id) {
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

    const deduped = new Map<string, Task>()
    for (const task of directTasks) {
      deduped.set(task.id, task)
    }
    for (const task of legacyTasks) {
      deduped.set(task.id, task)
    }

    return [...deduped.values()]
  }
</script>

<div class="kanban-stage">
  {#if store.isLoading}
    <div class="kanban-loading" role="status" aria-live="polite">
      <div class="kanban-loading-grid">
        {#each Array(5) as _, index}
          <div class="kanban-skeleton" style={`--i: ${index}`}></div>
        {/each}
      </div>
      <span>{t('common.loading', {}, 'Đang tải...')}</span>
    </div>
  {:else}
    {#if store.isOptimisticActive}
      <div class="kanban-sync-notice" role="status" aria-live="polite">
        Board đang đồng bộ thay đổi. Một số thao tác quản lý trạng thái tạm thời bị khóa.
      </div>
    {/if}

    {#if emptyStateMessage}
      <div class="kanban-empty-state" role="status">
        <div>
          <span>{emptyStateMessage}</span>
          <div class="kanban-empty-actions">
            {#if showFilteredEmptyState}
              <button
                type="button"
                onclick={() => { store.clearFilters() }}
              >
                Xóa bộ lọc
              </button>
            {:else if canCreateTask && hasProjectOptions}
              <button
                type="button"
                onclick={() => { onCreateTask?.() }}
              >
                Tạo task
              </button>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    <div class="kanban-board" role="list">
      {#each orderedColumns as column (column.key)}
        <div
          role="listitem"
          class="kanban-column-shell {draggingColumnKey === column.key ? 'is-dragging' : ''}"
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
          class="kanban-add-status"
          onclick={handleCreateStatus}
          disabled={store.isOptimisticActive}
          type="button"
          aria-label="Thêm trạng thái mới"
          title="Thêm trạng thái mới"
        >
          <Plus class="h-5 w-5" />
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .kanban-stage {
    width: 100%;
    margin-top: 22px;
    overflow-x: auto;
    padding: 0 4px 14px;
    scroll-snap-type: x proximity;
  }

  .kanban-stage::-webkit-scrollbar {
    height: 10px;
  }

  .kanban-stage::-webkit-scrollbar-track {
    border-radius: 999px;
    background: rgba(22, 19, 15, .06);
  }

  .kanban-stage::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: rgba(22, 19, 15, .28);
  }

  .kanban-board {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(260px, 1fr);
    gap: 14px;
    min-width: max-content;
  }

  .kanban-column-shell {
    transition: opacity .18s var(--ease-suar), transform .18s var(--ease-suar);
    scroll-snap-align: start;
  }

  .kanban-column-shell.is-dragging {
    opacity: .6;
  }

  .kanban-sync-notice,
  .kanban-empty-state {
    margin-bottom: 14px;
    border: 2px solid var(--suar-black);
    border-radius: 18px;
    background: rgba(255, 253, 248, .9);
    padding: 13px 15px;
    box-shadow: 5px 5px 0 rgba(22, 19, 15, .1);
    color: var(--suar-black);
    font-size: 14px;
    font-weight: 850;
  }

  .kanban-sync-notice {
    background: rgba(107, 140, 255, .14);
  }

  .kanban-empty-state > div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  .kanban-empty-actions {
    display: inline-flex;
    gap: 8px;
  }

  .kanban-empty-actions button,
  .kanban-add-status {
    border: 2px solid var(--suar-black);
    border-radius: 14px;
    background: var(--suar-white);
    color: var(--suar-black);
    font-size: 12px;
    font-weight: 950;
    box-shadow: 3px 3px 0 rgba(22, 19, 15, .14);
    transition: transform .2s var(--ease-suar), box-shadow .2s var(--ease-suar);
  }

  .kanban-empty-actions button {
    min-height: 36px;
    padding: 0 12px;
  }

  .kanban-add-status {
    display: grid;
    width: 48px;
    height: 48px;
    place-items: center;
    border-style: dashed;
  }

  .kanban-empty-actions button:hover,
  .kanban-add-status:hover {
    transform: translate(-1px, -2px);
    box-shadow: 5px 5px 0 var(--suar-black);
  }

  .kanban-loading {
    display: grid;
    min-height: 320px;
    place-items: center;
    gap: 18px;
    color: var(--suar-ink-56);
    font-size: 14px;
    font-weight: 900;
  }

  .kanban-loading-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(120px, 1fr));
    gap: 14px;
    width: min(100%, 980px);
  }

  .kanban-skeleton {
    height: 220px;
    border: 2px solid rgba(22, 19, 15, .22);
    border-radius: 22px;
    background:
      linear-gradient(90deg, transparent, rgba(255, 61, 22, .08), transparent),
      rgba(255, 253, 248, .72);
    background-size: 220% 100%, auto;
    box-shadow: 5px 5px 0 rgba(22, 19, 15, .08);
    animation: kanban-shimmer 1.6s var(--ease-suar) infinite;
    animation-delay: calc(var(--i) * 90ms);
  }

  @keyframes kanban-shimmer {
    to {
      background-position: -220% 0, 0 0;
    }
  }

  @media (max-width: 680px) {
    .kanban-board {
      grid-auto-columns: minmax(250px, 86vw);
    }

    .kanban-loading-grid {
      grid-template-columns: repeat(2, minmax(120px, 1fr));
    }
  }
</style>
