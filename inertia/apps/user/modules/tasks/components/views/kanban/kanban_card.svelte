<script lang="ts">
  import {
    GripVertical,
    Calendar,
    User,
    CircleAlert,
    Clock,
  } from 'lucide-svelte'

  import type { TaskDisplayProperties } from '@/apps/user/modules/tasks/stores/tasks.svelte'

  import type { TaskDetail } from '@/apps/user/modules/tasks/types/index.svelte'
  import { currentDocumentLocale } from '@/apps/user/shared/lib/date_locale'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  interface Props {
    task: TaskDetail
    displayProperties: TaskDisplayProperties
    metadata: {
      statuses: { value: string; label: string; color?: string }[]
      labels: { value: string; label: string; color?: string }[]
      priorities: { value: string; label: string; color?: string }[]
    }
    onTaskClick?: (task: TaskDetail) => void
    onDragStart?: (e: DragEvent) => void
    isMutating?: boolean
  }

  const {
    task,
    displayProperties,
    metadata,
    onTaskClick,
    onDragStart,
    isMutating = false,
  }: Props = $props()

  const { t } = useTranslation()
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')
  const shortDateFormatter = $derived(
    new Intl.DateTimeFormat(documentLocale, {
      day: '2-digit',
      month: '2-digit',
    })
  )

  const priorityColors: Record<string, string> = {
    urgent: 'urgent',
    high: 'high',
    medium: 'medium',
    low: 'low',
  }

  const labelColors: Record<string, string> = {
    bug: 'bug',
    feature: 'feature',
    enhancement: 'enhancement',
    documentation: 'documentation',
  }

  const priorityLabel = $derived(
    metadata.priorities.find(p => p.value === task.priority)?.label ?? task.priority
  )
  const labelLabel = $derived(
    metadata.labels.find(l => l.value === task.label)?.label ?? task.label
  )

  const priorityClass = $derived(priorityColors[task.priority] ?? '')
  const labelClass = $derived(labelColors[task.label] ?? '')

  function formatDueDate(date: string | null): string {
    if (!date) return ''
    const d = new Date(date)
    const now = new Date()
    const diff = d.getTime() - now.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

    if (days < 0) {
      const count = Math.abs(days)
      return t('task.kanban_card.overdue_days', { count }, `${count}d overdue`)
    }
    if (days === 0) return t('task.kanban_card.today', {}, 'Today')
    if (days === 1) return t('task.kanban_card.tomorrow', {}, 'Tomorrow')
    return shortDateFormatter.format(d)
  }

  const isDueSoon = $derived(() => {
    if (!task.due_date) return false
    const diff = new Date(task.due_date).getTime() - Date.now()
    return diff < 2 * 24 * 60 * 60 * 1000
  })

  const isOverdue = $derived(() => {
    if (!task.due_date) return false
    return new Date(task.due_date).getTime() < Date.now()
  })
</script>

<div
  class={`relative rounded-xl border border-border bg-background px-3 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
    isMutating ? 'cursor-wait opacity-60' : 'cursor-pointer'
  }`}
  draggable={isMutating ? 'false' : 'true'}
  ondragstart={(e) => onDragStart?.(e)}
  onclick={() => onTaskClick?.(task)}
  onkeydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onTaskClick?.(task)
    }
  }}
  role="button"
  tabindex="0"
  aria-disabled={isMutating}
  title={isMutating ? t('task.kanban_card.syncing', {}, 'Task syncing') : task.title}
>
  <div class="flex items-start gap-2">
    <GripVertical class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
    <p class="line-clamp-2 flex-1 text-sm font-extrabold leading-5 text-foreground">{task.title}</p>
  </div>

  <div class="mt-2.5 flex flex-wrap gap-1.5">
    {#if displayProperties.priority}
      <span class={`inline-flex min-h-6 items-center rounded-full border px-2 py-0.5 text-[11px] font-extrabold ${
        priorityClass === 'medium'
          ? 'border-primary/30 bg-primary/10 text-primary'
          : priorityClass === 'high'
            ? 'border-border bg-secondary/40 text-foreground'
            : priorityClass === 'low'
              ? 'border-border bg-muted text-muted-foreground'
              : priorityClass === 'urgent'
                ? 'border-destructive/30 bg-destructive/10 text-destructive'
                : 'border-border bg-background text-foreground'
      }`}>
        {priorityLabel}
      </span>
    {/if}

    {#if displayProperties.label}
      <span class={`inline-flex min-h-6 items-center rounded-full border px-2 py-0.5 text-[11px] font-extrabold ${
        labelClass === 'feature'
          ? 'border-primary/30 bg-primary/10 text-primary'
          : labelClass === 'documentation'
            ? 'border-border bg-secondary/40 text-foreground'
            : labelClass === 'enhancement'
              ? 'border-border bg-accent text-accent-foreground'
              : labelClass === 'bug'
                ? 'border-destructive/30 bg-destructive/10 text-destructive'
                : 'border-border bg-background text-foreground'
      }`}>
        {labelLabel}
      </span>
    {/if}

    {#if displayProperties.difficulty && task.difficulty}
      <span class="inline-flex min-h-6 items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
        {task.difficulty}
      </span>
    {/if}
  </div>

  <div class="mt-3 flex items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
    <div class="flex min-w-0 items-center gap-2.5">
      {#if displayProperties.assignee && task.assignee}
        <div class="flex min-w-0 items-center gap-1.5" title={task.assignee.username}>
          <User class="h-3 w-3" />
          <span class="max-w-20 truncate">{task.assignee.username}</span>
        </div>
      {/if}

      {#if displayProperties.estimatedTime && task.estimated_time}
        <div class="flex items-center gap-1.5">
          <Clock class="h-3 w-3" />
          <span>{task.estimated_time}h</span>
        </div>
      {/if}
    </div>

    {#if displayProperties.dueDate && task.due_date}
      <div
        class={`flex shrink-0 items-center gap-1.5 ${
          isOverdue() ? 'text-destructive' : isDueSoon() ? 'text-primary' : 'text-muted-foreground'
        }`}
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
