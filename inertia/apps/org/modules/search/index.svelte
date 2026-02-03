<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import { postSearchTelemetry } from '@/apps/org/shared/lib/search_telemetry'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'
  import type { FilterType, SearchCenterResult, SourceStatus, FieldFacet, TotalByType } from './types'
  import SearchHeader from './components/search_header.svelte'
  import SearchFilters from './components/search_filters.svelte'
  import SearchResultItem from './components/search_result_item.svelte'
  import SearchRecent from './components/search_recent.svelte'
  import {
    buildSearchPageUrl,
    type SearchShell,
  } from '@/apps/shared/navigation/shell_search_links'

  const RECENT_SEARCHES_KEY = 'suar:search:recent_queries'
  const MAX_RECENT_SEARCHES = 5

  interface Props {
    shellMode?: SearchShell
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
    shellMode = 'organization',
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
  const { t } = useTranslation()

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
    return buildSearchPageUrl(shellMode, q, type, field)
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
</script>

<OrganizationLayout title={t('workspace.search.page_title', {}, 'Search Center')}>
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

    {#if !query}
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
          {#if results.length === 0}
            <div class="rounded-2xl border border-border bg-background p-10 text-center">
              {#if skippedAllSources}
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
          {:else if filteredResults.length === 0}
            <div class="rounded-2xl border border-border bg-background p-10 text-center">
              <p class="text-sm font-bold text-foreground">
                {t(
                  'workspace.search.filtered_empty',
                  {},
                  'No results in this filtered view.'
                )}
              </p>
              <p class="mt-2 text-sm text-muted-foreground">
                {t(
                  'workspace.search.filtered_empty_hint',
                  {},
                  'Clear the field filter or choose another match or domain from the left rail.'
                )}
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
</OrganizationLayout>
