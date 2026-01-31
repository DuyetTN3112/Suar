<script lang="ts">
  import Table from '@/components/ui/table.svelte'
  import TableBody from '@/components/ui/table_body.svelte'
  import TableCell from '@/components/ui/table_cell.svelte'
  import TableHead from '@/components/ui/table_head.svelte'
  import TableHeader from '@/components/ui/table_header.svelte'
  import TableRow from '@/components/ui/table_row.svelte'
  import Checkbox from '@/components/ui/checkbox.svelte'
  import type { Task } from '../../types.svelte.ts'
  import TaskListRow from './task_list_row.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  interface TaskListProps {
    tasks: Task[]
    selectedTasks: number[]
    expandedTasks: number[]
    isTaskSelected: (taskId: number) => boolean
    isAllSelected: boolean
    handleSelectAll: (checked: boolean) => void
    handleSelectTask: (taskId: number, checked: boolean) => void
    toggleExpandTask: (taskId: number) => void
    isTaskExpanded: (taskId: number) => boolean
    currentUserInfo: {
      id?: string | number
      role?: string
      organization_id?: string | number
    }
    completedStatusId?: number
    formatDate: (dateString: string) => string
    onTaskClick?: (task: Task) => void
  }

  const {
    tasks,
    isTaskSelected,
    isAllSelected,
    handleSelectAll,
    handleSelectTask,
    toggleExpandTask,
    isTaskExpanded,
    currentUserInfo,
    completedStatusId,
    formatDate,
    onTaskClick
  }: TaskListProps = $props()

  const { t } = useTranslation()

  function handleSelectAllChange(checked: boolean | 'indeterminate') {
    handleSelectAll(checked === true)
  }

  function isTaskCompleted(task: Task): boolean {
    if (!completedStatusId) return false

    return task.status_id === completedStatusId ||
           (task.status?.name?.toLowerCase().includes('done') ||
            task.status?.name?.toLowerCase().includes('hoàn thành'))
  }

  function hasChildTasks(task: Task): boolean {
    return Boolean(task.childTasks && task.childTasks.length > 0)
  }
</script>

<Table class="w-full">
  <TableHeader>
    <TableRow class="h-9">
      <TableHead class="w-7.5 px-2 py-2">
        <Checkbox
          checked={isAllSelected}
          onCheckedChange={handleSelectAllChange}
          class="h-4 w-4"
        />
      </TableHead>
      <TableHead class="w-25 px-2 py-2 text-xs">{t('task.task', {}, 'Task')}</TableHead>
      <TableHead class="px-2 py-2 text-xs">{t('task.title', {}, 'Title')}</TableHead>
      <TableHead class="w-25 px-2 py-2 text-xs">{t('task.status', {}, 'Status')}</TableHead>
      <TableHead class="w-25 px-2 py-2 text-xs">{t('task.label', {}, 'Label')}</TableHead>
      <TableHead class="w-25 px-2 py-2 text-xs">{t('task.priority', {}, 'Priority')}</TableHead>
      <TableHead class="w-37.5 px-2 py-2 text-xs">{t('task.assigned_to', {}, 'Assigned To')}</TableHead>
      <TableHead class="w-25 px-2 py-2 text-xs">{t('task.created_at', {}, 'Created At')}</TableHead>
      <TableHead class="w-25 px-2 py-2 text-xs">{t('task.due_date', {}, 'Due Date')}</TableHead>
      <TableHead class="w-7.5 px-2 py-2"></TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {#if tasks.length === 0}
      <TableRow>
        <TableCell colspan={10} class="h-12 text-center text-xs">
          {t('task.no_tasks', {}, 'Không có nhiệm vụ nào phù hợp với bộ lọc')}
        </TableCell>
      </TableRow>
    {:else}
      {#each tasks as task (task.id)}
        <TaskListRow
          {task}
          {isTaskSelected}
          {handleSelectTask}
          {hasChildTasks}
          {isTaskExpanded}
          {toggleExpandTask}
          {isTaskCompleted}
          {currentUserInfo}
          {formatDate}
          onTaskClick={onTaskClick}
        />
      {/each}
    {/if}
  </TableBody>
</Table>
