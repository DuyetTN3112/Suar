<script lang="ts">
  import { Pencil, Plus, Trash2, GripVertical } from 'lucide-svelte'

  import type { TaskDisplayProperties } from '@/apps/user/modules/tasks/stores/tasks.svelte'
  import { isDocumentationTaskStatusId } from '@/apps/shared/tasks/documentation_task_status'

  import type { TaskDetail } from '@/apps/user/modules/tasks/types/index.svelte'

  import KanbanCard from '@/apps/user/modules/tasks/components/views/kanban/kanban_card.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  interface Props {
    status: string
    label: string
    tasks: TaskDetail[]
    displayProperties: TaskDisplayProperties
    metadata: {
      statuses: { value: string; label: string; color?: string; slug?: string; category?: string }[]
      labels: { value: string; label: string; color?: string }[]
      priorities: { value: string; label: string; color?: string }[]
    }
    onTaskClick?: (task: TaskDetail) => void
    onDropTask: (taskId: string, newStatus: string, sortOrder: number) => void
    onCreateTask?: (status: string) => void
    onDeleteStatus?: (status: string, label: string, taskCount: number) => void
    onRenameStatus?: (status: string, label: string) => void
    onColumnDragStart?: (event: DragEvent, status: string) => void
    onColumnDragEnd?: () => void
    isBoardMutationLocked?: boolean
    isTaskMutating?: (taskId: string) => boolean
    canDelete?: boolean
    canCreateTask?: boolean
    canManageStatus?: boolean
  }

  interface KanbanTaskPayload {
    taskId: string
    fromStatus: string
  }

  const TASK_DRAG_DATA_TYPE = 'application/x-kanban-task'

  const {
    status,
    label,
    tasks,
    displayProperties,
    metadata,
    onTaskClick,
    onDropTask,
    onCreateTask,
    onDeleteStatus,
    onRenameStatus,
    onColumnDragStart,
    onColumnDragEnd,
    isBoardMutationLocked = false,
    isTaskMutating = () => false,
    canDelete = false,
    canCreateTask = false,
    canManageStatus = false,
  }: Props = $props()

  const { t } = useTranslation()
  let isDragOver = $state(false)

  const statusLaneClasses: Record<string, string | undefined> = {
    todo: 'border-t-muted-foreground/50',
    in_progress: 'border-t-primary',
    in_review: 'border-t-accent-foreground/70',
    done: 'border-t-secondary-foreground/70',
    cancelled: 'border-t-destructive',
  }

  const laneClass = $derived.by(() => {
    const statusOption = metadata.statuses.find((statusOption) => statusOption.value === status)
    const laneKey = statusOption?.category ?? statusOption?.slug ?? status
    return statusLaneClasses[laneKey] ?? statusLaneClasses[status] ?? 'border-t-primary'
  })
  const statusColor = $derived(
    metadata.statuses.find((statusOption) => statusOption.value === status)?.color ?? null
  )
  const isDocumentationColumn = $derived(isDocumentationTaskStatusId(status, metadata.statuses))

  function isKanbanDebugEnabled(): boolean {
    if (import.meta.env.DEV) return true
    if (typeof window === 'undefined') return false

    return window.localStorage.getItem('tasks:kanban:debug') === '1'
  }

  function debugKanbanDnD(message: string, payload?: Record<string, unknown>) {
    if (!isKanbanDebugEnabled()) return

    console.warn(`[KanbanDnD:${status}] ${message}`, payload ?? {})
  }

  function handleDragStart(e: DragEvent, task: TaskDetail) {
    e.stopPropagation()

    if (isDocumentationColumn || isTaskMutating(task.id) || isBoardMutationLocked) {
      debugKanbanDnD('drag-start blocked', {
        taskId: task.id,
        isDocumentationColumn,
        isTaskMutating: isTaskMutating(task.id),
        isBoardMutationLocked,
      })
      e.preventDefault()
      return
    }

    if (e.dataTransfer) {
      const payload = JSON.stringify({
        taskId: task.id,
        fromStatus: status,
      })

      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData(TASK_DRAG_DATA_TYPE, payload)
      e.dataTransfer.setData('text/plain', payload)

      debugKanbanDnD('drag-start payload set', {
        taskId: task.id,
        fromStatus: status,
        types: Array.from(e.dataTransfer.types),
      })
    } else {
      debugKanbanDnD('drag-start missing dataTransfer', { taskId: task.id })
    }
  }

  function handleDragOver(e: DragEvent) {
    if (!isTaskDrag(e)) {
      return
    }

    e.stopPropagation()

    if (isDocumentationColumn || isBoardMutationLocked) {
      debugKanbanDnD('drag-over blocked by board lock')
      return
    }

    e.preventDefault()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move'
    }
    isDragOver = true
  }

  function handleDragLeave() {
    isDragOver = false
  }

  function handleDrop(e: DragEvent) {
    if (!isTaskDrag(e)) {
      return
    }

    e.stopPropagation()
    e.preventDefault()
    isDragOver = false

    if (!e.dataTransfer) {
      debugKanbanDnD('drop ignored: missing dataTransfer')
      return
    }

    try {
      const taskPayload = readTaskPayload(e.dataTransfer)
      debugKanbanDnD('drop received', {
        targetStatus: status,
        types: Array.from(e.dataTransfer.types),
        hasPayload: Boolean(taskPayload),
      })

      if (!taskPayload) {
        debugKanbanDnD('drop ignored: missing task payload')
        return
      }

      const data: unknown = JSON.parse(taskPayload)
      if (!isKanbanTaskPayload(data)) {
        debugKanbanDnD('drop ignored: invalid payload shape', { data })
        return
      }

      const { taskId, fromStatus } = data
      if (isDocumentationColumn || isTaskMutating(taskId) || isBoardMutationLocked) {
        debugKanbanDnD('drop blocked', {
          taskId,
          fromStatus,
          targetStatus: status,
          isTaskMutating: isTaskMutating(taskId),
          isBoardMutationLocked,
        })
        return
      }

      if (fromStatus === status) {
        debugKanbanDnD('drop ignored: same status', { taskId, status })
        return
      }

      // Calculate sort order: place at end of column
      const maxSortOrder = tasks.reduce((max, t) => Math.max(max, t.sort_order ?? 0), 0)
      debugKanbanDnD('drop accepted', {
        taskId,
        fromStatus,
        targetStatus: status,
        sortOrder: maxSortOrder + 1000,
      })
      onDropTask(taskId, status, maxSortOrder + 1000)
    } catch (error) {
      debugKanbanDnD('drop ignored: invalid JSON payload', { error })
    }
  }

  function readTaskPayload(dataTransfer: DataTransfer): string {
    return dataTransfer.getData(TASK_DRAG_DATA_TYPE) || dataTransfer.getData('text/plain')
  }

  function isTaskDrag(event: DragEvent): boolean {
    return Array.from(event.dataTransfer?.types ?? []).includes(TASK_DRAG_DATA_TYPE)
  }

  function isKanbanTaskPayload(value: unknown): value is KanbanTaskPayload {
    if (!value || typeof value !== 'object') {
      return false
    }

    const payload = value as Record<string, unknown>
    return typeof payload.taskId === 'string' && typeof payload.fromStatus === 'string'
  }
</script>

<section
  class={`flex min-h-[640px] w-full flex-col overflow-hidden rounded-2xl border border-t-4 bg-muted/30 shadow-sm ${laneClass} ${
    isDragOver ? 'border-primary bg-primary/10' : 'border-border'
  }`}
  style:border-top-color={isDragOver ? 'var(--primary)' : statusColor ?? undefined}
  aria-label={t('ui_misc.tasks.kanban.column_aria', { label }, ':label column')}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
>
  <div class="flex items-center justify-between gap-2 border-b border-border px-3.5 py-3">
    <div class="inline-flex min-w-0 items-center gap-2">
      {#if canManageStatus}
        <button
          type="button"
          class="inline-grid place-items-center rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          draggable="true"
          ondragstart={(event) => { onColumnDragStart?.(event, status) }}
          ondragend={() => { onColumnDragEnd?.() }}
          title={t('task.workflow.drag_status_column', {}, 'Drag to reorder status column')}
          aria-label={t('task.workflow.drag_status_column', {}, 'Drag to reorder status column')}
        >
          <GripVertical class="h-3.5 w-3.5" />
        </button>
      {/if}

      <p class="truncate text-sm font-extrabold tracking-[0.03em] text-foreground">{label}</p>
      <span class="inline-flex items-center justify-center rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">
        {tasks.length}
      </span>
    </div>

    {#if canDelete}
      <button
        type="button"
        class="inline-grid place-items-center rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-orange"
        onclick={() => onDeleteStatus?.(status, label, tasks.length)}
        title={t('task.workflow.delete_status_button', {}, 'Delete status')}
        aria-label={t('task.workflow.delete_status_button', {}, 'Delete status')}
      >
        <Trash2 class="h-3.5 w-3.5" />
      </button>
    {/if}
    {#if canManageStatus}
      <button
        type="button"
        class="inline-grid place-items-center rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        onclick={() => onRenameStatus?.(status, label)}
        title={t('task.workflow.rename_status_button', { label }, 'Rename status :label')}
        aria-label={t('task.workflow.rename_status_button', { label }, 'Rename status :label')}
      >
        <Pencil class="h-3.5 w-3.5" />
      </button>
    {/if}
  </div>

  <div class="flex min-h-[120px] flex-1 flex-col gap-2.5 overflow-y-auto p-3">
    {#if tasks.length === 0}
      <div class="grid min-h-24 place-items-center rounded-xl border border-dashed border-border text-center text-sm font-semibold text-muted-foreground">
        {t('task.kanban.column_empty', {}, 'Empty')}
      </div>
    {:else}
      {#each tasks as task (task.id)}
        <KanbanCard
          {task}
          {displayProperties}
          {metadata}
          {onTaskClick}
          isMutating={isTaskMutating(task.id)}
          onDragStart={(e: DragEvent) => {
            handleDragStart(e, task)
          }}
        />
      {/each}
    {/if}

    {#if canCreateTask}
      <button
        class="mt-auto flex min-h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background/60 font-bold text-muted-foreground transition-colors hover:border-foreground hover:bg-background hover:text-foreground"
        onclick={() => { onCreateTask?.(status); }}
        type="button"
      >
        <Plus class="h-3.5 w-3.5" />
        <span>{t('task.add_task', {}, 'Add task')}</span>
      </button>
    {/if}
  </div>
</section>
