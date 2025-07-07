<script lang="ts">
  import { CalendarIcon } from 'lucide-svelte'

  import type { Task } from '../../../types.svelte'

  interface Props {
    task: Task
    formatDate: (dateString: string) => string
  }

  const { task, formatDate }: Props = $props()

  const isOverdue = $derived(task.due_date ? new Date(task.due_date) < new Date() : false)
</script>

<div class="flex items-center gap-1">
  <CalendarIcon class="h-3 w-3 text-muted-foreground shrink-0" />
  {#if task.due_date}
    <span class="text-[11px] font-medium {isOverdue ? 'text-red-600' : 'text-violet-500'}">
      {formatDate(task.due_date)}
    </span>
  {:else}
    <span class="text-[11px] text-slate-500">-</span>
  {/if}
</div>
