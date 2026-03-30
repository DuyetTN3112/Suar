<script lang="ts">
  import type { Task } from '../../../types.svelte'
  import type { TaskStore } from '@/stores/tasks.svelte'
  import KanbanColumn from './kanban_column.svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import { Plus } from 'lucide-svelte'

  interface Props {
    store: TaskStore
    metadata: {
      statuses: Array<{ value: string; label: string; color?: string }>
      labels: Array<{ value: string; label: string; color?: string }>
      priorities: Array<{ value: string; label: string; color?: string }>
      users: Array<{ id: string; username: string; email: string }>
    }
    onTaskClick?: (task: Task) => void
    onCreateTask?: (status: string) => void
    onCreateStatus?: () => void
    onDeleteStatus?: (payload: { status: string; label: string; taskCount: number }) => void
    canDeleteStatus?: (status: string) => boolean
  }

  const { store, metadata, onTaskClick, onCreateTask, onCreateStatus, onDeleteStatus, canDeleteStatus }: Props = $props()
  const { t } = useTranslation()
  const STATUS_ORDER_STORAGE_KEY = 'tasks:kanban:status-order'

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
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('application/x-kanban-column', columnKey)
    }
  }

  function handleColumnDragOver(event: DragEvent) {
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
  }

  function handleColumnDrop(event: DragEvent, targetKey: string) {
    event.preventDefault()

    const draggedColumnKey = event.dataTransfer?.getData('application/x-kanban-column')
    if (!draggedColumnKey && !draggingColumnKey) {
      return
    }

    const sourceKey = draggingColumnKey || draggedColumnKey
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

  function handleDropTask(taskId: string, newStatus: string, sortOrder: number) {
    void store.moveTaskStatus(taskId, newStatus, sortOrder)
  }

  function handleCreateTask(status: string) {
    onCreateTask?.(status)
  }

  function handleEditStatus(status: string, newLabel: string) {
    // TODO: Update status label
    console.log('Edit status:', status, 'to', newLabel)
  }

  function handleCreateStatus() {
    onCreateStatus?.()
  }

  function handleDeleteStatus(status: string, label: string, taskCount: number) {
    onDeleteStatus?.({ status, label, taskCount })
  }
</script>

<div class="w-full overflow-x-auto pb-4">
  {#if store.isLoading}
    <div class="flex items-center justify-center h-64 text-muted-foreground">
      <div class="flex flex-col items-center gap-2">
        <div class="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        <span class="text-sm">{t('common.loading', {}, 'Đang tải...')}</span>
      </div>
    </div>
  {:else}
    <div class="flex items-start gap-4 px-1">
      {#each orderedColumns as column (column.key)}
        <div
          role="listitem"
          class="transition-opacity {draggingColumnKey === column.key ? 'opacity-60' : ''}"
          ondragover={handleColumnDragOver}
          ondrop={(event) => { handleColumnDrop(event, column.key) }}
        >
          <KanbanColumn
            status={column.key}
            label={column.label}
            tasks={store.tasksByStatus[column.key] ?? []}
            displayProperties={store.displayProperties}
            {metadata}
            {onTaskClick}
            onDropTask={handleDropTask}
            onCreateTask={handleCreateTask}
            onEditStatus={handleEditStatus}
            onDeleteStatus={handleDeleteStatus}
            canDelete={canDeleteStatus?.(column.key) ?? false}
            onColumnDragStart={handleColumnDragStart}
            onColumnDragEnd={handleColumnDragEnd}
          />
        </div>
      {/each}

      <!-- Add Status Button -->
      <button
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/30 bg-muted/10 text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
        onclick={handleCreateStatus}
        type="button"
        aria-label="Thêm trạng thái mới"
        title="Thêm trạng thái mới"
      >
        <Plus class="h-5 w-5" />
      </button>
    </div>
  {/if}
</div>
