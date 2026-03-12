<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import AdminLayout from '@/apps/admin/shared/layouts/admin_layout.svelte'
  import { useTranslation } from '@/apps/admin/shared/hooks/use_translation.svelte'
  import { buildSearchPageUrl } from '@/apps/shared/navigation/shell_search_links'

  type FilterType = 'all' | 'talent' | 'task' | 'project' | 'skill' | 'organization' | 'comment'

  interface SearchResult {
    id: string
    entityType: string
    title: string
    url: string
    sourceLabel?: string
    primaryActionLabel?: string
    secondaryMeta?: string | null
    snippets?: string[]
  }

  interface Props {
    query?: string
    submittedQuery?: string
    activeType?: FilterType
    activeFieldLabel?: string | null
    results?: SearchResult[]
    totalByType?: Record<FilterType | 'all', number>
    fieldFacets?: Array<{ label: string; entityType: string; count: number }>
    candidateResultCount?: number
    resultLimit?: number
    resultsTruncated?: boolean
    sourceStatuses?: Array<{ source: string; status: string }>
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
  const { t } = useTranslation()

  let searchInput = $state('')
  let activeFilter = $state<FilterType>('all')

  $effect(() => {
    searchInput = query
    activeFilter = activeType
  })

  const tabs: Array<{ type: FilterType; label: string }> = $derived([
    { type: 'all', label: t('workspace.search.tabs.all', {}, 'All') },
    { type: 'task', label: t('workspace.search.tabs.task', {}, 'Tasks') },
    { type: 'project', label: t('workspace.search.tabs.project', {}, 'Projects') },
    { type: 'comment', label: t('workspace.search.tabs.comment', {}, 'Comments') },
    { type: 'talent', label: t('workspace.search.tabs.talent', {}, 'Talents') },
    { type: 'skill', label: t('workspace.search.tabs.skill', {}, 'Skills') },
    { type: 'organization', label: t('workspace.search.tabs.organization', {}, 'Organizations') },
  ])

  function buildUrl(q: string, type: FilterType, field: string | null = activeFieldLabel): string {
    return buildSearchPageUrl('admin', q, type, field)
  }

  function submitSearch(event: SubmitEvent) {
    event.preventDefault()
    router.visit(buildUrl(searchInput.trim(), activeFilter, activeFieldLabel), { preserveScroll: true })
  }

  function selectFilter(type: FilterType) {
    router.visit(buildUrl(query, type, null), { preserveScroll: true, preserveState: true })
  }
</script>

<svelte:head>
  <title>{t('workspace.search.title', {}, 'Search center')}</title>
</svelte:head>

<AdminLayout title={t('workspace.search.title', {}, 'Search center')}>
  <div class="mx-auto max-w-5xl space-y-6">
    <form class="rounded-2xl border border-border bg-card p-4" onsubmit={submitSearch}>
      <div class="flex flex-col gap-3 md:flex-row md:items-center">
        <input
          bind:value={searchInput}
          class="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          placeholder={t('common.search_everything', {}, 'Search everything...')}
        />
        <button class="rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground" type="submit">
          {t('common.search', {}, 'Search')}
        </button>
      </div>
    </form>

    <div class="flex flex-wrap gap-2">
      {#each tabs as tab}
        <button
          type="button"
          class={`rounded-full border px-3 py-1.5 text-sm ${activeFilter === tab.type ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background'}`}
          onclick={() => { selectFilter(tab.type) }}
        >
          {tab.label}
          {#if totalByType[tab.type] > 0}
            <span class="ml-1 opacity-70">{totalByType[tab.type]}</span>
          {/if}
        </button>
      {/each}
    </div>

    <div class="text-sm text-muted-foreground">
      {#if query}
        {t('workspace.search.results_count', { count: results.length }, `${results.length} results`)}
      {:else}
        {t('workspace.search.empty_prompt', {}, 'Type a query to search.')}
      {/if}
    </div>

    {#if results.length === 0}
      <div class="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
        {resultsTruncated
          ? t('workspace.search.results_truncated', {}, 'Results truncated.')
          : t('workspace.search.no_results', {}, 'No results found.')}
      </div>
    {:else}
      <div class="space-y-3">
        {#each results as result}
          <a class="block rounded-2xl border border-border bg-card p-4 hover:bg-accent" href={result.url}>
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="font-medium">{result.title}</div>
                <div class="text-sm text-muted-foreground">{result.sourceLabel ?? result.entityType}</div>
              </div>
              <span class="text-sm text-muted-foreground">{result.primaryActionLabel ?? t('common.open', {}, 'Open')}</span>
            </div>
            {#if result.snippets?.[0]}
              <p class="mt-2 text-sm text-muted-foreground">{result.snippets[0]}</p>
            {/if}
          </a>
        {/each}
      </div>
    {/if}

    <div class="text-xs text-muted-foreground">
      {#if submittedQuery !== query}
        {t('workspace.search.normalized_query', {}, 'Search normalized')}
      {/if}
      {#if fieldFacets.length > 0}
        <span class="ml-2">{fieldFacets.length} facets</span>
      {/if}
      {#if sourceStatuses.length > 0}
        <span class="ml-2">{candidateResultCount}/{resultLimit}</span>
      {/if}
    </div>
  </div>
</AdminLayout>
