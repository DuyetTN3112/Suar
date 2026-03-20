<script lang="ts">
  import Badge from '@/components/ui/badge.svelte'
  import ScrollArea from '@/components/ui/scroll_area.svelte'
  import type { Task } from '../../../types.svelte'
  import type { TaskDisplayProperties } from '@/stores/tasks.svelte'
  import KanbanCard from './kanban_card.svelte'
  import { Plus } from 'lucide-svelte'

  interface Props {
    status: string
    label: string
    color?: string
    tasks: Task[]
    displayProperties: TaskDisplayProperties
    metadata: {
      statuses: Array<{ value: string; label: string; color?: string }>
      labels: Array<{ value: string; label: string; color?: string }>
      priorities: Array<{ value: string; label: string; color?: string }>
    }
    onTaskClick?: (task: Task) => void
    onDropTask: (taskId: string, newStatus: string, sortOrder: number) => void
    onCreateTask?: (status: string) => void
    onEditStatus?: (status: string, newLabel: string) => void
  }

  const { status, label, color, tasks, displayProperties, metadata, onTaskClick, onDropTask, onCreateTask, onEditStatus }: Props = $props()

  let isDragOver = $state(false)
  let isEditingLabel = $state(false)
  let editedLabel = $state(label)

  const statusColors: Record<string, string> = {
    todo: 'border-t-slate-400',
    in_progress: 'border-t-blue-500',
    in_review: 'border-t-amber-500',
    done: 'border-t-green-500',
    cancelled: 'border-t-red-400',
  }

  const statusBgColors: Record<string, string> = {
    todo: 'bg-slate-50 dark:bg-slate-900/30',
    in_progress: 'bg-blue-50 dark:bg-blue-900/20',
    in_review: 'bg-amber-50 dark:bg-amber-900/20',
    done: 'bg-green-50 dark:bg-green-900/20',
    cancelled: 'bg-red-50 dark:bg-red-900/20',
  }

  function handleDragStart(e: DragEvent, task: Task) {
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', JSON.stringify({
        taskId: task.id,
        fromStatus: status,
      }))
    }
  }

  function handleDragOver(e: DragEvent) {
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
    e.preventDefault()
    isDragOver = false

    if (!e.dataTransfer) return

    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'))
      const taskId = data.taskId as string
      const fromStatus = data.fromStatus as string

      if (fromStatus === status) return // Same column, no status change

      // Calculate sort order: place at end of column
      const maxSortOrder = tasks.reduce((max, t) => Math.max(max, t.sort_order ?? 0), 0)
      onDropTask(taskId, status, maxSortOrder + 1000)
    } catch {
      // Ignore invalid drop data
    }
  }

  function handleLabelEdit() {
    if (editedLabel.trim() && editedLabel !== label) {
      onEditStatus?.(status, editedLabel.trim())
    }
    isEditingLabel = false
  }

  function handleLabelKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      handleLabelEdit()
    } else if (e.key === 'Escape') {
      editedLabel = label
      isEditingLabel = false
    }
  }
</script>

<div
  class="flex flex-col min-w-[280px] max-w-[320px] rounded-lg border border-t-4 {statusColors[status] ?? 'border-t-gray-400'} {isDragOver ? 'ring-2 ring-primary/50 bg-primary/5' : 'bg-muted/30'} transition-all"
  role="region"
  aria-label="{label} column"
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
>
  <!-- Column Header -->
  <div class="flex items-center justify-between px-3 py-2.5 {statusBgColors[status] ?? ''} group">
    <div class="flex items-center gap-2 flex-1">
      {#if isEditingLabel}
        <input
          type="text"
          bind:value={editedLabel}
          onblur={handleLabelEdit}
          onkeydown={handleLabelKeydown}
          class="text-sm font-semibold bg-transparent border-b border-primary focus:outline-none w-32"
          autofocus
        />
      {:else}
        <h3 
          class="text-sm font-semibold cursor-pointer hover:text-primary transition-colors"
          onclick={() => { isEditingLabel = true; }}
          title="Click để đổi tên"
        >
          {label}
        </h3>
      {/if}
      <Badge variant="secondary" class="h-5 min-w-[20px] px-1.5 text-[10px]">
        {tasks.length}
      </Badge>
    </div>
  </div>

  <!-- Cards Container -->
  <div class="flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px] max-h-[calc(100vh-260px)]">
    {#if tasks.length === 0}
      <div class="flex items-center justify-center h-20 rounded-md border-2 border-dashed border-muted-foreground/20 text-muted-foreground text-xs">
        Kéo thả task vào đây
      </div>
    {:else}
      {#each tasks as task (task.id)}
        <KanbanCard
          {task}
          {displayProperties}
          {metadata}
          {onTaskClick}
          ondragstart={(e) => { handleDragStart(e, task); }}
        />
      {/each}
    {/if}
    
    <!-- Add Task Button -->
    <button
      class="w-full rounded-md border-2 border-dashed border-muted-foreground/20 bg-muted/10 hover:bg-muted/30 hover:border-muted-foreground/40 transition-colors p-2 text-xs text-muted-foreground flex items-center justify-center gap-1.5 group"
      onclick={() => { onCreateTask?.(status); }}
      type="button"
    >
      <Plus class="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
      <span>Tạo task mới</span>
    </button>
  </div>
</div>
