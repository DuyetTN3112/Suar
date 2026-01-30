<script lang="ts">
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface Props {
    recentSearches: string[]
    selectRecentSearch: (recentQuery: string) => void
    removeRecentSearch: (recentQuery: string) => void
  }

  const { recentSearches, selectRecentSearch, removeRecentSearch }: Props = $props()
  const { t } = useTranslation()
</script>

<div class="rounded-2xl border border-border bg-background p-4">
  <div class="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
    {t('workspace.search.recent.title', {}, 'Recent searches')}
  </div>
  <div class="flex flex-wrap gap-2">
    {#each recentSearches as recentQuery}
      <span class="inline-flex overflow-hidden rounded-lg border border-border">
        <button
          class="px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted/30"
          type="button"
          onclick={() => selectRecentSearch(recentQuery)}
        >
          {recentQuery}
        </button>
        <button
          aria-label={t(
            'workspace.search.recent.remove_aria',
            { query: recentQuery },
            'Remove :query from recent searches'
          )}
          class="border-l border-border px-2 py-2 text-sm font-bold text-muted-foreground transition hover:bg-muted/30 hover:text-foreground"
          type="button"
          onclick={() => removeRecentSearch(recentQuery)}
        >
          <span aria-hidden="true">×</span>
          <span class="sr-only">{t('workspace.search.recent.remove', {}, 'Remove')}</span>
        </button>
      </span>
    {/each}
  </div>
</div>
