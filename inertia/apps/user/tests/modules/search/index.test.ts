/* eslint-disable import-x/order */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import LayoutStub from '../../shared/test_stubs/layout_stub.svelte'

const { visitMock, postSearchTelemetryMock } = vi.hoisted(() => ({
  visitMock: vi.fn(),
  postSearchTelemetryMock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/apps/user/shared/layouts/app_layout.svelte', () => ({
  default: LayoutStub,
}))

vi.mock('@inertiajs/svelte', () => ({
  router: {
    visit: visitMock,
  },
}))

vi.mock('@/apps/user/shared/lib/search_telemetry', () => ({
  postSearchTelemetry: postSearchTelemetryMock,
}))

import SearchPage from '@/apps/user/modules/search/index.svelte'
import type {
  FieldFacet,
  SearchCenterResult,
  SourceStatus,
  TotalByType,
} from '@/apps/user/modules/search/types'

const totals: TotalByType = {
  all: 2,
  task: 1,
  project: 1,
  comment: 0,
  talent: 0,
  skill: 0,
  organization: 0,
}

const results: SearchCenterResult[] = [
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

const facets: FieldFacet[] = [
  { label: 'Task title', entityType: 'task', count: 1 },
  { label: 'Project name', entityType: 'project', count: 1 },
]

const sourceStatuses: SourceStatus[] = [
  { source: 'tasks', status: 'ok', resultCount: 1, errorMessage: null, durationMs: 12 },
  { source: 'projects', status: 'ok', resultCount: 1, errorMessage: null, durationMs: 9 },
]

function renderSearchPage() {
  render(SearchPage, {
    props: {
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
    },
  })
}

describe('SearchPage', () => {
  afterEach(() => {
    cleanup()
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('renders exact ranked results with facets and source health', () => {
    renderSearchPage()

    expect(screen.getByRole('heading', { name: 'Search Center' })).toBeInTheDocument()
    expect(screen.getByText('Checkout QA evidence package')).toBeInTheDocument()
    expect(screen.getByText('Checkout Quality Project')).toBeInTheDocument()
    expect(screen.getAllByText('Exact match')).toHaveLength(2)
    expect(screen.getAllByText('Task title')).toHaveLength(2)
    expect(screen.getAllByText('Project name')).toHaveLength(2)

    const sourceHealth = screen.getByLabelText('Search source health')
    expect(within(sourceHealth).getByText('tasks')).toBeInTheDocument()
    expect(within(sourceHealth).getByText('projects')).toBeInTheDocument()
  })

  it('navigates to domain and field-filtered search URLs', async () => {
    renderSearchPage()

    await fireEvent.click(within(screen.getByLabelText('Search result filters')).getByText('Projects'))
    expect(visitMock).toHaveBeenCalledWith('/search?q=checkout&type=project', {
      preserveScroll: true,
      preserveState: true,
    })

    await fireEvent.click(within(screen.getByLabelText('Search match field breakdown')).getByText('Task title'))
    expect(visitMock).toHaveBeenCalledWith('/search?q=checkout&field=Task+title', {
      preserveScroll: true,
      preserveState: true,
    })
  })

  it('submits trimmed query, records telemetry, and remembers recent searches', async () => {
    renderSearchPage()

    const input = screen.getByPlaceholderText('Search tasks, projects, comments, talents, skills, organizations...')
    await fireEvent.input(input, { target: { value: '  Apollo risk  ' } })
    const form = input.closest('form')
    if (!form) {
      throw new Error('Search form not found')
    }
    await fireEvent.submit(form)

    expect(visitMock).toHaveBeenCalledWith('/search?q=Apollo+risk', {
      preserveScroll: true,
    })
    expect(postSearchTelemetryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'search.ui.submitted',
        surface: 'search_page',
        query: 'Apollo risk',
      })
    )
    expect(JSON.parse(localStorage.getItem('suar:search:recent_queries') ?? '[]')).toEqual([
      'Apollo risk',
      'checkout',
    ])
  })

  it('shows empty search prompt before any query', () => {
    render(SearchPage, {
      props: {
        query: '',
        results: [],
      },
    })

    expect(screen.getByText('Type a keyword to search across Suar.')).toBeInTheDocument()
  })
})
