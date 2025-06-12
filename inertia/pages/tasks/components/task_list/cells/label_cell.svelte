<script lang="ts">
  import type { Task } from '../../../types.svelte'

  interface Props {
    task: Task
  }

  const { task }: Props = $props()

  const labelStyles: Record<string, string> = {
    bug: 'border border-red-300 bg-red-100 text-red-900',
    feature: 'border border-blue-300 bg-blue-100 text-blue-900',
    enhancement: 'border border-emerald-300 bg-emerald-100 text-emerald-900',
    documentation: 'border border-amber-300 bg-amber-100 text-amber-900',
  }

</script>

{#if task.label}
  <div
    class="text-xs inline-flex items-center whitespace-nowrap font-semibold rounded-full px-2 py-0.5 {labelStyles[(task.label || '').toLowerCase()] ?? 'border border-muted bg-muted/40 text-foreground'}"
  >
    {task.label}
  </div>
{:else}
  <span class="text-xs text-muted-foreground">-</span>
{/if}
