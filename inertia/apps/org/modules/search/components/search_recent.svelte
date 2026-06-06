<script lang="ts">
  interface Props {
    recentSearches: string[]
    selectRecentSearch: (recentQuery: string) => void
    removeRecentSearch: (recentQuery: string) => void
  }

  const { recentSearches, selectRecentSearch, removeRecentSearch }: Props = $props()
</script>

<div class="rounded-2xl border border-border bg-background p-4">
  <div class="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
    Recent searches
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
          aria-label={`Remove ${recentQuery} from recent searches`}
          class="border-l border-border px-2 py-2 text-sm font-bold text-muted-foreground transition hover:bg-muted/30 hover:text-foreground"
          type="button"
          onclick={() => removeRecentSearch(recentQuery)}
        >
          x
        </button>
      </span>
    {/each}
  </div>
</div>
