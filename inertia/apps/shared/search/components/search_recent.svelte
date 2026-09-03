<script lang="ts">
  import { History, X } from 'lucide-svelte'
  import { defaultTranslate, type TranslateFn } from '../lib/translation'

  interface Props {
    recentSearches: string[]
    selectRecentSearch: (query: string) => void
    removeRecentSearch: (query: string) => void
    t?: TranslateFn
  }

  const {
    recentSearches,
    selectRecentSearch,
    removeRecentSearch,
    t = defaultTranslate,
  }: Props = $props()
</script>

<div class="rounded-2xl border border-border bg-background p-4 shadow-suar-xs">
  <div class="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
    <History class="size-4" />
    <span>{t('workspace.search.recent.title', {}, 'Recent searches')}</span>
  </div>
  <div class="flex flex-wrap gap-2">
    {#each recentSearches as item}
      <span class="inline-flex items-center gap-1 rounded-xl border border-border bg-muted/20 px-3 py-1.5 text-xs font-semibold text-foreground">
        <button
          class="hover:underline"
          type="button"
          onclick={() => selectRecentSearch(item)}
        >
          {item}
        </button>
        <button
          class="rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          type="button"
          aria-label={t('workspace.search.recent.remove_aria', { query: item }, 'Remove :query from recent searches')}
          onclick={() => removeRecentSearch(item)}
        >
          <X class="size-3.5" />
        </button>
      </span>
    {/each}
  </div>
</div>
