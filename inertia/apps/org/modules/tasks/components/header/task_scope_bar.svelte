<script lang="ts">
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface CreateTaskPermission {
    allowed: boolean
    reason: string | null
  }

  interface Props {
    createTaskPermission: CreateTaskPermission
    isBoardMutationLocked?: boolean
  }

  const { isBoardMutationLocked = false }: Props = $props()
  const { t } = useTranslation()
</script>

{#if isBoardMutationLocked}
  <div class="mb-3 flex flex-wrap items-center justify-end gap-3 border-b border-border pb-3">
    <div class="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
      <span class="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
      {t('task.workflow.board_sync_title', {}, 'Board is syncing')}
    </div>
  </div>
{/if}
