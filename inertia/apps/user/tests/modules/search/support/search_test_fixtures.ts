import { render } from '@testing-library/svelte'

import type {
  FieldFacet,
  SearchCenterResult,
  SourceStatus,
  TotalByType,
} from '@/apps/shared/search/types'
import SearchPage from '@/apps/user/modules/search/index.svelte'

export const totals: TotalByType = {
  all: 2,
  task: 1,
  project: 1,
  comment: 0,
  talent: 0,
  skill: 0,
  organization: 0,
}

export const results: SearchCenterResult[] = [
  {
    id: 'task:task-1',
    entityType: 'task',
    entityId: 'task-1',
    title: 'Checkout QA evidence package',
    sourceLabel: 'Task title',
    url: '/tasks/task-1',
    matchedFields: ['title', 'description'],
    matchedFieldLabels: ['Task title', 'Task description'],
    snippets: ['Checkout QA evidence package must stay visible.'],
    highlightedSnippets: [
      [
        { text: 'Checkout QA', match: true },
        { text: ' evidence package must stay visible.', match: false },
      ],
    ],
    breadcrumbs: ['Suar Launch', 'QA'],
    matchStrength: 'exact',
    rank: 1,
    score: 98,
    primaryActionLabel: 'Open task',
    secondaryMeta: 'Due today',
  },
  {
    id: 'project:project-1',
    entityType: 'project',
    entityId: 'project-1',
    title: 'Checkout Quality Project',
    sourceLabel: 'Project name',
    url: '/projects/project-1',
    matchedFields: ['name'],
    matchedFieldLabels: ['Project name'],
    snippets: ['Project for checkout quality work.'],
    matchStrength: 'strong',
    rank: 2,
    score: 88,
    primaryActionLabel: 'Open project',
  },
]

export const facets: FieldFacet[] = [
  { label: 'Task title', entityType: 'task', count: 1 },
  { label: 'Project name', entityType: 'project', count: 1 },
]

export const sourceStatuses: SourceStatus[] = [
  { source: 'tasks', status: 'ok', resultCount: 1, errorMessage: null, durationMs: 12 },
  { source: 'projects', status: 'ok', resultCount: 1, errorMessage: null, durationMs: 9 },
]

export function renderSearchPage(propsOverrides: Record<string, unknown> = {}) {
  return render(SearchPage, {
    props: {
      shellMode: 'app',
      query: 'checkout',
      submittedQuery: 'checkout',
      activeType: 'all',
      activeFieldLabel: null,
      results,
      totalByType: totals,
      fieldFacets: facets,
      candidateResultCount: 2,
      resultLimit: 10,
      resultsTruncated: false,
      sourceStatuses,
      ...propsOverrides,
    },
  })
}
