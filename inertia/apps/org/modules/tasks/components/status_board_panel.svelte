<script lang="ts">
  import { canEditItem } from '@/apps/org/modules/tasks/lib/rules/status_board_policy'
  import type { SliceItem } from '@/apps/org/modules/tasks/types/status_board_types'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface Props {
    items: SliceItem[]
    currentOrganizationRole: string | null
    onRefresh: () => void
    onEdit?: (item: SliceItem) => void
  }

  const { items, currentOrganizationRole, onRefresh, onEdit }: Props = $props()
  const { t } = useTranslation()
</script>

<section class="space-y-4 rounded-xl border border-border bg-card p-5 shadow-suar-xs">
  <div class="flex items-center justify-between">
    <h2 class="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t('task.status_board.list_title', {}, 'List')}</h2>
    <button
      type="button"
      class="rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-semibold hover:bg-secondary/80 transition-colors"
      onclick={onRefresh}
    >
      {t('common.refresh', {}, 'Refresh')}
    </button>
  </div>

  {#if items.length === 0}
    <p class="py-4 text-xs text-muted-foreground">{t('task.status_board.empty', {}, 'No items yet.')}</p>
  {:else}
    <ul class="space-y-2">
      {#each items as item (item.id)}
        <li class="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm bg-secondary/20">
          <span class="font-medium">{item.name}</span>
          {#if canEditItem(item, currentOrganizationRole) && onEdit}
            <button
              type="button"
              class="text-xs text-primary hover:underline font-semibold"
              onclick={() => {
                onEdit(item)
              }}
            >
              {t('common.edit', {}, 'Edit')}
            </button>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</section>
