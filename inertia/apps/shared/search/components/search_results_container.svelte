<script lang="ts">
  import type { DiscoveryPresentationHit } from '../discovery_presentation'
  import type { TranslateFn } from '../lib/translation'
  import type { SearchCenterResult, SearchDiscoveryPage } from '../types'
  import SearchDiscoveryResultItem from './search_discovery_result_item.svelte'
  import SearchResultItem from './search_result_item.svelte'

  interface Props {
    query: string
    visibleResultCount: number
    cursorFailure: boolean
    skippedAllSources: boolean
    allSourcesUnavailable: boolean
    discovery: SearchDiscoveryPage | null
    pagedResults: SearchCenterResult[]
    globalPage: number
    globalPageCount: number
    cursor?: string
    trackDiscoveryResult: (result: DiscoveryPresentationHit) => void
    trackResultClick: (result: SearchCenterResult) => void
    retrySearch: () => void
    previousDiscoveryPage: () => void
    nextDiscoveryPage: () => void
    previousGlobalPage: () => void
    nextGlobalPage: () => void
    t: TranslateFn
  }

  const {
    query,
    visibleResultCount,
    cursorFailure,
    skippedAllSources,
    allSourcesUnavailable,
    discovery,
    pagedResults,
    globalPage,
    globalPageCount,
    cursor,
    trackDiscoveryResult,
    trackResultClick,
    retrySearch,
    previousDiscoveryPage,
    nextDiscoveryPage,
    previousGlobalPage,
    nextGlobalPage,
    t,
  }: Props = $props()
</script>

{#if visibleResultCount === 0}
  <div
    class="rounded-2xl border border-border bg-background p-10 text-center"
    role="status"
    aria-live="polite"
    aria-atomic="true"
    aria-label={t('workspace.search.result_status_aria', {}, 'Search result status')}
  >
    {#if cursorFailure}
      <p class="text-sm font-bold text-foreground">
        {t(
          'workspace.search.cursor_results_unavailable',
          {},
          'Results are hidden until you start a fresh search.'
        )}
      </p>
      <p class="mt-2 text-sm text-muted-foreground">
        {t(
          'workspace.search.cursor_results_unavailable_description',
          {},
          'No compatibility results were substituted for this cursor failure.'
        )}
      </p>
    {:else if skippedAllSources}
      <p class="text-sm font-bold text-foreground">
        {t(
          'workspace.search.short_query',
          {},
          'Add one more character to search across Suar.'
        )}
      </p>
      <p class="mt-2 text-sm text-muted-foreground">
        {t(
          'workspace.search.short_query_description',
          {},
          'Short queries skip source fanout to keep search fast.'
        )}
      </p>
    {:else if allSourcesUnavailable}
      <p class="text-sm font-bold text-foreground">
        {t('workspace.search.sources_unavailable', {}, 'Search sources unavailable.')}
      </p>
      <p class="mt-2 text-sm text-muted-foreground">
        {t(
          'workspace.search.no_source_for_query',
          { query },
          'No source returned successfully for ":query".'
        )}
      </p>
      <button
        class="mt-5 rounded-lg border border-border bg-foreground px-4 py-2 text-sm font-bold text-background transition hover:bg-foreground/90"
        type="button"
        onclick={retrySearch}
      >
        {t('workspace.search.retry', {}, 'Retry search')}
      </button>
    {:else}
      <p class="text-sm font-bold text-foreground">
        {t('workspace.search.no_results', { query }, 'No results for ":query".')}
      </p>
      <p class="mt-2 text-sm text-muted-foreground">
        {t(
          'workspace.search.no_results_hint',
          {},
          'Try another keyword or switch back to All.'
        )}
      </p>
    {/if}
  </div>
{:else if discovery}
  {#each discovery.hits as result (result.id)}
    <SearchDiscoveryResultItem {query} {result} onclick={trackDiscoveryResult} {t} />
  {/each}
  {#if discovery.page.nextCursor || cursor}
    <nav
      class="flex items-center justify-between gap-2 border-t border-border/70 pt-3"
      aria-label={t('workspace.search.pagination_aria', {}, 'Search result pagination')}
    >
      <button
        class="rounded-lg border border-border px-3 py-2 text-xs font-bold text-muted-foreground transition hover:border-foreground/50 hover:text-foreground"
        type="button"
        onclick={previousDiscoveryPage}
      >
        {t('workspace.search.previous_page', {}, 'Previous page')}
      </button>
      {#if discovery.page.nextCursor}
        <button
          class="rounded-lg border border-border px-3 py-2 text-xs font-bold text-muted-foreground transition hover:border-foreground/50 hover:text-foreground"
          type="button"
          aria-label={t('workspace.search.next_page_aria', {}, 'Next page')}
          onclick={nextDiscoveryPage}
        >
          {t('workspace.search.next_page', {}, 'Next page')}
        </button>
      {/if}
    </nav>
  {/if}
{:else}
  {#each pagedResults as result (result.id)}
    <SearchResultItem {result} onclick={trackResultClick} {t} />
  {/each}
  {#if globalPageCount > 1}
    <nav
      class="flex items-center justify-end gap-2 border-t border-border/70 pt-3"
      aria-label={t('workspace.search.pagination_aria', {}, 'Search result pagination')}
    >
      <button
        class="rounded-lg border border-border px-3 py-2 text-xs font-bold text-muted-foreground transition hover:border-foreground/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        type="button"
        disabled={globalPage === 1}
        onclick={previousGlobalPage}
      >
        {t('workspace.search.previous_page', {}, 'Previous page')}
      </button>
      <span class="text-xs font-semibold text-muted-foreground">
        {globalPage} / {globalPageCount}
      </span>
      <button
        class="rounded-lg border border-border px-3 py-2 text-xs font-bold text-muted-foreground transition hover:border-foreground/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        type="button"
        disabled={globalPage === globalPageCount}
        onclick={nextGlobalPage}
      >
        {t('workspace.search.next_page', {}, 'Next page')}
      </button>
    </nav>
  {/if}
{/if}
