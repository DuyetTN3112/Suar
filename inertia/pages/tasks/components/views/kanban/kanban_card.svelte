<script lang="ts">
  import type { Task } from '../../../types.svelte'
  import type { TaskDisplayProperties } from '@/stores/tasks.svelte'
  import {
    GripVertical,
    Calendar,
    User,
    CircleAlert,
    Clock,
  } from 'lucide-svelte'

  interface Props {
    task: Task
    displayProperties: TaskDisplayProperties
    metadata: {
      statuses: Array<{ value: string; label: string; color?: string }>
      labels: Array<{ value: string; label: string; color?: string }>
      priorities: Array<{ value: string; label: string; color?: string }>
    }
    onTaskClick?: (task: Task) => void
    ondragstart?: (e: DragEvent) => void
  }

  const { task, displayProperties, metadata, onTaskClick, ondragstart }: Props = $props()

  const priorityColors: Record<string, string> = {
    urgent: 'border border-red-300 bg-red-100 text-red-900',
    high: 'border border-orange-300 bg-orange-100 text-orange-900',
    medium: 'border border-blue-300 bg-blue-100 text-blue-900',
    low: 'border border-fuchsia-300 bg-fuchsia-100 text-fuchsia-900',
  }

  const labelColors: Record<string, string> = {
    bug: 'border border-red-300 bg-red-100 text-red-900',
    feature: 'border border-blue-300 bg-blue-100 text-blue-900',
    enhancement: 'border border-fuchsia-300 bg-fuchsia-100 text-fuchsia-900',
    documentation: 'border border-orange-300 bg-orange-100 text-orange-900',
  }

  const priorityLabel = $derived(
    metadata.priorities.find(p => p.value === task.priority)?.label ?? task.priority
  )
  const labelLabel = $derived(
    metadata.labels.find(l => l.value === task.label)?.label ?? task.label
  )

  function formatDueDate(date: string | null): string {
    if (!date) return ''
    const d = new Date(date)
    const now = new Date()
    const diff = d.getTime() - now.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

    if (days < 0) return `${Math.abs(days)}d overdue`
    if (days === 0) return 'Today'
    if (days === 1) return 'Tomorrow'
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
  }

  const isDueSoon = $derived(() => {
    if (!task.due_date) return false
    const diff = new Date(task.due_date).getTime() - Date.now()
    return diff < 2 * 24 * 60 * 60 * 1000 // 2 days
  })

  const isOverdue = $derived(() => {
    if (!task.due_date) return false
    return new Date(task.due_date).getTime() < Date.now()
  })
</script>

<div
  class="group rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-all cursor-pointer select-none"
  draggable="true"
  {ondragstart}
  onclick={() => onTaskClick?.(task)}
  onkeydown={(e) => { if (e.key === 'Enter') onTaskClick?.(task) }}
  role="button"
  tabindex="0"
>
  <!-- Drag Handle + Title -->
  <div class="flex items-start gap-2">
    <GripVertical class="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground mt-0.5 shrink-0 cursor-grab" />
    <p class="text-sm font-medium leading-snug line-clamp-2 flex-1">{task.title}</p>
  </div>

  <!-- Metadata row -->
  <div class="flex flex-wrap items-center gap-1.5 mt-2">
    {#if displayProperties.priority}
      <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold {priorityColors[task.priority] ?? 'border border-muted bg-muted/40 text-foreground'}">
        {priorityLabel}
      </span>
    {/if}

    {#if displayProperties.label}
      <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold {labelColors[task.label] ?? 'border border-muted bg-muted/40 text-foreground'}">
        {labelLabel}
      </span>
    {/if}

    {#if displayProperties.difficulty && task.difficulty}
      <span class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
        {task.difficulty}
      </span>
    {/if}
  </div>

  <!-- Bottom row: assignee, due date -->
  <div class="flex items-center justify-between mt-2.5 text-xs text-muted-foreground">
    <div class="flex items-center gap-2">
      {#if displayProperties.assignee && task.assignee}
        <div class="flex items-center gap-1" title={task.assignee.username}>
          <User class="h-3 w-3" />
          <span class="max-w-[80px] truncate">{task.assignee.username}</span>
        </div>
      {/if}

      {#if displayProperties.estimatedTime && task.estimated_time}
        <div class="flex items-center gap-1">
          <Clock class="h-3 w-3" />
          <span>{task.estimated_time}h</span>
        </div>
      {/if}
    </div>

    {#if displayProperties.dueDate && task.due_date}
      <div
        class="flex items-center gap-1 {isOverdue()
          ? 'text-red-500'
          : isDueSoon()
            ? 'text-orange-500'
            : ''}"
      >
        {#if isOverdue()}
          <CircleAlert class="h-3 w-3" />
        {:else}
          <Calendar class="h-3 w-3" />
        {/if}
        <span>{formatDueDate(task.due_date)}</span>
      </div>
    {/if}
  </div>
</div>
