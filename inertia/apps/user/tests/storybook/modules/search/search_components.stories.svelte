<script lang="ts">
  import { Meta, Story } from '@storybook/addon-svelte-csf'

  import SearchFilters from '@/apps/user/modules/search/components/search_filters.svelte'
  import SearchHeader from '@/apps/user/modules/search/components/search_header.svelte'
  import SearchResultItem from '@/apps/user/modules/search/components/search_result_item.svelte'
  import type {
    FieldFacet,
    FilterType,
    SearchCenterResult,
    SourceStatus,
    TotalByType,
  } from '@/apps/user/modules/search/types'

  let searchInput = $state('checkout qa')
  let activeFilter = $state<FilterType>('all')
  let activeField = $state<string | null>(null)
  let submitted = $state('not submitted')
  let clickedResult = $state('none')

  const tabs: Array<{ type: FilterType; label: string }> = [
    { type: 'all', label: 'All' },
    { type: 'task', label: 'Tasks' },
    { type: 'project', label: 'Projects' },
    { type: 'comment', label: 'Comments' },
    { type: 'talent', label: 'Talents' },
    { type: 'skill', label: 'Skills' },
    { type: 'organization', label: 'Organizations' },
  ]

  const totalByType: TotalByType = {
    all: 2,
    task: 1,
    project: 1,
    comment: 0,
    talent: 0,
    skill: 0,
    organization: 0,
  }

  const result: SearchCenterResult = {
    id: 'task:task-1',
    entityType: 'task',
    entityId: 'task-1',
    title: 'Checkout QA evidence package',
    sourceLabel: 'Task title',
    url: '/tasks/task-1',
    matchedFields: ['title', 'description'],
    matchedFieldLabels: ['Task title', 'Task description'],
    snippets: ['Checkout QA evidence package must stay visible to reviewers.'],
    highlightedSnippets: [
      [
        { text: 'Checkout QA', match: true },
        { text: ' evidence package must stay visible to reviewers.', match: false },
      ],
    ],
    breadcrumbs: ['Suar Launch', 'Review Gate'],
    matchStrength: 'exact',
    rank: 1,
    score: 98,
    primaryActionLabel: 'Open task',
    secondaryMeta: 'Due today',
  }

  const facets: FieldFacet[] = [
    { label: 'Task title', entityType: 'task', count: 1 },
    { label: 'Project name', entityType: 'project', count: 1 },
    { label: 'Comment body', entityType: 'comment', count: 0 },
  ]

  const statuses: SourceStatus[] = [
    { source: 'tasks', status: 'ok', resultCount: 1, errorMessage: null, durationMs: 12 },
    { source: 'projects', status: 'ok', resultCount: 1, errorMessage: null, durationMs: 9 },
    { source: 'talents', status: 'timed_out', resultCount: 0, errorMessage: 'timeout', durationMs: 250 },
  ]

  function domainCountLabel(type: FilterType) {
    return String(totalByType[type])
  }
</script>

<Meta title="User Search/Components" />

<Story name="Header">
  <div class="max-w-5xl bg-background p-4 text-foreground">
    <SearchHeader
      bind:searchInput
      totalResults={totalByType.all}
      nonEmptyDomainCount={2}
      strongestResult={result}
      submitSearch={(event: SubmitEvent) => {
        event.preventDefault()
        submitted = searchInput.trim()
      }}
    />
    <p class="mt-3 text-xs text-muted-foreground">Submitted: {submitted}</p>
  </div>
</Story>

<Story name="Filters">
  <div class="grid max-w-5xl gap-4 bg-background p-4 text-foreground lg:grid-cols-[280px_1fr]">
    <SearchFilters
      {tabs}
      {activeFilter}
      fieldFacets={facets}
      {activeField}
      sourceStatuses={statuses}
      {domainCountLabel}
      selectFilter={(type: FilterType) => {
        activeFilter = type
      }}
      selectField={(label: string | null) => {
        activeField = label
      }}
    />
    <div class="rounded-2xl border border-border bg-muted/20 p-4 text-sm">
      <p class="font-bold">Selected scope</p>
      <p class="mt-2 text-muted-foreground">Domain: {activeFilter}</p>
      <p class="text-muted-foreground">Field: {activeField ?? 'all fields'}</p>
    </div>
  </div>
</Story>

<Story name="Result Item">
  <div class="max-w-3xl bg-background p-4 text-foreground">
    <SearchResultItem
      {result}
      onclick={(nextResult: { id: string }) => {
        clickedResult = nextResult.id
      }}
    />
    <p class="mt-3 text-xs text-muted-foreground">Clicked: {clickedResult}</p>
  </div>
</Story>
