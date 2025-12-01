<script lang="ts">
  import type { TaskDetail } from '@/apps/org/modules/tasks/types/index.svelte'

  interface Props {
    task: TaskDetail
    priorityName: string
  }

  const { task, priorityName }: Props = $props()
  const normalizedPriorityName = $derived(
    priorityName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  )
</script>

<div
  class="text-[11px] inline-flex items-center whitespace-nowrap font-medium"
  style:color={
    normalizedPriorityName.includes('urgent') || normalizedPriorityName.includes('khan') ? 'rgb(220, 38, 38)' :
    normalizedPriorityName.includes('high') || normalizedPriorityName.includes('cao') ? 'rgb(249, 115, 22)' :
    normalizedPriorityName.includes('medium') || normalizedPriorityName.includes('trung') ? 'rgb(139, 92, 246)' :
    normalizedPriorityName.includes('low') || normalizedPriorityName.includes('thap') ? 'rgb(34, 197, 94)' :
    'currentColor'
  }
>
  <span
    class="h-1.5 w-1.5 rounded-full mr-1"
    style:background-color={
      normalizedPriorityName.includes('urgent') || normalizedPriorityName.includes('khan') ? 'rgb(220, 38, 38)' :
      normalizedPriorityName.includes('high') || normalizedPriorityName.includes('cao') ? 'rgb(249, 115, 22)' :
      normalizedPriorityName.includes('medium') || normalizedPriorityName.includes('trung') ? 'rgb(139, 92, 246)' :
      normalizedPriorityName.includes('low') || normalizedPriorityName.includes('thap') ? 'rgb(34, 197, 94)' :
      'currentColor'
    }
  ></span>
  {task.priority}
</div>
