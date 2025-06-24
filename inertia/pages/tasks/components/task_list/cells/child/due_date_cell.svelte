<script lang="ts">
  import { CalendarIcon } from 'lucide-svelte'

  interface Props {
    dueDate?: string
    formatDate: (dateString: string) => string
  }

  const { dueDate, formatDate }: Props = $props()

  const isOverdue = $derived(dueDate ? new Date(dueDate) < new Date() : false)
</script>

<div class="flex items-center gap-1">
  <CalendarIcon class="h-3 w-3 text-muted-foreground flex-shrink-0" />
  {#if dueDate}
    <span class="text-[11px] font-medium {isOverdue ? 'text-red-600' : 'text-violet-500'}">
      {formatDate(dueDate)}
    </span>
  {:else}
    <span class="text-[11px] text-slate-500">-</span>
  {/if}
</div>
