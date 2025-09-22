<script lang="ts">
  import {
    GripVertical,
    Calendar,
    User,
    CircleAlert,
    Clock,
  } from 'lucide-svelte'

  import type { TaskDisplayProperties } from '@/stores/tasks.svelte'

  import type { Task } from '../../../types.svelte'

  interface Props {
    task: Task
    displayProperties: TaskDisplayProperties
    metadata: {
      statuses: { value: string; label: string; color?: string }[]
      labels: { value: string; label: string; color?: string }[]
      priorities: { value: string; label: string; color?: string }[]
    }
    onTaskClick?: (task: Task) => void
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
  class="task-card {isMutating ? 'is-mutating' : ''}"
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
  title={isMutating ? 'Task đang đồng bộ' : task.title}
>
  <div class="task-title-row">
    <GripVertical class="task-grip" />
    <p>{task.title}</p>
  </div>

  <div class="task-tags">
    {#if displayProperties.priority}
      <span class="task-tag {priorityColors[task.priority] ?? ''}">
        {priorityLabel}
      </span>
    {/if}

    {#if displayProperties.label}
      <span class="task-tag {labelColors[task.label] ?? ''}">
        {labelLabel}
      </span>
    {/if}

    {#if displayProperties.difficulty && task.difficulty}
      <span class="task-tag muted">
        {task.difficulty}
      </span>
    {/if}
  </div>

  <div class="task-meta-row">
    <div class="task-meta-left">
      {#if displayProperties.assignee && task.assignee}
        <div class="task-meta" title={task.assignee.username}>
          <User class="h-3 w-3" />
          <span>{task.assignee.username}</span>
        </div>
      {/if}

      {#if displayProperties.estimatedTime && task.estimated_time}
        <div class="task-meta">
          <Clock class="h-3 w-3" />
          <span>{task.estimated_time}h</span>
        </div>
      {/if}
    </div>

    {#if displayProperties.dueDate && task.due_date}
      <div
        class="task-meta task-date {isOverdue()
          ? 'is-overdue'
          : isDueSoon()
            ? 'is-soon'
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

<style>
  .task-card {
    position: relative;
    border: 2px solid var(--suar-black);
    border-radius: 16px;
    background: rgba(255, 253, 248, .94);
    padding: 13px 13px 12px 34px;
    box-shadow: 4px 4px 0 rgba(22, 19, 15, .12);
    cursor: pointer;
    transition: transform .18s var(--ease-suar), box-shadow .18s var(--ease-suar), opacity .18s var(--ease-suar);
    user-select: none;
  }

  .task-card::before {
    content: "";
    position: absolute;
    left: 13px;
    top: 13px;
    width: 10px;
    height: 18px;
    opacity: .24;
    background-image: radial-gradient(currentColor 1.2px, transparent 1.2px);
    background-size: 5px 5px;
  }

  .task-card:hover {
    transform: translate(-1px, -2px) rotate(-.2deg);
    box-shadow: 6px 6px 0 var(--suar-black);
  }

  .task-card:focus-visible {
    outline: 3px solid rgba(255, 61, 22, .35);
    outline-offset: 2px;
  }

  .task-card.is-mutating {
    cursor: wait;
    opacity: .6;
  }

  .task-title-row {
    display: flex;
    align-items: flex-start;
    gap: 7px;
  }

  .task-grip {
    width: 15px;
    height: 15px;
    flex: 0 0 auto;
    margin-top: 3px;
    color: rgba(22, 19, 15, .28);
    cursor: grab;
  }

  .task-title-row p {
    display: -webkit-box;
    flex: 1;
    margin: 0;
    overflow: hidden;
    color: var(--suar-black);
    font-size: 15px;
    font-weight: 900;
    letter-spacing: -.01em;
    line-height: 1.42;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .task-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 10px;
  }

  .task-tag {
    display: inline-flex;
    min-height: 24px;
    align-items: center;
    border: 1.5px solid currentColor;
    border-radius: 999px;
    background: rgba(255, 255, 255, .78);
    padding: 0 8px;
    color: var(--suar-black);
    font-size: 12px;
    font-weight: 900;
    line-height: 1;
  }

  .task-tag.medium,
  .task-tag.feature {
    color: #304aff;
    background: #eaf0ff;
  }

  .task-tag.high,
  .task-tag.documentation {
    color: #f36b00;
    background: #fff0dc;
  }

  .task-tag.low,
  .task-tag.enhancement {
    color: #db1fd5;
    background: #ffe3fb;
  }

  .task-tag.urgent,
  .task-tag.bug {
    color: #e10020;
    background: #ffe4e8;
  }

  .task-tag.muted {
    color: var(--suar-ink-56);
    background: rgba(22, 19, 15, .05);
  }

  .task-meta-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 11px;
    color: #6b7180;
    font-size: 12px;
    font-weight: 750;
  }

  .task-meta-left,
  .task-meta {
    display: flex;
    align-items: center;
    gap: 7px;
    min-width: 0;
  }

  .task-meta-left {
    gap: 10px;
  }

  .task-meta span {
    display: block;
    max-width: 82px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .task-date {
    flex: 0 0 auto;
  }

  .task-date.is-soon {
    color: #f36b00;
  }

  .task-date.is-overdue {
    color: var(--suar-orange);
  }
</style>
