<script lang="ts">
  import type { Task } from '../../../types.svelte'
  import type { TaskStore } from '@/stores/tasks.svelte'
  import KanbanColumn from './kanban_column.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  interface Props {
    store: TaskStore
    metadata: {
      statuses: Array<{ value: string; label: string; color?: string }>
      labels: Array<{ value: string; label: string; color?: string }>
      priorities: Array<{ value: string; label: string; color?: string }>
      users: Array<{ id: string; username: string; email: string }>
    }
    onTaskClick?: (task: Task) => void
  }

  const { store, metadata, onTaskClick }: Props = $props()
  const { t } = useTranslation()

  // Fixed column order matching backend enum
  const columnOrder: Array<{ key: string; label: string }> = [
    { key: 'todo', label: t('task.status_todo', {}, 'Chờ xử lý') },
    { key: 'in_progress', label: t('task.status_in_progress', {}, 'Đang thực hiện') },
    { key: 'in_review', label: t('task.status_in_review', {}, 'Đang review') },
    { key: 'done', label: t('task.status_done', {}, 'Hoàn thành') },
    { key: 'cancelled', label: t('task.status_cancelled', {}, 'Đã hủy') },
  ]

  function handleDropTask(taskId: string, newStatus: string, sortOrder: number) {
    store.moveTaskStatus(taskId, newStatus as Task['status'], sortOrder)
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
    <div class="flex gap-4 px-1">
      {#each columnOrder as column (column.key)}
        <KanbanColumn
          status={column.key}
          label={column.label}
          tasks={store.tasksByStatus[column.key] ?? []}
          displayProperties={store.displayProperties}
          {metadata}
          {onTaskClick}
          onDropTask={handleDropTask}
        />
      {/each}
    </div>
  {/if}
</div>
