<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import AppLayout from '@/apps/user/shared/layouts/app_layout.svelte'
  import { postSearchTelemetry } from '@/apps/user/shared/lib/search_telemetry'
  import type { FilterType, SearchCenterResult, SourceStatus, FieldFacet, TotalByType } from './types'
  import SearchHeader from './components/search_header.svelte'
  import SearchFilters from './components/search_filters.svelte'
  import SearchResultItem from './components/search_result_item.svelte'
  import SearchRecent from './components/search_recent.svelte'

  const RECENT_SEARCHES_KEY = 'suar:search:recent_queries'
  const MAX_RECENT_SEARCHES = 5

  interface Props {
    query?: string
    submittedQuery?: string
    activeType?: FilterType
    activeFieldLabel?: string | null
    results?: SearchCenterResult[]
    totalByType?: TotalByType
    fieldFacets?: FieldFacet[]
    candidateResultCount?: number
    resultLimit?: number
    resultsTruncated?: boolean
    sourceStatuses?: SourceStatus[]
  }

  const {
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
  }: Props = $props()

  let searchInput = $state('')
  let activeFilter = $state<FilterType>('all')
  let activeField = $state<string | null>(null)
  let emptyTelemetryKey = $state<string | null>(null)
  let recentSearches = $state<string[]>([])

  $effect(() => {
    searchInput = query
    activeFilter = activeType
    activeField = activeFieldLabel?.trim() || null
  })

  $effect(() => {
    recentSearches = query ? rememberRecentSearch(query) : readRecentSearches()
  })

  const tabs: Array<{ type: FilterType; label: string }> = [
    { type: 'all', label: 'All' },
    { type: 'task', label: 'Tasks' },
    { type: 'project', label: 'Projects' },
    { type: 'comment', label: 'Comments' },
    { type: 'talent', label: 'Talents' },
    { type: 'skill', label: 'Skills' },
    { type: 'organization', label: 'Organizations' },
  ]

  const filteredResults = $derived(
    results.filter((result) => {
      const matchesType = activeFilter === 'all' || result.entityType === activeFilter
      const fieldLabels =
        result.matchedFieldLabels && result.matchedFieldLabels.length > 0
          ? result.matchedFieldLabels
          : [result.sourceLabel]
      const matchesField = !activeField || fieldLabels.includes(activeField)
      return matchesType && matchesField
    })
  )
  const nonEmptyDomainCount = $derived(
    tabs.filter((tab) => tab.type !== 'all' && totalByType[tab.type] > 0).length
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

  $effect(() => {
    const key = `${query}:${activeFilter}:${activeField ?? ''}`
    if (!query || results.length > 0 || sourceStatuses.length === 0 || skippedAllSources) {
      return
    }

    if (emptyTelemetryKey === key) {
      return
    }

    emptyTelemetryKey = key
    void Promise.resolve(
      postSearchTelemetry({
        eventName: allSourcesUnavailable ? 'search.ui.failed' : 'search.ui.empty_results',
        surface: 'search_page',
        query,
        metadata: {
          active_type: activeFilter,
          active_field: activeField,
          source_statuses: sourceStatusTelemetry(),
        },
        resultCounts: totalByType,
      })
    ).catch(() => {})
  })

  function submitSearch(event: SubmitEvent) {
    event.preventDefault()
    const q = searchInput.trim()
    const field = q === query ? activeField : null
    recentSearches = rememberRecentSearch(q)
    void Promise.resolve(
      postSearchTelemetry({
        eventName: 'search.ui.submitted',
        surface: 'search_page',
        query: q,
        metadata: {
          active_type: activeFilter,
          active_field: field,
          source_statuses: sourceStatusTelemetry(),
        },
        resultCounts: totalByType,
      })
    ).catch(() => {})
    router.visit(buildSearchUrl(q, activeFilter, field), {
      preserveScroll: true,
    })
  }

  function buildSearchUrl(q: string, type: FilterType, field: string | null = activeField): string {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (type !== 'all') params.set('type', type)
    if (field) params.set('field', field)
    const queryString = params.toString()
    return queryString ? `/search?${queryString}` : '/search'
  }

  function selectFilter(type: FilterType) {
    router.visit(buildSearchUrl(query, type, null), {
      preserveScroll: true,
      preserveState: true,
    })
  }

  function selectField(label: string | null) {
    router.visit(buildSearchUrl(query, activeFilter, label), {
      preserveScroll: true,
      preserveState: true,
    })
  }

  function selectRecentSearch(recentQuery: string) {
    router.visit(buildSearchUrl(recentQuery, 'all', null), {
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
    router.visit(buildSearchUrl(query, 'all', null), {
      preserveScroll: true,
      preserveState: true,
    })
  }

  function retrySearch() {
    router.visit(buildSearchUrl(query, activeFilter, activeField), {
      preserveScroll: true,
      preserveState: false,
    })
  }

  function domainLabel(type: FilterType): string {
    return tabs.find((tab) => tab.type === type)?.label ?? 'All'
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
      return 'Not queried'
    }

    return String(totalByType[type])
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
    void postSearchTelemetry({
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
      resultCounts: totalByType,
    })
  }

  function failedSourceSummary(): string {
    return failedSources
      .map((source) =>
        source.status === 'timed_out'
          ? `${source.source} source timed out`
          : `${source.source} source unavailable`
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
</script>

<AppLayout title="Search Center">
  <section class="mx-auto flex w-full max-w-7xl flex-col gap-6">
    <SearchHeader
      bind:searchInput
      totalResults={totalByType.all}
      {nonEmptyDomainCount}
      {strongestResult}
      {submitSearch}
    />

    {#if failedSources.length > 0}
      <div class="rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground">
        <div class="font-black">{allSourcesUnavailable ? 'Search unavailable' : 'Partial results'}</div>
        <div class="mt-1 text-muted-foreground">
          {failedSourceSummary()}.{allSourcesUnavailable ? ' No source returned successfully.' : ' Other sources still returned normally.'}
        </div>
      </div>
    {/if}

    {#if queryWasNormalized}
      <div class="rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm text-foreground">
        <div class="font-black">Query normalized</div>
        <div class="mt-1 text-muted-foreground">Search was bounded before fanout to keep every source fast.</div>
      </div>
    {/if}

    {#if resultsTruncated}
      <div class="rounded-2xl border border-border bg-background px-4 py-3 text-sm shadow-suar-xs">
        <div class="font-black text-foreground">Top results shown</div>
        <div class="mt-1 text-muted-foreground">
          Showing the top {resultLimit} of {candidateResultCount} ranked matches. Narrow by domain or field for a deeper cut.
        </div>
      </div>
    {/if}

    {#if !query}
      <div class="rounded-md border border-dashed border-border p-10 text-center">
        <p class="text-sm font-medium text-foreground">Type a keyword to search across Suar.</p>
        <p class="mt-2 text-sm text-muted-foreground">
          Results will show exactly where the match lives: task title, task description, project,
          comment, skill, talent, or organization.
        </p>
      </div>
      {#if recentSearches.length > 0}
        <SearchRecent
          {recentSearches}
          {selectRecentSearch}
          {removeRecentSearch}
        />
      {/if}
    {:else}
      <div
        class="flex flex-col gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm shadow-suar-xs lg:flex-row lg:items-center lg:justify-between"
        aria-label="Current search scope"
      >
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-lg border border-border bg-muted/30 px-3 py-1.5">
            <span class="mr-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Query</span>
            <span class="font-bold text-foreground">{query}</span>
          </span>
          <span class="rounded-lg border border-border bg-muted/30 px-3 py-1.5">
            <span class="mr-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Domain</span>
            <span class="font-bold text-foreground">{domainLabel(activeFilter)}</span>
          </span>
          {#if activeField}
            <span class="rounded-lg border border-border bg-muted/30 px-3 py-1.5">
              <span class="mr-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Field</span>
              <span class="font-bold text-foreground">{activeField}</span>
            </span>
          {/if}
        </div>
        {#if activeFilter !== 'all' || activeField}
          <button
            class="rounded-lg border border-border px-3 py-2 text-xs font-bold text-muted-foreground transition hover:border-foreground/50 hover:text-foreground"
            type="button"
            onclick={resetSearchScope}
          >
            Search all domains
          </button>
        {/if}
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
        />

        <div class="grid gap-3">
          {#if activeField}
            <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm">
              <span class="font-bold text-foreground">Field filter: {activeField}</span>
              <button
                class="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:text-foreground"
                type="button"
                onclick={() => selectField(null)}
              >
                Clear
              </button>
            </div>
          {/if}
          {#if results.length === 0}
            <div class="rounded-2xl border border-border bg-background p-10 text-center">
              {#if skippedAllSources}
                <p class="text-sm font-bold text-foreground">Add one more character to search across Suar.</p>
                <p class="mt-2 text-sm text-muted-foreground">Short queries skip source fanout to keep search fast.</p>
              {:else if allSourcesUnavailable}
                <p class="text-sm font-bold text-foreground">Search sources unavailable.</p>
                <p class="mt-2 text-sm text-muted-foreground">
                  No source returned successfully for "{query}".
                </p>
                <button
                  class="mt-5 rounded-lg border border-border bg-foreground px-4 py-2 text-sm font-bold text-background transition hover:bg-foreground/90"
                  type="button"
                  onclick={retrySearch}
                >
                  Retry search
                </button>
              {:else}
                <p class="text-sm font-bold text-foreground">No results for "{query}".</p>
                <p class="mt-2 text-sm text-muted-foreground">Try another keyword or switch back to All.</p>
              {/if}
            </div>
          {:else if filteredResults.length === 0}
            <div class="rounded-2xl border border-border bg-background p-10 text-center">
              <p class="text-sm font-bold text-foreground">No results in this filtered view.</p>
              <p class="mt-2 text-sm text-muted-foreground">
                Clear the field filter or choose another match/domain from the left rail.
              </p>
            </div>
          {:else}
            {#each filteredResults as result (result.id)}
              <SearchResultItem {result} onclick={trackResultClick} />
            {/each}
          {/if}
        </div>
      </div>
    {/if}
  </section>
</AppLayout>
