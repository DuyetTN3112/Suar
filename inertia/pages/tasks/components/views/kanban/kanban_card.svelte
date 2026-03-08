<script lang="ts">
  import type { Task } from '../../../types.svelte'
  import type { TaskDisplayProperties } from '@/stores/tasks.svelte'
  import {
    GripVertical,
    Calendar,
    User,
    AlertCircle,
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
    urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  }

  const labelColors: Record<string, string> = {
    bug: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
    feature: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
    enhancement: 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
    documentation: 'bg-teal-50 text-teal-600 border-teal-200 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800',
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
      <span class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium {priorityColors[task.priority] ?? 'bg-muted text-muted-foreground'}">
        {priorityLabel}
      </span>
    {/if}

    {#if displayProperties.label}
      <span class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium border {labelColors[task.label] ?? 'bg-muted text-muted-foreground border-border'}">
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
            ? 'text-amber-500'
            : ''}"
      >
        {#if isOverdue()}
          <AlertCircle class="h-3 w-3" />
        {:else}
          <Calendar class="h-3 w-3" />
        {/if}
        <span>{formatDueDate(task.due_date)}</span>
      </div>
    {/if}
  </div>
</div>
