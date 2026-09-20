<script lang="ts">
  import Button from '@/apps/org/shared/ui/button.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'
  import type { TaskHistoryEntry } from '@/apps/shared/projects/project_sprint_types'

  interface Props {
    historyTaskId: string | null
    taskHistory: TaskHistoryEntry[]
    onClose: () => void
  }

  const {
    historyTaskId = $bindable(null),
    taskHistory,
    onClose,
  }: Props = $props()

  const { t } = useTranslation()
</script>

{#if historyTaskId}
  <div class="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="presentation">
    <div class="w-full max-w-xl rounded-xl border border-border bg-background p-5 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="history-title" tabindex="-1">
      <h2 id="history-title" class="text-lg font-black">{t('project.sprint_panel.history_title', {}, 'Assignment history')}</h2>
      <div class="mt-4 grid gap-2">
        {#each taskHistory as entry (entry.id)}
          <div class="rounded-lg border border-border p-3 text-sm">
            <div class="font-bold">{entry.sprintId ?? t('project.sprint_panel.backlog_title', {}, 'Product Backlog')}</div>
            <div class="text-xs text-muted-foreground">{entry.entryReason} → {entry.exitReason ?? t('project.sprint_panel.current', {}, 'current')}</div>
          </div>
        {/each}
      </div>
      <div class="mt-5 flex justify-end"><Button variant="outline" onclick={onClose}>{t('project.sprint_panel.close', {}, 'Close')}</Button></div>
    </div>
  </div>
{/if}
