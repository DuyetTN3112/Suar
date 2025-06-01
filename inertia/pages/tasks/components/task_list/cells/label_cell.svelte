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
  >
    <span
      class="h-1.5 w-1.5 rounded-full mr-1"
    ></span>
    {task.label}
  </div>
{:else}
  <span class="text-[11px] text-muted-foreground">-</span>
{/if}
