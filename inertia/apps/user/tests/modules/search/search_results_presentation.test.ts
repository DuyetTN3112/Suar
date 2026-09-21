import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { SearchDiscoveryPage } from '@/apps/shared/search/types'
import SearchPage from '@/apps/user/modules/search/index.svelte'

import {
  facets,
  renderSearchPage,
  results,
  totals,
} from './support/search_test_fixtures.js'

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

describe('SearchPage - Results Presentation & Recovery', () => {
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

  it('renders the server-authoritative result page without refiltering the bounded response', () => {
    renderSearchPage()

    expect(screen.getByText('Checkout QA evidence package')).toBeInTheDocument()
    expect(screen.getByText('Checkout Quality Project')).toBeInTheDocument()
  })
})
