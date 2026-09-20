<script lang="ts">
  import { router } from '@inertiajs/svelte'

  import SavedViewMenu from '@/apps/shared/filtering/components/saved_views/saved_view_menu.svelte'
  import type { FilterCriteria } from '@/apps/shared/filtering/contracts'
  import type { SavedViewShareTarget } from '@/apps/shared/filtering/saved_views/filter_saved_view_client'
  import { buildSearchPageUrl, type SearchShell } from '@/apps/shared/navigation/shell_search_links'

  import SearchFilters from './components/search_filters.svelte'
  import SearchHeader from './components/search_header.svelte'
  import SearchRecent from './components/search_recent.svelte'
  import SearchResultsContainer from './components/search_results_container.svelte'
  import SearchStatusBanners from './components/search_status_banners.svelte'
  import type { DiscoveryPresentationHit } from './discovery_presentation'
  import {
    buildSourceStatusTelemetry,
    calculateEffectiveTotalByType,
    formatFailedSourceSummary,
    readRecentSearches,
    rememberRecentSearch,
    removeRecentSearch,
    sourceForType,
  } from './lib/search_center_helpers'
  import { defaultTranslate, type TranslateFn } from './lib/translation'
  import { createSearchNavigation } from './search_navigation'
  import type {
    FieldFacet,
    FilterType,
    SearchCenterResult,
    SearchDiscoveryPage,
    SourceStatus,
    TotalByType,
  } from './types'

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
    telemetry?: (event: {
      eventName: string
      surface: string
      query: string
      entityType?: string
      entityId?: string
      metadata?: Record<string, unknown>
      resultCounts?: TotalByType
    }) => Promise<void>
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

  const effectiveTotalByType = $derived.by(() =>
    calculateEffectiveTotalByType(
      totalByType,
      discovery,
      tabs.map((tab) => tab.type)
    )
  )

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
  const failedSourceSummaryText = $derived(formatFailedSourceSummary(failedSources, t))

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
          source_statuses: buildSourceStatusTelemetry(sourceStatuses),
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
          source_statuses: buildSourceStatusTelemetry(sourceStatuses),
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
    cursorVal: string | null = null,
    previousCursorVal: string | null = null
  ): string {
    return buildSearchPageUrl(shellMode, q, type, field, cursorVal, previousCursorVal, projectId ?? null)
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

  function onRemoveRecentSearch(recentQuery: string) {
    recentSearches = removeRecentSearch(recentSearches, recentQuery)
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

  function domainCountLabel(type: FilterType): string {
    const source = sourceForType(type)
    if (activeFilter !== 'all' && source && sourceStatuses.length > 0 && !queriedSources.has(source)) {
      return t('workspace.search.not_queried', {}, 'Not queried')
    }

    return String(effectiveTotalByType[type])
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
          source_statuses: buildSourceStatusTelemetry(sourceStatuses),
        },
        resultCounts: effectiveTotalByType,
      }).catch(() => {})
    }
  }

  function trackDiscoveryResult(result: DiscoveryPresentationHit) {
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

  <SearchStatusBanners
    {failedSources}
    {allSourcesUnavailable}
    failedSourceSummary={failedSourceSummaryText}
    {discoveryFailure}
    {cursorFailure}
    {discoveryIsDegraded}
    {queryWasNormalized}
    {resultsTruncated}
    {resultLimit}
    {candidateResultCount}
    {retrySearch}
    {t}
  />

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
        removeRecentSearch={onRemoveRecentSearch}
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

        <SearchResultsContainer
          {query}
          {visibleResultCount}
          {cursorFailure}
          {skippedAllSources}
          {allSourcesUnavailable}
          {discovery}
          {pagedResults}
          {globalPage}
          {globalPageCount}
          {cursor}
          {trackDiscoveryResult}
          {trackResultClick}
          {retrySearch}
          {previousDiscoveryPage}
          {nextDiscoveryPage}
          {previousGlobalPage}
          {nextGlobalPage}
          {t}
        />
      </div>
    </div>
  {/if}
</section>
