import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import SearchPage from '@/apps/user/modules/search/index.svelte'
import type {
  FieldFacet,
  SearchCenterResult,
  SearchDiscoveryPage,
  SourceStatus,
  TotalByType,
} from '@/apps/user/modules/search/types'

const { visitMock, postSearchTelemetryMock } = vi.hoisted(() => ({
  visitMock: vi.fn(),
  postSearchTelemetryMock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/apps/user/shared/layouts/app_layout.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/layout_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@inertiajs/svelte', () => ({
  router: {
    visit: visitMock,
  },
}))

vi.mock('@/apps/user/shared/lib/search_telemetry', () => ({
  postSearchTelemetry: postSearchTelemetryMock,
}))

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

    expect(screen.getByRole('heading', { name: 'Trung tâm tìm kiếm' })).toBeInTheDocument()
    expect(screen.getByText('Checkout QA evidence package')).toBeInTheDocument()
    expect(screen.getByText('Checkout Quality Project')).toBeInTheDocument()
    expect(screen.getAllByText('Khớp chính xác')).toHaveLength(2)
    expect(screen.getAllByText('Task title')).toHaveLength(2)
    expect(screen.getAllByText('Project name')).toHaveLength(2)

    const sourceHealth = screen.getByLabelText('Tình trạng nguồn tìm kiếm')
    expect(within(sourceHealth).getByText('tasks')).toBeInTheDocument()
    expect(within(sourceHealth).getByText('projects')).toBeInTheDocument()
  })

  it.each(['SEARCH_SOURCE_UNAVAILABLE', 'SEARCH_SOURCE_TIMED_OUT', 'SEARCH_INDEX_STALE'])(
    'announces safe compatibility recovery for %s',
    async (code) => {
      render(SearchPage, {
        props: {
          query: 'checkout',
          submittedQuery: 'checkout',
          activeType: 'task',
          activeFieldLabel: 'Task title',
          results,
          totalByType: totals,
          fieldFacets: facets,
          sourceStatuses: [],
          discoveryFailure: { code },
        },
      })

      const status = screen.getByRole('status', {
        name: /Search availability|Tình trạng tìm kiếm/i,
      })
      expect(
        within(status).getByText(
          /Search is running in compatibility mode|Tìm kiếm đang chạy ở chế độ tương thích/i
        )
      ).toBeInTheDocument()
      expect(
        within(status).getByText(
          /canonical Discovery source is unavailable|Nguồn Discovery chuẩn không khả dụng/i
        )
      ).toBeInTheDocument()
      expect(
        within(status).getByRole('button', { name: /Retry search|Thử tìm lại/i })
      ).toBeInTheDocument()
      expect(status).not.toHaveTextContent(/elasticsearch|shard|physical index/i)

      await fireEvent.click(
        within(status).getByRole('button', { name: /Retry search|Thử tìm lại/i })
      )

      expect(visitMock).toHaveBeenCalledWith(
        '/search?q=checkout&type=task&field=Task+title',
        expect.objectContaining({
          preserveScroll: true,
          preserveState: false,
        })
      )
      expect(visitMock.mock.calls[0]?.[0]).not.toContain('cursor=')
    }
  )

  it.each(['SEARCH_CURSOR_INVALID', 'SEARCH_CURSOR_EXPIRED', 'SEARCH_CURSOR_STALE'])(
    'shows a fresh retry for a %s cursor without silently restarting',
    async (code) => {
      render(SearchPage, {
        props: {
          query: 'checkout',
          submittedQuery: 'checkout',
          activeType: 'task',
          activeFieldLabel: 'Task title',
          results: [],
          totalByType: { ...totals, all: 0, task: 0 },
          fieldFacets: facets,
          sourceStatuses: [],
          discoveryFailure: { code },
        },
      })

      expect(
        screen.getByRole('status', { name: /Search cursor status|Tình trạng con trỏ tìm kiếm/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /Start a fresh search|Bắt đầu tìm kiếm mới/i })
      ).toBeInTheDocument()
      expect(screen.queryByText('Search is running in compatibility mode')).not.toBeInTheDocument()

      await fireEvent.click(
        screen.getByRole('button', { name: /Start a fresh search|Bắt đầu tìm kiếm mới/i })
      )

      expect(visitMock).toHaveBeenCalledWith(
        '/search?q=checkout&type=task&field=Task+title',
        expect.objectContaining({
          preserveScroll: true,
          preserveState: false,
        })
      )
      expect(visitMock.mock.calls[0]?.[0]).not.toContain('cursor=')
    }
  )

  it('renders server-owned Discovery presentation without exposing provider documents', () => {
    const discovery: SearchDiscoveryPage = {
      hits: [
        {
          id: 'task:discovery-1',
          entityType: 'task',
          entityId: 'discovery-1',
          rank: 1,
          presentation: {
            title: 'Canonical Discovery result',
            url: '/tasks/discovery-1',
            sourceLabel: 'Task title',
            snippets: ['Server-owned snippet'],
            breadcrumbs: ['Discovery', 'Tasks'],
            primaryActionLabel: 'Open task',
          },
        },
      ],
      total: { value: 1, relation: 'eq' },
      page: {},
      authority: {
        hits: { state: 'authoritative', sources: ['tasks'] },
        total: { state: 'authoritative', sources: ['tasks'] },
        facets: [],
      },
      sources: [
        {
          source: 'tasks',
          state: 'ok',
          authority: 'authoritative',
          resultCount: 1,
          diagnosticCodes: [],
        },
      ],
      diagnostics: [],
      requestId: 'discovery-ui-test',
    }

    render(SearchPage, {
      props: {
        query: 'checkout',
        submittedQuery: 'checkout',
        results: [],
        discovery,
        totalByType: { ...totals, all: 1, task: 1 },
        fieldFacets: [],
        sourceStatuses: [],
      },
    })

    expect(screen.getByText('Canonical Discovery result')).toBeInTheDocument()
    expect(screen.getByText('Server-owned snippet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Canonical Discovery result/i })).toHaveAttribute(
      'href',
      '/tasks/discovery-1'
    )
    expect(screen.getByRole('link', { name: /Canonical Discovery result/i })).toHaveAttribute(
      'data-search-result-mode',
      'discovery'
    )
    expect(screen.queryByText('Raw provider document')).not.toBeInTheDocument()
  })

  it('highlights an unaccented query in accented Discovery titles and snippets', () => {
    const discovery: SearchDiscoveryPage = {
      hits: [
        {
          id: 'talent:duyet',
          entityType: 'talent',
          entityId: 'duyet',
          rank: 1,
          presentation: {
            title: 'Trần Ngọc Duyệt',
            url: '/org/talents/open/duyet',
            sourceLabel: 'Talent name',
            snippets: ['Trần Ngọc Duyệt'],
            breadcrumbs: [],
            primaryActionLabel: 'Open talent',
          },
        },
      ],
      total: { value: 1, relation: 'eq' },
      page: {},
      authority: {
        hits: { state: 'authoritative', sources: ['talents'] },
        total: { state: 'authoritative', sources: ['talents'] },
        facets: [],
      },
      sources: [
        {
          source: 'talents',
          state: 'ok',
          authority: 'authoritative',
          resultCount: 1,
          diagnosticCodes: [],
        },
      ],
      diagnostics: [],
      requestId: 'accented-highlight-test',
    }

    render(SearchPage, {
      props: {
        query: 'duy',
        submittedQuery: 'duy',
        results: [],
        discovery,
        totalByType: { ...totals, all: 1, talent: 1 },
        fieldFacets: [],
        sourceStatuses: [],
      },
    })

    expect(screen.getAllByText('Duy')).toHaveLength(2)
    for (const highlight of screen.getAllByText('Duy')) {
      expect(highlight.tagName).toBe('MARK')
    }
  })

  it('does not show a retry banner when every Discovery source is healthy', () => {
    const discovery: SearchDiscoveryPage = {
      hits: [
        {
          id: 'task:discovery-2',
          entityType: 'task',
          entityId: 'discovery-2',
          rank: 25,
          presentation: {
            title: 'Page two result',
            url: '/tasks/discovery-2',
            sourceLabel: 'Task title',
            snippets: ['Page two'],
            breadcrumbs: [],
            primaryActionLabel: 'Open task',
          },
        },
      ],
      total: { value: 0, relation: 'gte' },
      page: {},
      authority: {
        hits: { state: 'partial', sources: ['tasks'] },
        total: { state: 'partial', sources: ['tasks'] },
        facets: [],
      },
      sources: [
        {
          source: 'tasks',
          state: 'ok',
          authority: 'partial',
          resultCount: 0,
          diagnosticCodes: [],
        },
      ],
      diagnostics: [],
      requestId: 'healthy-compatibility-test',
    }

    render(SearchPage, {
      props: {
        query: 'duy',
        submittedQuery: 'duy',
        results: [],
        discovery,
        totalByType: { ...totals, all: 0 },
        fieldFacets: [],
        sourceStatuses: [],
      },
    })

    expect(
      screen.queryByRole('status', { name: 'Độ tin cậy kết quả Discovery' })
    ).not.toBeInTheDocument()
  })

  it('keeps Discovery coverage totals consistent with rendered hits', () => {
    const discovery: SearchDiscoveryPage = {
      hits: [
        {
          id: 'task:coverage-1',
          entityType: 'task',
          entityId: 'coverage-1',
          rank: 1,
          presentation: {
            title: 'Coverage-consistent result',
            url: '/tasks/coverage-1',
            sourceLabel: 'Task title',
            snippets: ['Discovery-owned result'],
            breadcrumbs: [],
            primaryActionLabel: 'Open task',
          },
        },
      ],
      total: { value: 1, relation: 'eq' },
      page: {},
      authority: {
        hits: { state: 'authoritative', sources: ['tasks'] },
        total: { state: 'authoritative', sources: ['tasks'] },
        facets: [],
      },
      sources: [],
      diagnostics: [],
      requestId: 'coverage-consistency-test',
    }

    render(SearchPage, {
      props: {
        query: 'coverage',
        results: [],
        discovery,
        totalByType: { ...totals, all: 0, task: 0, project: 0 },
        fieldFacets: [],
        sourceStatuses: [],
      },
    })

    expect(
      screen.getByText(/1 results across 1 domains|1 kết quả trên 1 domain/i)
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tasks|Công việc|Nhiệm vụ/i })).toHaveAccessibleName(
      /1/
    )
  })

  it('navigates to the next Discovery cursor through the shareable Search URL', async () => {
    const discovery: SearchDiscoveryPage = {
      hits: [
        {
          id: 'task:discovery-1',
          entityType: 'task',
          entityId: 'discovery-1',
          rank: 1,
          presentation: {
            title: 'Page one result',
            url: '/tasks/discovery-1',
            sourceLabel: 'Task title',
            snippets: ['Page one'],
            breadcrumbs: [],
            primaryActionLabel: 'Open task',
          },
        },
      ],
      total: { value: 2, relation: 'eq' },
      page: { nextCursor: 'opaque-page-2' },
      authority: {
        hits: { state: 'authoritative', sources: ['tasks'] },
        total: { state: 'authoritative', sources: ['tasks'] },
        facets: [],
      },
      sources: [],
      diagnostics: [],
      requestId: 'discovery-page-one',
    }

    render(SearchPage, {
      props: {
        query: 'checkout',
        submittedQuery: 'checkout',
        activeType: 'task',
        results: [],
        discovery,
        totalByType: { ...totals, all: 2, task: 2 },
        fieldFacets: [],
        sourceStatuses: [],
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: /Next page|Trang tiếp theo/i }))

    expect(visitMock).toHaveBeenCalledWith(
      '/search?q=checkout&type=task&cursor=opaque-page-2',
      expect.objectContaining({
        preserveScroll: true,
        preserveState: false,
      })
    )
  })

  it('returns to the immediately previous Discovery cursor through the Search URL', async () => {
    const discovery: SearchDiscoveryPage = {
      hits: [
        {
          id: 'task:discovery-2',
          entityType: 'task',
          entityId: 'discovery-2',
          rank: 25,
          presentation: {
            title: 'Page two result',
            url: '/tasks/discovery-2',
            sourceLabel: 'Task title',
            snippets: ['Page two'],
            breadcrumbs: [],
            primaryActionLabel: 'Open task',
          },
        },
      ],
      total: { value: 48, relation: 'eq' },
      page: { nextCursor: 'opaque-page-3' },
      authority: {
        hits: { state: 'authoritative', sources: ['tasks'] },
        total: { state: 'authoritative', sources: ['tasks'] },
        facets: [],
      },
      sources: [],
      diagnostics: [],
      requestId: 'discovery-page-two',
    }

    render(SearchPage, {
      props: {
        query: 'checkout',
        submittedQuery: 'checkout',
        activeType: 'task',
        cursor: 'opaque-page-2',
        previousCursor: 'opaque-page-1',
        results: [],
        discovery,
        totalByType: { ...totals, all: 48, task: 48 },
        fieldFacets: [],
        sourceStatuses: [],
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: /Previous page|Trang trước/i }))

    expect(visitMock).toHaveBeenCalledWith(
      '/search?q=checkout&type=task&cursor=opaque-page-1',
      expect.objectContaining({
        preserveScroll: true,
        preserveState: false,
      })
    )
  })

  it('cancels the previous Search navigation before a newer scope can win the response race', async () => {
    const cancellations: string[] = []
    visitMock.mockImplementation(
      (
        _url: string,
        options: {
          onCancelToken?: (token: { cancel: () => void }) => void
        }
      ) => {
        options.onCancelToken?.({ cancel: () => cancellations.push('cancelled') })
      }
    )
    renderSearchPage()

    const filter = screen.getByLabelText('Bộ lọc kết quả tìm kiếm')
    await fireEvent.click(within(filter).getByText('Dự án'))
    await fireEvent.click(within(filter).getByText('Nhiệm vụ'))

    expect(cancellations).toEqual(['cancelled'])
  })

  it('announces provider degradation and partial Discovery authority as polite status updates', async () => {
    const discovery: SearchDiscoveryPage = {
      hits: [],
      total: { value: 0, relation: 'gte' },
      page: {},
      authority: {
        hits: { state: 'partial', sources: ['tasks'] },
        total: { state: 'partial', sources: ['tasks'] },
        facets: [],
      },
      sources: [
        {
          source: 'tasks',
          state: 'partial',
          authority: 'partial',
          resultCount: 0,
          diagnosticCodes: ['SEARCH_SOURCE_PARTIAL'],
        },
      ],
      diagnostics: [{ code: 'SEARCH_SOURCE_PARTIAL', severity: 'warning' }],
      requestId: 'partial-authority-test',
    }

    render(SearchPage, {
      props: {
        query: 'checkout',
        submittedQuery: 'checkout',
        results: [],
        discovery,
        totalByType: totals,
        sourceStatuses: [
          { source: 'tasks', status: 'failed', resultCount: 0, errorMessage: 'unavailable' },
        ],
      },
    })

    const sourceStatus = screen.getByRole('status', { name: 'Tình trạng nguồn tìm kiếm' })
    const authorityStatus = screen.getByRole('status', { name: 'Độ tin cậy kết quả Discovery' })

    for (const status of [sourceStatus, authorityStatus]) {
      expect(status).toHaveAttribute('aria-live', 'polite')
      expect(status).toHaveAttribute('aria-atomic', 'true')
    }

    expect(within(sourceStatus).getByText('Tìm kiếm không khả dụng')).toBeInTheDocument()
    expect(within(authorityStatus).getByText('Kết quả chưa đầy đủ')).toBeInTheDocument()

    const retry = within(authorityStatus).getByRole('button', {
      name: /Retry search|Thử tìm lại/i,
    })
    expect(retry).toBeInTheDocument()
    await fireEvent.click(retry)
    expect(visitMock).toHaveBeenCalledWith(
      '/search?q=checkout',
      expect.objectContaining({
        preserveScroll: true,
        preserveState: false,
      })
    )
  })

  it('navigates to domain and field-filtered search URLs', async () => {
    renderSearchPage()

    await fireEvent.click(
      within(screen.getByLabelText('Bộ lọc kết quả tìm kiếm')).getByText('Dự án')
    )
    expect(visitMock).toHaveBeenCalledWith(
      '/search?q=checkout&type=project',
      expect.objectContaining({
        preserveScroll: true,
        preserveState: true,
      })
    )

    await fireEvent.click(
      within(screen.getByLabelText('Phân tích trường khớp tìm kiếm')).getByText('Task title')
    )
    expect(visitMock).toHaveBeenCalledWith(
      '/search?q=checkout&field=Task+title',
      expect.objectContaining({
        preserveScroll: true,
        preserveState: true,
      })
    )
  })

  it('exposes the active domain and field filters as pressed controls', () => {
    render(SearchPage, {
      props: {
        query: 'checkout',
        activeType: 'project',
        activeFieldLabel: 'Project name',
        results,
        totalByType: totals,
        fieldFacets: facets,
        sourceStatuses,
      },
    })

    expect(screen.getByRole('button', { name: /Projects|Dự án/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: /All|Tất cả/i })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
    expect(screen.getByRole('button', { name: /Project name/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: /Task title/i })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
  })

  it('uses the organization shell search prefix when requested', async () => {
    render(SearchPage, {
      props: {
        shellMode: 'organization',
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

    await fireEvent.click(
      within(screen.getByLabelText('Bộ lọc kết quả tìm kiếm')).getByText('Dự án')
    )
    expect(visitMock).toHaveBeenCalledWith(
      '/org/search?q=checkout&type=project',
      expect.objectContaining({
        preserveScroll: true,
        preserveState: true,
      })
    )
  })

  it('submits trimmed query, records telemetry, and remembers recent searches', async () => {
    renderSearchPage()

    const input = screen.getByPlaceholderText(
      'Tìm task, project, comment, talent, skill, organization...'
    )
    await fireEvent.input(input, { target: { value: '  Apollo risk  ' } })
    const form = input.closest('form')
    if (!form) {
      throw new Error('Search form not found')
    }
    await fireEvent.submit(form)

    expect(visitMock).toHaveBeenCalledWith(
      '/search?q=Apollo+risk',
      expect.objectContaining({
        preserveScroll: true,
      })
    )
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

  it('submits a keyword-only search with canonical history and no synthetic filters', async () => {
    render(SearchPage, {
      props: {
        query: '',
        results: [],
      },
    })

    const input = screen.getByPlaceholderText(
      'Tìm task, project, comment, talent, skill, organization...'
    )
    await fireEvent.input(input, { target: { value: '  keyword-only  ' } })
    const form = input.closest('form')
    if (!form) {
      throw new Error('Search form not found')
    }
    await fireEvent.submit(form)

    expect(visitMock).toHaveBeenCalledWith(
      '/search?q=keyword-only',
      expect.objectContaining({
        preserveScroll: true,
      })
    )
    expect(visitMock.mock.calls[0]?.[0]).not.toContain('type=')
    expect(visitMock.mock.calls[0]?.[0]).not.toContain('field=')
    expect(JSON.parse(localStorage.getItem('suar:search:recent_queries') ?? '[]')).toEqual([
      'keyword-only',
    ])
    expect(screen.queryByLabelText('Tình trạng nguồn tìm kiếm')).not.toBeInTheDocument()
  })

  it('shows empty search prompt before any query', () => {
    render(SearchPage, {
      props: {
        query: '',
        results: [],
      },
    })

    expect(screen.getByText('Nhập từ khóa để tìm kiếm trên Suar.')).toBeInTheDocument()
  })

  it('renders task Discovery browse results when the query is intentionally empty', () => {
    const discovery: SearchDiscoveryPage = {
      hits: [
        {
          id: 'task:browse-1',
          entityType: 'task',
          entityId: 'browse-1',
          rank: 1,
          presentation: {
            title: 'Browseable task',
            url: '/tasks/browse-1',
            sourceLabel: 'Task title',
            snippets: ['Filter-only browse result'],
            breadcrumbs: [],
            primaryActionLabel: 'Open task',
          },
        },
      ],
      total: { value: 1, relation: 'eq' },
      page: {},
      authority: {
        hits: { state: 'authoritative', sources: ['tasks'] },
        total: { state: 'authoritative', sources: ['tasks'] },
        facets: [],
      },
      sources: [],
      diagnostics: [],
      requestId: 'browse-ui-test',
    }

    render(SearchPage, {
      props: {
        query: '',
        activeType: 'task',
        results: [],
        discovery,
        totalByType: { ...totals, all: 1, task: 1 },
      },
    })

    expect(screen.getByText('Browseable task')).toBeInTheDocument()
    expect(screen.queryByText('Nhập từ khóa để tìm kiếm trên Suar.')).not.toBeInTheDocument()
  })

  it('renders the server-authoritative result page without refiltering the bounded response', () => {
    render(SearchPage, {
      props: {
        query: 'checkout',
        activeType: 'project',
        activeFieldLabel: 'Project name',
        results,
        totalByType: totals,
      },
    })

    expect(screen.getByText('Checkout QA evidence package')).toBeInTheDocument()
    expect(screen.getByText('Checkout Quality Project')).toBeInTheDocument()
  })
})
