<script lang="ts">
  import { Clock } from 'lucide-svelte'

  import type { TaskDetail } from '@/apps/user/modules/tasks/types/index.svelte'

  interface Props {
    task: TaskDetail
    formatDate: (dateString: string) => string
  }

  const { task, formatDate }: Props = $props()
</script>

<div class="flex items-center gap-1">
  <Clock class="h-3 w-3 text-muted-foreground flex-shrink-0" />
  {#if task.created_at}
    <span class="text-[11px]">{formatDate(task.created_at)}</span>
  {:else}
    <span class="text-[11px] text-muted-foreground">-</span>
  {/if}
</div>
