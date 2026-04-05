<script lang="ts">
  import TableRow from '@/components/ui/table_row.svelte'
  import TableCell from '@/components/ui/table_cell.svelte'
  import Checkbox from '@/components/ui/checkbox.svelte'
  import type { Task } from '../../types.svelte'
  import TaskItemDeleteButton from './task_item_delete_button.svelte'
  import StatusCell from './cells/child/status_cell.svelte'
  import LabelCell from './cells/child/label_cell.svelte'
  import PriorityCell from './cells/child/priority_cell.svelte'
  import AssigneeCell from './cells/child/assignee_cell.svelte'
  import DateCell from './cells/child/date_cell.svelte'
  import DueDateCell from './cells/child/due_date_cell.svelte'
  import TaskDetailModal from '../modals/task_detail_modal.svelte'

  interface Props {
    childTask: Task
    isTaskSelected: (taskId: string) => boolean
    handleSelectTask: (taskId: string, checked: boolean) => void
    formatDate: (dateString: string) => string
    currentUserInfo: { id?: string; role?: string; organization_id?: string }
  }

  const { childTask, isTaskSelected, handleSelectTask, formatDate, currentUserInfo }: Props = $props()

  const statusName = $derived(childTask.status.toLowerCase())
  const priorityName = $derived(childTask.priority.toLowerCase())
  const detailStatuses = $derived([
    {
      value: childTask.task_status_id ?? childTask.status,
      label: childTask.status,
      color: '#94a3b8',
    },
  ])
  const detailPriorities = $derived([
    {
      value: childTask.priority,
      label: childTask.priority,
      color: '#94a3b8',
    },
  ])
  const detailLabels = $derived([
    {
      value: childTask.label,
      label: childTask.label,
      color: '#94a3b8',
    },
  ])
  let showDetailModal = $state(false)

  const openTaskDetail = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    showDetailModal = true
  }
</script>

<TableRow class="min-h-10 bg-muted/30">
  <TableCell class="px-2 py-1">
    <Checkbox
      id="select-subtask-{childTask.id}"
      checked={isTaskSelected(childTask.id)}
      onCheckedChange={(checked: boolean | 'indeterminate') => { handleSelectTask(childTask.id, checked === true) }}
      class="h-4 w-4"
    />
  </TableCell>
  <TableCell class="px-2 py-1 whitespace-nowrap text-xs">
    <div class="pl-4 flex items-center">
      <span class="text-muted-foreground">↳</span>
      <span class="ml-1">TASK-{childTask.id}</span>
    </div>
  </TableCell>
  <TableCell class="px-2 py-1 text-xs cursor-pointer" onclick={openTaskDetail}>
    <div class="flex flex-col">
      <span class="truncate">{childTask.title}</span>
      {#if childTask.description}
        <span class="text-[11px] text-muted-foreground line-clamp-1">{childTask.description}</span>
      {/if}
    </div>
  </TableCell>
  <TableCell class="px-2 py-1">
    <StatusCell status={childTask.status} {statusName} />
  </TableCell>
  <TableCell class="px-2 py-1">
    <LabelCell label={childTask.label} />
  </TableCell>
  <TableCell class="px-2 py-1">
    <PriorityCell priority={childTask.priority} {priorityName} />
  </TableCell>
  <TableCell class="px-2 py-1 text-xs">
    <AssigneeCell assignee={childTask.assignee} />
  </TableCell>
  <TableCell class="px-2 py-1 text-xs">
    <DateCell createdAt={childTask.created_at} {formatDate} />
  </TableCell>
  <TableCell class="px-2 py-1 text-xs">
    <DueDateCell dueDate={childTask.due_date ?? undefined} {formatDate} />
  </TableCell>
  <TableCell class="px-2 py-1">
    <TaskItemDeleteButton
      task={childTask}
      currentUser={currentUserInfo}
    />
  </TableCell>
</TableRow>

<TaskDetailModal
  bind:open={showDetailModal}
  task={childTask}
  statuses={detailStatuses}
  priorities={detailPriorities}
  labels={detailLabels}
  users={[]}
  currentUser={currentUserInfo}
/>
