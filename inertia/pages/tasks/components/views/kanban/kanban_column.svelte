<script lang="ts">
  import { Plus, Trash2, GripVertical } from 'lucide-svelte'

  import type { TaskDisplayProperties } from '@/stores/tasks.svelte'

  import type { Task } from '../../../types.svelte'

  import KanbanCard from './kanban_card.svelte'

  interface Props {
    status: string
    label: string
    tasks: Task[]
    displayProperties: TaskDisplayProperties
    metadata: {
      statuses: { value: string; label: string; color?: string }[]
      labels: { value: string; label: string; color?: string }[]
      priorities: { value: string; label: string; color?: string }[]
    }
    onTaskClick?: (task: Task) => void
    onDropTask: (taskId: string, newStatus: string, sortOrder: number) => void
    onCreateTask?: (status: string) => void
    onDeleteStatus?: (status: string, label: string, taskCount: number) => void
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
    onColumnDragStart,
    onColumnDragEnd,
    isBoardMutationLocked = false,
    isTaskMutating = () => false,
    canDelete = false,
    canCreateTask = false,
    canManageStatus = false,
  }: Props = $props()

  let isDragOver = $state(false)

  const statusLaneColors: Record<string, string | undefined> = {
    todo: 'var(--suar-ink-56)',
    in_progress: 'var(--suar-black)',
    in_review: '#ff5ce1',
    done: '#2fbf71',
    cancelled: 'rgba(22, 19, 15, .26)',
  }

  const laneColor = $derived(
    metadata.statuses.find((statusOption) => statusOption.value === status)?.color ??
      statusLaneColors[status] ??
      'var(--suar-orange)'
  )

  function isKanbanDebugEnabled(): boolean {
    if (import.meta.env.DEV) return true
    if (typeof window === 'undefined') return false

    return window.localStorage.getItem('tasks:kanban:debug') === '1'
  }

  function debugKanbanDnD(message: string, payload?: Record<string, unknown>) {
    if (!isKanbanDebugEnabled()) return

    console.warn(`[KanbanDnD:${status}] ${message}`, payload ?? {})
  }

  function handleDragStart(e: DragEvent, task: Task) {
    e.stopPropagation()

    if (isTaskMutating(task.id) || isBoardMutationLocked) {
      debugKanbanDnD('drag-start blocked', {
        taskId: task.id,
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
    e.stopPropagation()

    if (isBoardMutationLocked) {
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
      if (isTaskMutating(taskId) || isBoardMutationLocked) {
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

  function isKanbanTaskPayload(value: unknown): value is KanbanTaskPayload {
    if (!value || typeof value !== 'object') {
      return false
    }

    const payload = value as Record<string, unknown>
    return typeof payload.taskId === 'string' && typeof payload.fromStatus === 'string'
  }
</script>

<section
  class="kanban-lane {isDragOver ? 'is-over' : ''}"
  style={`--lane-color: ${laneColor}`}
  aria-label="{label} column"
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
>
  <div class="lane-header">
    <div class="lane-heading">
      {#if canManageStatus}
        <button
          type="button"
          class="lane-drag"
          draggable="true"
          ondragstart={(event) => { onColumnDragStart?.(event, status) }}
          ondragend={() => { onColumnDragEnd?.() }}
          title="Kéo để đổi vị trí cột trạng thái"
          aria-label="Kéo để đổi vị trí cột trạng thái"
        >
          <GripVertical class="h-3.5 w-3.5" />
        </button>
      {/if}

      <p>{label}</p>
      <span class="lane-count">
        {tasks.length}
      </span>
    </div>

    {#if canDelete}
      <button
        type="button"
        class="lane-delete"
        onclick={() => onDeleteStatus?.(status, label, tasks.length)}
        title="Xoá trạng thái"
        aria-label="Xoá trạng thái"
      >
        <Trash2 class="h-3.5 w-3.5" />
      </button>
    {/if}
  </div>

  <div class="lane-task-list">
    {#if tasks.length === 0}
      <div class="lane-drop-hint">
        Kéo thả task vào đây
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
        class="lane-add-task"
        onclick={() => { onCreateTask?.(status); }}
        type="button"
      >
        <Plus class="h-3.5 w-3.5" />
        <span>Tạo task mới</span>
      </button>
    {/if}
  </div>
</section>

<style>
  .kanban-lane {
    position: relative;
    display: flex;
    min-height: 420px;
    width: min(320px, 82vw);
    flex-direction: column;
    overflow: hidden;
    border: 2px solid var(--suar-black);
    border-radius: 22px;
    background:
      linear-gradient(180deg, rgba(255, 253, 248, .78), rgba(255, 246, 232, .58)),
      rgba(255, 255, 255, .52);
    box-shadow: 5px 5px 0 rgba(22, 19, 15, .1);
    transition: background .18s var(--ease-suar), box-shadow .18s var(--ease-suar);
  }

  .kanban-lane::before {
    content: "";
    position: absolute;
    inset: 0 0 auto;
    height: 7px;
    background: var(--lane-color);
  }

  .kanban-lane.is-over {
    background: rgba(255, 61, 22, .06);
    box-shadow: 7px 7px 0 rgba(255, 61, 22, .18);
  }

  .lane-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 17px 14px 12px;
    border-bottom: 1.5px solid rgba(22, 19, 15, .15);
  }

  .lane-heading {
    display: inline-flex;
    min-width: 0;
    align-items: center;
    gap: 9px;
  }

  .lane-heading p {
    margin: 0;
    color: var(--suar-black);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 14px;
    font-weight: 950;
    letter-spacing: .03em;
  }

  .lane-count {
    display: inline-flex;
    min-width: 28px;
    height: 26px;
    align-items: center;
    justify-content: center;
    border: 2px solid var(--suar-black);
    border-radius: 9px;
    background: var(--suar-black);
    color: #fff;
    font-size: 12px;
    font-weight: 950;
    box-shadow: 2px 2px 0 var(--suar-black);
  }

  .lane-drag,
  .lane-delete {
    display: inline-grid;
    place-items: center;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: rgba(22, 19, 15, .5);
    padding: 5px;
  }

  .lane-drag {
    cursor: grab;
  }

  .lane-drag:active {
    cursor: grabbing;
  }

  .lane-drag:hover,
  .lane-delete:hover {
    background: rgba(22, 19, 15, .06);
    color: var(--suar-black);
  }

  .lane-delete:hover {
    color: var(--suar-orange);
  }

  .lane-task-list {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 10px;
    min-height: 120px;
    max-height: calc(100vh - 260px);
    overflow-y: auto;
    padding: 12px;
  }

  .lane-drop-hint {
    display: grid;
    min-height: 96px;
    place-items: center;
    border: 1.5px dashed rgba(22, 19, 15, .22);
    border-radius: 14px;
    color: var(--suar-ink-56);
    font-size: 13px;
    font-weight: 800;
    text-align: center;
  }

  .lane-add-task {
    display: flex;
    min-height: 44px;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: auto;
    border: 1.5px dashed rgba(22, 19, 15, .28);
    border-radius: 14px;
    background: rgba(255, 255, 255, .34);
    color: var(--suar-ink-56);
    font-weight: 850;
    transition: background .2s var(--ease-suar), color .2s var(--ease-suar), border-color .2s var(--ease-suar);
  }

  .lane-add-task:hover {
    border-color: var(--suar-black);
    background: var(--suar-white);
    color: var(--suar-black);
  }
</style>
