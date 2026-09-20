<script lang="ts">
  import type { TranslateFn } from '../lib/translation'
  import type { SourceStatus } from '../types'

  interface Props {
    failedSources: SourceStatus[]
    allSourcesUnavailable: boolean
    failedSourceSummary: string
    discoveryFailure?: { code: string }
    cursorFailure: boolean
    discoveryIsDegraded: boolean
    queryWasNormalized: boolean
    resultsTruncated: boolean
    resultLimit: number
    candidateResultCount: number
    retrySearch: () => void
    t: TranslateFn
  }

  const {
    failedSources,
    allSourcesUnavailable,
    failedSourceSummary,
    discoveryFailure,
    cursorFailure,
    discoveryIsDegraded,
    queryWasNormalized,
    resultsTruncated,
    resultLimit,
    candidateResultCount,
    retrySearch,
    t,
  }: Props = $props()
</script>

{#if failedSources.length > 0}
  <div
    class="rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground"
    role="status"
    aria-live="polite"
    aria-atomic="true"
    aria-label={t('workspace.search.source_status_aria', {}, 'Search source status')}
  >
    <div class="font-black">
      {allSourcesUnavailable
        ? t('workspace.search.search_unavailable', {}, 'Search unavailable')
        : t('workspace.search.partial_results', {}, 'Partial results')}
    </div>
    <div class="mt-1 text-muted-foreground">
      {failedSourceSummary}.
      {allSourcesUnavailable
        ? t(
            'workspace.search.no_source_succeeded',
            {},
            'No source returned successfully.'
          )
        : t(
            'workspace.search.other_sources_succeeded',
            {},
            'Other sources still returned normally.'
          )}
    </div>
  </div>
{/if}

{#if discoveryFailure && !cursorFailure}
  <div
    class="rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground"
    role="status"
    aria-live="polite"
    aria-atomic="true"
    aria-label={t('workspace.search.discovery_availability', {}, 'Search availability')}
  >
    <div class="font-black">
      {t(
        'workspace.search.discovery_compatibility_mode',
        {},
        'Search is running in compatibility mode'
      )}
    </div>
    <div class="mt-1 text-muted-foreground">
      {t(
        'workspace.search.discovery_fallback_description',
        {},
        'The canonical Discovery source is unavailable; results are coming from a compatibility provider. Retry to try Discovery again.'
      )}
    </div>
    <button
      class="mt-4 rounded-lg border border-border bg-foreground px-4 py-2 text-sm font-bold text-background transition hover:bg-foreground/90"
      type="button"
      onclick={retrySearch}
    >
      {t('workspace.search.retry', {}, 'Retry search')}
    </button>
  </div>
{/if}

{#if cursorFailure}
  <div
    class="rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground"
    role="status"
    aria-live="polite"
    aria-atomic="true"
    aria-label={t('workspace.search.cursor_status_aria', {}, 'Search cursor status')}
  >
    <div class="font-black">
      {t('workspace.search.cursor_unavailable', {}, 'This search page is no longer available')}
    </div>
    <div class="mt-1 text-muted-foreground">
      {t(
        'workspace.search.cursor_fresh_retry_description',
        {},
        'The search cursor is invalid, expired, or stale. Start a fresh search to continue.'
      )}
    </div>
    <button
      class="mt-4 rounded-lg border border-border bg-foreground px-4 py-2 text-sm font-bold text-background transition hover:bg-foreground/90"
      type="button"
      onclick={retrySearch}
    >
      {t('workspace.search.cursor_fresh_retry', {}, 'Start a fresh search')}
    </button>
  </div>
{/if}

{#if discoveryIsDegraded}
  <div
    class="rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground"
    role="status"
    aria-live="polite"
    aria-atomic="true"
    aria-label={t('workspace.search.discovery_authority', {}, 'Discovery result authority')}
  >
    <div class="font-black">
      {t('workspace.search.partial_results', {}, 'Partial results')}
    </div>
    <div class="mt-1 text-muted-foreground">
      {t(
        'workspace.search.discovery_partial_description',
        {},
        'Some totals or sources are not authoritative for this search.'
      )}
    </div>
    <button
      class="mt-4 rounded-lg border border-border bg-foreground px-4 py-2 text-sm font-bold text-background transition hover:bg-foreground/90"
      type="button"
      onclick={retrySearch}
    >
      {t('workspace.search.retry', {}, 'Retry search')}
    </button>
  </div>
{/if}

{#if queryWasNormalized}
  <div class="rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm text-foreground">
    <div class="font-black">
      {t('workspace.search.normalized_title', {}, 'Query normalized')}
    </div>
    <div class="mt-1 text-muted-foreground">
      {t(
        'workspace.search.normalized_description',
        {},
        'Search was bounded before fanout to keep every source fast.'
      )}
    </div>
  </div>
{/if}

{#if resultsTruncated}
  <div class="rounded-2xl border border-border bg-background px-4 py-3 text-sm shadow-suar-xs">
    <div class="font-black text-foreground">
      {t('workspace.search.truncated_title', {}, 'Top results shown')}
    </div>
    <div class="mt-1 text-muted-foreground">
      {t(
        'workspace.search.truncated_description',
        { limit: resultLimit, total: candidateResultCount },
        'Showing the top :limit of :total ranked matches. Narrow by domain or field for a deeper cut.'
      )}
    </div>
  </div>
{/if}
