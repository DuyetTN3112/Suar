<script lang="ts">
  import { User } from 'lucide-svelte'

  import type { TaskDetail } from '@/apps/user/modules/tasks/types/index.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  interface Props {
    task: TaskDetail
  }

  const { task }: Props = $props()
  const { t } = useTranslation()
</script>

<div class="flex items-center gap-1">
  <User class="h-3 w-3 text-muted-foreground flex-shrink-0" />
  {#if task.assignee}
    <span class="text-[11px] truncate">
      {task.assignee.username || task.assignee.email || `User #${task.assignee.id}`}
    </span>
  {:else}
    <span class="text-[11px] text-muted-foreground">{t('task.unassigned', {}, 'Unassigned')}</span>
  {/if}
</div>
