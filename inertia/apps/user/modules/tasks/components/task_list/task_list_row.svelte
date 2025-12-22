<script lang="ts">
  import { ChevronDown, ChevronRight } from 'lucide-svelte'

  import Checkbox from '@/apps/user/shared/ui/checkbox.svelte'
  import TableCell from '@/apps/user/shared/ui/table_cell.svelte'
  import TableRow from '@/apps/user/shared/ui/table_row.svelte'

  import type { TaskDetail } from '@/apps/user/modules/tasks/types/index.svelte'

  import AssigneeCell from '@/apps/user/modules/tasks/components/task_list/cells/assignee_cell.svelte'
  import DateCell from '@/apps/user/modules/tasks/components/task_list/cells/date_cell.svelte'
  import DueDateCell from '@/apps/user/modules/tasks/components/task_list/cells/due_date_cell.svelte'
  import LabelCell from '@/apps/user/modules/tasks/components/task_list/cells/label_cell.svelte'
  import PriorityCell from '@/apps/user/modules/tasks/components/task_list/cells/priority_cell.svelte'
  import StatusCell from '@/apps/user/modules/tasks/components/task_list/cells/status_cell.svelte'
  import ChildTaskRow from '@/apps/user/modules/tasks/components/task_list/child_task_row.svelte'
  import TaskItemDeleteButton from '@/apps/user/modules/tasks/components/task_list/task_item_delete_button.svelte'

  interface Props {
    task: TaskDetail
    isTaskSelected: (taskId: string) => boolean
    handleSelectTask: (taskId: string, checked: boolean) => void
    hasChildTasks: (task: TaskDetail) => boolean
    isTaskExpanded: (taskId: string) => boolean
    toggleExpandTask: (taskId: string) => void
    isTaskCompleted: (task: TaskDetail) => boolean
    currentUserInfo: {
      id?: string
      role?: string
      organization_id?: string
    }
    formatDate: (dateString: string) => string
    onTaskClick?: (task: TaskDetail) => void
  }

  const {
    task,
    isTaskSelected,
    handleSelectTask,
    hasChildTasks,
    isTaskExpanded,
    toggleExpandTask,
    isTaskCompleted,
    currentUserInfo,
    formatDate,
    onTaskClick
  }: Props = $props()

  const isCompleted = $derived(isTaskCompleted(task))
  const statusName = $derived((task.status || '').toLowerCase())
  const priorityName = $derived(task.priority.toLowerCase())
  const hasChildren = $derived(hasChildTasks(task))
  const isExpanded = $derived(isTaskExpanded(task.id))
  const titleClass = $derived(isCompleted ? 'line-through text-muted-foreground' : '')

  const handleTaskClick = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (onTaskClick) {
      onTaskClick(task)
    }
  }

  const handleExpandClick = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleExpandTask(task.id)
  }
</script>

<TableRow class="min-h-11">
  <TableCell class="px-2 py-1">
    <Checkbox
      id="select-task-{task.id}"
      checked={isTaskSelected(task.id)}
      onCheckedChange={(checked: boolean | 'indeterminate') => { handleSelectTask(task.id, checked === true) }}
      class="h-4 w-4"
    />
  </TableCell>
  <TableCell class="px-2 py-1 whitespace-nowrap text-xs">
    <div class="flex items-center gap-1">
      {#if hasChildren}
        <button
          onclick={handleExpandClick}
          class="h-4 w-4 rounded hover:bg-muted flex items-center justify-center"
        >
          {#if isExpanded}
            <ChevronDown class="h-3 w-3" />
          {:else}
            <ChevronRight class="h-3 w-3" />
          {/if}
        </button>
      {/if}
      <span>TASK-{task.id}</span>
    </div>
  </TableCell>
  <TableCell class="px-2 py-1 text-xs cursor-pointer" onclick={handleTaskClick}>
    <div class="flex flex-col {titleClass}">
      <span class="font-medium">{task.title}</span>
      {#if task.project}
        <span class="text-[10px] text-muted-foreground/70">
          <span class="inline-flex items-center">
            <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
              <path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
            </svg>
            {task.project.name}
          </span>
        </span>
      {/if}
      {#if task.description}
        <span class="text-[11px] text-muted-foreground line-clamp-1">{task.description}</span>
      {/if}
    </div>
  </TableCell>
  <TableCell class="px-2 py-1">
    <StatusCell {task} {statusName} />
  </TableCell>
  <TableCell class="px-2 py-1">
    <LabelCell {task} />
  </TableCell>
  <TableCell class="px-2 py-1">
    <PriorityCell {task} {priorityName} />
  </TableCell>
  <TableCell class="px-2 py-1 text-xs">
    <AssigneeCell {task} />
  </TableCell>
  <TableCell class="px-2 py-1 text-xs">
    <DateCell {task} {formatDate} />
  </TableCell>
  <TableCell class="px-2 py-1 text-xs">
    <DueDateCell {task} {formatDate} />
  </TableCell>
  <TableCell class="px-2 py-1">
    <TaskItemDeleteButton
      {task}
      currentUser={currentUserInfo}
    />
  </TableCell>
</TableRow>

{#if isExpanded && hasChildren && task.childTasks}
  {#each task.childTasks as childTask (childTask.id)}
    <ChildTaskRow
      {childTask}
      {isTaskSelected}
      {handleSelectTask}
      {formatDate}
      currentUserInfo={currentUserInfo}
    />
  {/each}
{/if}
