<script lang="ts">
  import type { Task } from '../../../types.svelte'

  interface Props {
    task: Task
    statusName: string
  }

  const { task, statusName }: Props = $props()
</script>

<div
  class="text-[11px] inline-flex items-center whitespace-nowrap font-medium"
  style:color={
    statusName.includes('done') || statusName.includes('hoàn thành') ? 'rgb(34, 197, 94)' :
    statusName.includes('progress') || statusName.includes('đang') ? 'rgb(59, 130, 246)' :
    statusName.includes('pending') || statusName.includes('chờ') ? 'rgb(249, 115, 22)' :
    statusName.includes('todo') || statusName.includes('cần') ? 'rgb(100, 116, 139)' :
    'currentColor'
  }
>
  <span
    class="h-1.5 w-1.5 rounded-full mr-1"
    style:background-color={
      statusName.includes('done') || statusName.includes('hoàn thành') ? 'rgb(34, 197, 94)' :
      statusName.includes('progress') || statusName.includes('đang') ? 'rgb(59, 130, 246)' :
      statusName.includes('pending') || statusName.includes('chờ') ? 'rgb(249, 115, 22)' :
      statusName.includes('todo') || statusName.includes('cần') ? 'rgb(100, 116, 139)' :
      'currentColor'
    }
  ></span>
  {task.status}
</div>
