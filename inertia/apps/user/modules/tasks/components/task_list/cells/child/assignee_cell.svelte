<script lang="ts">
  import { User } from 'lucide-svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  interface Props {
    assignee?: {
      id?: string
      username?: string
      email?: string
    }
  }

  const { assignee }: Props = $props()
  const { t } = useTranslation()

  const assigneeLabel = $derived(
    assignee
      ? (assignee.username ?? assignee.email) ?? (assignee.id ? `User #${assignee.id}` : t('task.unassigned', {}, 'Unassigned'))
      : t('task.unassigned', {}, 'Unassigned')
  )
</script>

<div class="flex items-center gap-1">
  <User class="h-3 w-3 text-muted-foreground flex-shrink-0" />
  {#if assignee}
    <span class="text-[11px] truncate">
      {assigneeLabel}
    </span>
  {:else}
    <span class="text-[11px] text-muted-foreground">{t('task.unassigned', {}, 'Unassigned')}</span>
  {/if}
</div>
