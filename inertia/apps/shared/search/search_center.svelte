<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import { buildSearchPageUrl, type SearchShell } from '@/apps/shared/navigation/shell_search_links'
  import { createSearchNavigation } from './search_navigation'
  import { defaultTranslate, type TranslateFn } from './lib/translation'
  import type {
    FieldFacet,
    FilterType,
    SearchCenterResult,
    SearchDiscoveryPage,
    SourceStatus,
    TotalByType,
  } from './types'
  import SearchDiscoveryResultItem from './components/search_discovery_result_item.svelte'
  import SearchFilters from './components/search_filters.svelte'
  import SearchHeader from './components/search_header.svelte'
  import SearchResultItem from './components/search_result_item.svelte'
  import SearchRecent from './components/search_recent.svelte'
  import SavedViewMenu from '@/apps/shared/filtering/components/saved_views/saved_view_menu.svelte'
  import type { FilterCriteria } from '@/apps/shared/filtering/contracts'
  import type { SavedViewShareTarget } from '@/apps/shared/filtering/saved_views/filter_saved_view_client'

  const RECENT_SEARCHES_KEY = 'suar:search:recent_queries'
  const MAX_RECENT_SEARCHES = 5

  interface Props {
    shellMode?: SearchShell
    query?: string
    submittedQuery?: string
    activeType?: FilterType
    activeFieldLabel?: string | null
    results?: SearchCenterResult[]
    discovery?: SearchDiscoveryPage | null
    cursor?: string
    previousCursor?: string
    projectId?: string
    totalByType?: TotalByType
    fieldFacets?: FieldFacet[]
    candidateResultCount?: number
    resultLimit?: number
    resultsTruncated?: boolean
    sourceStatuses?: SourceStatus[]
    discoveryFailure?: { code: string }
    shareTargets?: SavedViewShareTarget[]
    savedViewContextKey?: string
    savedViewContextOwner?: string
    savedViewCapabilities?: { sharedViews?: boolean; alerts?: boolean }
    telemetry?: (event: { eventName: string; surface: string; query: string; entityType?: string; entityId?: string; metadata?: Record<string, unknown>; resultCounts?: TotalByType }) => Promise<void>
    t?: TranslateFn
  }

  const {
    shellMode = 'app',
    query = '',
    submittedQuery = query,
    activeType = 'all',
    activeFieldLabel = null,
    results = [],
    totalByType = {
      all: results.length,
      task: 0,
      project: 0,
      comment: 0,
      talent: 0,
      skill: 0,
      organization: 0,
    },
    fieldFacets = [],
    candidateResultCount = results.length,
    resultLimit = results.length,
    resultsTruncated = false,
    sourceStatuses = [],
    discoveryFailure,
    shareTargets = [],
    savedViewContextKey = 'search.blended.global',
    savedViewContextOwner = 'search',
    savedViewCapabilities = { sharedViews: true, alerts: false },
    discovery = null,
    cursor = undefined,
    previousCursor = undefined,
    projectId = undefined,
    telemetry,
    t = defaultTranslate,
  }: Props = $props()

  let searchInput = $state('')
  let activeFilter = $state<FilterType>('all')
  let activeField = $state<string | null>(null)
  let globalPage = $state(1)
  let emptyTelemetryKey = $state<string | null>(null)
  let recentSearches = $state<string[]>([])
  const visitSearch = createSearchNavigation(router)

  $effect(() => {
    searchInput = query
    activeFilter = activeType
    activeField = activeFieldLabel?.trim() || null
    globalPage = 1
  })

  $effect(() => {
    recentSearches = query ? rememberRecentSearch(query) : readRecentSearches()
  })

  const tabs: Array<{ type: FilterType; label: string }> = $derived([
    { type: 'all', label: t('workspace.search.tabs.all', {}, 'All') },
    { type: 'task', label: t('workspace.search.tabs.task', {}, 'Tasks') },
    { type: 'project', label: t('workspace.search.tabs.project', {}, 'Projects') },
    { type: 'comment', label: t('workspace.search.tabs.comment', {}, 'Comments') },
    { type: 'talent', label: t('workspace.search.tabs.talent', {}, 'Talents') },
    { type: 'skill', label: t('workspace.search.tabs.skill', {}, 'Skills') },
    {
      type: 'organization',
      label: t('workspace.search.tabs.organization', {}, 'Organizations'),
    },
  ])

  const effectiveTotalByType = $derived.by(() => {
    if (!discovery) return totalByType

    const totals: TotalByType = { ...totalByType }
    const hitTotals: TotalByType = {
      all: discovery.hits.length,
      task: 0,
      project: 0,
      comment: 0,
      talent: 0,
      skill: 0,
      organization: 0,
    }
    for (const hit of discovery.hits) {
      hitTotals[hit.entityType] += 1
    }

    totals.all = discovery.total.value
    for (const type of tabs.map((tab) => tab.type).filter((type): type is Exclude<FilterType, 'all'> => type !== 'all')) {
      if (totals[type] === 0 && hitTotals[type] > 0) totals[type] = hitTotals[type]
    }
    return totals
  })

  const nonEmptyDomainCount = $derived(
    tabs.filter((tab) => tab.type !== 'all' && effectiveTotalByType[tab.type] > 0).length
  )
  const strongestResult = $derived(results[0] ?? null)
  const failedSources = $derived(
    sourceStatuses.filter((source) => source.status === 'failed' || source.status === 'timed_out')
  )
  const queriedSources = $derived(new Set(sourceStatuses.map((source) => source.source)))
  const skippedAllSources = $derived(
    sourceStatuses.length > 0 && sourceStatuses.every((source) => source.status === 'skipped')
  )
  const allSourcesUnavailable = $derived(
    sourceStatuses.length > 0 &&
      sourceStatuses.every((source) => source.status === 'failed' || source.status === 'timed_out')
  )
  const queryWasNormalized = $derived(Boolean(submittedQuery.trim()) && submittedQuery.trim() !== query)
  const globalPageCount = $derived(Math.max(1, Math.ceil(results.length / resultLimit)))
  const pagedResults = $derived(
    results.slice((globalPage - 1) * resultLimit, globalPage * resultLimit)
  )
  const visibleResultCount = $derived(discovery ? discovery.hits.length : pagedResults.length)
  const cursorFailure = $derived(
    discoveryFailure?.code === 'SEARCH_CURSOR_INVALID' ||
      discoveryFailure?.code === 'SEARCH_CURSOR_EXPIRED' ||
      discoveryFailure?.code === 'SEARCH_CURSOR_STALE'
  )
  const discoveryIsDegraded = $derived(
    discovery !== null &&
      discovery.sources.some(
        (source) => source.state !== 'ok' && source.state !== 'skipped'
      )
  )

  $effect(() => {
    const key = `${query}:${activeFilter}:${activeField ?? ''}`
    if (!query || results.length > 0 || sourceStatuses.length === 0 || skippedAllSources) {
      return
    }

    if (emptyTelemetryKey === key) {
      return
    }

    emptyTelemetryKey = key
    if (telemetry) {
      void telemetry({
        eventName: allSourcesUnavailable ? 'search.ui.failed' : 'search.ui.empty_results',
        surface: 'search_page',
        query,
        metadata: {
          active_type: activeFilter,
          active_field: activeField,
          source_statuses: sourceStatusTelemetry(),
        },
        resultCounts: effectiveTotalByType,
      }).catch(() => {})
    }
  })

  function submitSearch(event: SubmitEvent) {
    event.preventDefault()
    const form = event.currentTarget
    const submittedValue = form instanceof HTMLFormElement
      ? new FormData(form).get('q')
      : searchInput
    const q = typeof submittedValue === 'string' ? submittedValue.trim() : searchInput.trim()
    const field = q === query ? activeField : null
    recentSearches = rememberRecentSearch(q)
    if (telemetry) {
      void telemetry({
        eventName: 'search.ui.submitted',
        surface: 'search_page',
        query: q,
        metadata: {
          active_type: activeFilter,
          active_field: field,
          source_statuses: sourceStatusTelemetry(),
        },
        resultCounts: effectiveTotalByType,
      }).catch(() => {})
    }
    visitSearch(buildSearchUrl(q, activeFilter, field), {
      preserveScroll: true,
    })
  }

  function buildSearchUrl(
    q: string,
    type: FilterType,
    field: string | null = activeField,
    cursor: string | null = null,
    previousCursor: string | null = null
  ): string {
    return buildSearchPageUrl(shellMode, q, type, field, cursor, previousCursor, projectId ?? null)
  }

  function selectFilter(type: FilterType) {
    visitSearch(buildSearchUrl(query, type, null), {
      preserveScroll: true,
      preserveState: true,
    })
  }

  function selectField(label: string | null) {
    visitSearch(buildSearchUrl(query, activeFilter, label), {
      preserveScroll: true,
      preserveState: true,
    })
  }

  function selectRecentSearch(recentQuery: string) {
    visitSearch(buildSearchUrl(recentQuery, 'all', null), {
      preserveScroll: true,
      preserveState: true,
    })
  }

  function removeRecentSearch(recentQuery: string) {
    recentSearches = recentSearches.filter((item) => item !== recentQuery)
    if (typeof window === 'undefined') return

    try {
      window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recentSearches))
    } catch {}
  }

  function resetSearchScope() {
    visitSearch(buildSearchUrl(query, 'all', null), {
      preserveScroll: true,
      preserveState: true,
    })
  }

  function retrySearch() {
    visitSearch(buildSearchUrl(query, activeFilter, activeField), {
      preserveScroll: true,
      preserveState: false,
    })
  }

  function nextDiscoveryPage() {
    const nextCursor = discovery?.page.nextCursor
    if (!nextCursor) return

    visitSearch(buildSearchUrl(query, activeFilter, activeField, nextCursor, cursor), {
      preserveScroll: true,
      preserveState: false,
    })
  }

  function previousDiscoveryPage() {
    if (!cursor) return

    visitSearch(buildSearchUrl(query, activeFilter, activeField, previousCursor ?? null), {
      preserveScroll: true,
      preserveState: false,
    })
  }

  function previousGlobalPage() {
    globalPage = Math.max(1, globalPage - 1)
  }

  function nextGlobalPage() {
    globalPage = Math.min(globalPageCount, globalPage + 1)
  }

  function domainLabel(type: FilterType): string {
    return tabs.find((tab) => tab.type === type)?.label ?? t('workspace.search.tabs.all', {}, 'All')
  }

  function sourceForType(type: FilterType) {
    switch (type) {
      case 'task': return 'tasks'
      case 'project': return 'projects'
      case 'comment': return 'comments'
      case 'talent': return 'talents'
      case 'skill': return 'skills'
      case 'organization': return 'organizations'
      case 'all': return null
      default: return null
    }
  }

  function domainCountLabel(type: FilterType): string {
    const source = sourceForType(type)
    if (activeFilter !== 'all' && source && sourceStatuses.length > 0 && !queriedSources.has(source)) {
      return t('workspace.search.not_queried', {}, 'Not queried')
    }

    return String(effectiveTotalByType[type])
  }

  function sourceStatusTelemetry() {
    return sourceStatuses.map((source) => ({
      source: source.source,
      status: source.status,
      result_count: source.resultCount,
      duration_ms: source.durationMs ?? 0,
    }))
  }

  function trackResultClick(result: SearchCenterResult) {
    if (telemetry) {
      void telemetry({
        eventName: 'search.ui.result_clicked',
        surface: 'search_page',
        query,
        entityType: result.entityType,
        entityId: result.entityId,
        metadata: {
          rank: result.rank ?? null,
          source_label: result.sourceLabel,
          matched_fields: result.matchedFields,
          matched_field_labels: result.matchedFieldLabels ?? [result.sourceLabel],
          match_strength: result.matchStrength ?? null,
          active_type: activeFilter,
          active_field: activeField,
          source_statuses: sourceStatusTelemetry(),
        },
        resultCounts: effectiveTotalByType,
      }).catch(() => {})
    }
  }

  function trackDiscoveryResult(result: import('./discovery_presentation').DiscoveryPresentationHit) {
    if (telemetry) {
      void telemetry({
        eventName: 'search.ui.result_clicked',
        surface: 'search_page',
        query,
        entityType: result.entityType,
        entityId: result.entityId,
        metadata: {
          rank: result.rank,
          source_label: result.presentation?.sourceLabel,
          discovery_mode: true,
          request_id: discovery?.requestId ?? null,
          active_type: activeFilter,
          active_field: activeField,
        },
        resultCounts: totalByType,
      }).catch(() => {})
    }
  }

  function failedSourceSummary(): string {
    return failedSources
      .map((source) =>
        source.status === 'timed_out'
          ? t(
              'workspace.search.source_timed_out',
              { source: source.source },
              ':source source timed out'
            )
          : t(
              'workspace.search.source_unavailable',
              { source: source.source },
              ':source source unavailable'
            )
      )
      .join(', ')
  }

  function readRecentSearches(): string[] {
    if (typeof window === 'undefined') return []

    try {
      const parsed: unknown = JSON.parse(window.localStorage.getItem(RECENT_SEARCHES_KEY) ?? '[]')
      return Array.isArray(parsed)
        ? parsed
            .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
            .slice(0, MAX_RECENT_SEARCHES)
        : []
    } catch {
      return []
    }
  }

  function rememberRecentSearch(value: string): string[] {
    const normalized = value.trim()
    if (!normalized || typeof window === 'undefined') return readRecentSearches()

    const next = [
      normalized,
      ...readRecentSearches().filter((item) => item.toLocaleLowerCase() !== normalized.toLocaleLowerCase()),
    ].slice(0, MAX_RECENT_SEARCHES)

    try {
      window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next))
    } catch {}

    return next
  }
  const currentCriteria = $derived<FilterCriteria>({
    context: savedViewContextKey,
    schemaVersion: 1,
    text: query ? { value: query } : undefined,
    sort: [],
    page: { size: 25 },
  })

  function applySavedView(criteria: FilterCriteria) {
    if (criteria.text?.value) {
      visitSearch(buildSearchUrl(criteria.text.value, activeFilter, activeField), {
        preserveScroll: true,
      })
    }
  }
</script>

<section class="mx-auto flex w-full max-w-7xl flex-col gap-6">
  <SearchHeader
    bind:searchInput
    {query}
    totalResults={effectiveTotalByType.all}
    {nonEmptyDomainCount}
    {strongestResult}
    {submitSearch}
    {t}
  />

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
        {failedSourceSummary()}.
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

  {#if !query && !discovery}
    <div class="rounded-md border border-dashed border-border p-10 text-center">
      <p class="text-sm font-medium text-foreground">
        {t('workspace.search.empty_prompt', {}, 'Type a keyword to search across Suar.')}
      </p>
      <p class="mt-2 text-sm text-muted-foreground">
        {t(
          'workspace.search.empty_description',
          {},
          'Results show exactly where the match lives: task title, task description, project, comment, skill, talent, or organization.'
        )}
      </p>
    </div>
    {#if recentSearches.length > 0}
      <SearchRecent
        {recentSearches}
        {selectRecentSearch}
        {removeRecentSearch}
        {t}
      />
    {/if}
  {:else}
    <div
      class="flex flex-col gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm shadow-suar-xs lg:flex-row lg:items-center lg:justify-between"
      aria-label={t('workspace.search.scope_aria', {}, 'Current search scope')}
    >
      <div class="flex flex-wrap items-center gap-2">
        <span class="rounded-lg border border-border bg-muted/30 px-3 py-1.5">
          <span class="mr-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            {t('workspace.search.query', {}, 'Query')}
          </span>
          <span class="font-bold text-foreground">{query}</span>
        </span>
        <span class="rounded-lg border border-border bg-muted/30 px-3 py-1.5">
          <span class="mr-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            {t('workspace.search.domain', {}, 'Domain')}
          </span>
          <span class="font-bold text-foreground">{domainLabel(activeFilter)}</span>
        </span>
        {#if activeField}
          <span class="rounded-lg border border-border bg-muted/30 px-3 py-1.5">
            <span class="mr-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              {t('workspace.search.field', {}, 'Field')}
            </span>
            <span class="font-bold text-foreground">{activeField}</span>
          </span>
        {/if}
      </div>
      <div class="flex items-center gap-2">
        <SavedViewMenu
          contextKey={savedViewContextKey}
          contextOwner={savedViewContextOwner}
          {currentCriteria}
          capabilities={savedViewCapabilities}
          {shareTargets}
          onApplyView={applySavedView}
        />
        {#if activeFilter !== 'all' || activeField}
          <button
            class="rounded-lg border border-border px-3 py-2 text-xs font-bold text-muted-foreground transition hover:border-foreground/50 hover:text-foreground"
            type="button"
            onclick={resetSearchScope}
          >
            {t('workspace.search.search_all', {}, 'Search all domains')}
          </button>
        {/if}
      </div>
    </div>

    <div class="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
      <SearchFilters
        {tabs}
        {activeFilter}
        {fieldFacets}
        {activeField}
        {sourceStatuses}
        {domainCountLabel}
        {selectFilter}
        {selectField}
        {t}
      />

      <div class="grid gap-3">
        {#if activeField}
          <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm">
            <span class="font-bold text-foreground">
              {t(
                'workspace.search.field_filter',
                { field: activeField },
                'Field filter: :field'
              )}
            </span>
            <button
              class="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:text-foreground"
              type="button"
              onclick={() => selectField(null)}
            >
              {t('workspace.search.clear', {}, 'Clear')}
            </button>
          </div>
        {/if}
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
            <SearchDiscoveryResultItem {query} result={result} onclick={trackDiscoveryResult} {t} />
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
      </div>
    </div>
  {/if}
</section>
