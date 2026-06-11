<script lang="ts">
  import type { TaskDetail } from '@/apps/org/modules/tasks/types/index.svelte'

  interface Props {
    task: TaskDetail
    statusName: string
  }

  const { task, statusName }: Props = $props()
  const normalizedStatusName = $derived(
    statusName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  )
</script>

<div
  class="text-[11px] inline-flex items-center whitespace-nowrap font-medium"
  style:color={
    normalizedStatusName.includes('done') || normalizedStatusName.includes('hoan thanh') ? 'rgb(34, 197, 94)' :
    normalizedStatusName.includes('progress') || normalizedStatusName.includes('dang') ? 'rgb(59, 130, 246)' :
    normalizedStatusName.includes('pending') || normalizedStatusName.includes('cho') ? 'rgb(249, 115, 22)' :
    normalizedStatusName.includes('todo') || normalizedStatusName.includes('can') ? 'rgb(100, 116, 139)' :
    'currentColor'
  }
>
  <span
    class="h-1.5 w-1.5 rounded-full mr-1"
    style:background-color={
      normalizedStatusName.includes('done') || normalizedStatusName.includes('hoan thanh') ? 'rgb(34, 197, 94)' :
      normalizedStatusName.includes('progress') || normalizedStatusName.includes('dang') ? 'rgb(59, 130, 246)' :
      normalizedStatusName.includes('pending') || normalizedStatusName.includes('cho') ? 'rgb(249, 115, 22)' :
      normalizedStatusName.includes('todo') || normalizedStatusName.includes('can') ? 'rgb(100, 116, 139)' :
      'currentColor'
    }
  ></span>
  {task.status}
</div>
