<script lang="ts">
  import type { Task } from '../../../types.svelte'

  interface Props {
    task: Task
  }

  const { task }: Props = $props()
</script>

{#if task.label}
  <div
    class="text-[11px] inline-flex items-center whitespace-nowrap font-medium"
    style:color={task.label?.color || 'currentColor'}
  >
    <span
      class="h-1.5 w-1.5 rounded-full mr-1"
      style:background-color={task.label?.color || 'currentColor'}
    ></span>
    {task.label?.name}
  </div>
{:else}
  <span class="text-[11px] text-muted-foreground">-</span>
{/if}
