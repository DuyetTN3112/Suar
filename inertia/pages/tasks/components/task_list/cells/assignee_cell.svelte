<script lang="ts">
  import { User } from 'lucide-svelte'

  import type { Task } from '../../../types.svelte'

  interface Props {
    task: Task
  }

  const { task }: Props = $props()
</script>

<div class="flex items-center gap-1">
  <User class="h-3 w-3 text-muted-foreground flex-shrink-0" />
  {#if task.assignee}
    <span class="text-[11px] truncate">
      {task.assignee.username || task.assignee.email || `User #${task.assignee.id}`}
    </span>
  {:else}
    <span class="text-[11px] text-muted-foreground">Chưa gán</span>
  {/if}
</div>
