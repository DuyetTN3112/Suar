<script lang="ts">
  interface Props {
    priority?: string
    priorityName: string
  }

  const { priority, priorityName }: Props = $props()
</script>

<div
  class="text-[11px] inline-flex items-center whitespace-nowrap font-medium"
  style:color={
    priorityName.includes('urgent') || priorityName.includes('khẩn') ? 'rgb(220, 38, 38)' :
    priorityName.includes('high') || priorityName.includes('cao') ? 'rgb(249, 115, 22)' :
    priorityName.includes('medium') || priorityName.includes('trung') ? 'rgb(139, 92, 246)' :
    priorityName.includes('low') || priorityName.includes('thấp') ? 'rgb(34, 197, 94)' :
    'currentColor'
  }
>
  <span
    class="h-1.5 w-1.5 rounded-full mr-1"
    style:background-color={
      priorityName.includes('urgent') || priorityName.includes('khẩn') ? 'rgb(220, 38, 38)' :
      priorityName.includes('high') || priorityName.includes('cao') ? 'rgb(249, 115, 22)' :
      priorityName.includes('medium') || priorityName.includes('trung') ? 'rgb(139, 92, 246)' :
      priorityName.includes('low') || priorityName.includes('thấp') ? 'rgb(34, 197, 94)' :
      'currentColor'
    }
  ></span>
  {priority}
</div>
