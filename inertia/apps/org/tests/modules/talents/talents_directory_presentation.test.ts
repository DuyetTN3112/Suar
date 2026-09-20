import { fireEvent, screen } from '@testing-library/svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const inertiaMocks = vi.hoisted(() => ({
  router: {
    get: vi.fn(),
    visit: vi.fn(),
    reload: vi.fn(),
  },
}))

vi.mock('@/apps/org/shared/layouts/organization_layout.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/layout_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@/apps/org/shared/stores/notification_store.svelte', () => ({
  notificationStore: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@inertiajs/svelte', () => ({
  router: inertiaMocks.router,
}))

import { renderPage } from './support/talents_test_fixtures.js'

describe('OrgTalentsPage - Directory Presentation & Actions', () => {
  beforeEach(() => {
    inertiaMocks.router.get.mockClear()
    inertiaMocks.router.reload.mockClear()
    document.head.innerHTML = '<meta name="csrf-token" content="csrf-token-1">'
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { id: 'bookmark-1' } }),
        })
      )
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses unified pagination and preserves talent filters', () => {
    renderPage()

    expect(screen.getByText('11-20 / 25')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Hồ sơ' })).toHaveAttribute(
      'href',
      '/org/talents/talent-1'
    )
    expect(screen.getByRole('link', { name: /trang trước/i })).toHaveAttribute(
      'href',
      '/org/talents?q=backend&task_id=task-1&skill_categories=technology&skill_ids=skill-1&business_domain=fintech&task_type=api_design&problem_category=compliance&role_in_task=architect&tech_stack=AdonisJS&domain_tags=settlement&sort_by=trust_score&page=1'
    )
  })

  it('preserves the cursor page size in older-page links', () => {
    renderPage({
      filters: {
        q: null,
        skill_ids: ['skill-1'],
        sort_by: 'trust_score',
        sort_order: 'desc',
        min_proficiency: 'l10',
      },
      pagination: {
        mode: 'cursor',
        page: 1,
        perPage: 1,
        total: 2,
        lastPage: 2,
        hasNextPage: true,
        hasPreviousPage: false,
        cursor: {
          nextCursor: 'opaque-next-cursor',
          previousCursor: null,
        },
      },
    })

    expect(screen.getByRole('link', { name: /cũ hơn/i })).toHaveAttribute(
      'href',
      expect.stringContaining('per_page=1')
    )
    expect(screen.getByText('1-1 / 2')).toBeInTheDocument()
  })

  it('shows public demonstrated work with governed verification context', () => {
    renderPage()

    expect(screen.getByTestId('public-accomplishments-talent-1')).toHaveTextContent(
      'Checkout reliability'
    )
    expect(screen.getByTestId('public-accomplishments-talent-1')).toHaveTextContent(
      'Reduced payment failure rate'
    )
    expect(screen.getByTestId('public-accomplishments-talent-1')).toHaveTextContent('Verified')
    expect(screen.getByTestId('public-accomplishments-talent-1')).not.toHaveTextContent(
      'reviewer'
    )
  })

  it('renders an explicit empty state when filters return no talents', () => {
    renderPage({
      talents: [],
      pagination: {
        mode: 'offset',
        page: 1,
        perPage: 10,
        total: 0,
        lastPage: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    })

    expect(screen.getByTestId('empty-state')).toHaveTextContent(/Không tìm thấy nhân tài nào/i)
    expect(screen.queryByRole('link', { name: 'Hồ sơ' })).not.toBeInTheDocument()
  })

  it('clamps talent metric display to percentage bounds', () => {
    renderPage({
      talents: [
        {
          id: 'talent-1',
          username: 'duyet',
          status: 'active',
          skill_match: 375,
          domain_match: -10,
          delivery_reliability: 150,
          trust_score: 64,
          bookmark: {
            id: null,
            isSaved: false,
            notes: null,
            folder: null,
            rating: null,
          },
        },
      ],
    })

    expect(screen.getByText('Đúng hạn')).toBeInTheDocument()
    expect(screen.getAllByText('100')).toHaveLength(2)
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.queryByText('375')).not.toBeInTheDocument()
    expect(screen.queryByText('-10')).not.toBeInTheDocument()
    expect(screen.queryByText('150')).not.toBeInTheDocument()
  })

  it('opens task match explainability from a talent score row', async () => {
    renderPage({
      talents: [
        {
          id: 'talent-1',
          username: 'duyet',
          status: 'active',
          match_score: 84,
          skill_match: 90,
          domain_match: 75,
          delivery_reliability: 80,
          trust_score: 92,
          explanations: [
            'Matched TypeScript from verified reviews',
            'Domain history matched fintech',
            'Delivery record: 4/5 tasks on time',
            'Trust score is backed by recent reviews',
          ],
          risks: ['Missing mandatory skill: PCI DSS'],
          reviewed_skills_count: 2,
          imported_skills_count: 5,
          under_dispute_skills_count: 1,
          latest_confidence_signal: 'high',
          bookmark: {
            id: null,
            isSaved: false,
            notes: null,
            folder: null,
            rating: null,
          },
        },
      ],
      filters: {
        q: null,
        task_id: 'task-1',
        skill_categories: null,
        skill_ids: null,
        business_domain: null,
        task_type: null,
        problem_category: null,
        role_in_task: null,
        tech_stack: null,
        domain_tags: null,
        sort_by: 'relevance',
        sort_order: 'desc',
        saved: null,
        min_trust_score: null,
        min_completed_tasks: null,
      },
    })

    expect(screen.getByText('1/1 đã review')).toBeInTheDocument()
    expect(screen.getByText('2 reviewed · 5 imported')).toBeInTheDocument()
    expect(screen.queryByText('Matched TypeScript from verified reviews')).not.toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: /xem chi tiết điểm/i }))

    expect(screen.getByText('84')).toBeInTheDocument()
    expect(screen.getByText('Matched TypeScript from verified reviews')).toBeInTheDocument()
    expect(screen.getByText('Domain history matched fintech')).toBeInTheDocument()
    expect(screen.getByText('Delivery record: 4/5 tasks on time')).toBeInTheDocument()
    expect(screen.getByText('Trust score is backed by recent reviews')).toBeInTheDocument()
    expect(screen.getAllByText('Missing mandatory skill: PCI DSS')).toHaveLength(2)
    expect(screen.getByText('Confidence High')).toBeInTheDocument()
  })

  it('shows the selected task title when ranking talents for a task', () => {
    renderPage({
      talents: [
        {
          id: 'talent-1',
          username: 'duyet',
          status: 'active',
          match_score: 84,
          skill_match: 90,
          domain_match: 75,
          delivery_reliability: 80,
          trust_score: 92,
          bookmark: {
            id: null,
            isSaved: false,
            notes: null,
            folder: null,
            rating: null,
          },
        },
      ],
    })

    expect(screen.getByText('Ngữ cảnh xếp hạng')).toBeInTheDocument()
    expect(screen.getAllByText('Build billing API').length).toBeGreaterThan(0)
    expect(screen.getByTestId('task-ranking-metrics')).toHaveTextContent('Kỹ năng')
    expect(screen.getByTestId('task-ranking-metrics')).toHaveTextContent('Lĩnh vực')
    expect(screen.getByTestId('task-ranking-metrics')).toHaveTextContent('Đúng hạn')
  })

  it('uses trust-only presentation when no task is selected', () => {
    renderPage({
      filters: {
        q: null,
        task_id: null,
        skill_categories: null,
        skill_ids: null,
        business_domain: null,
        task_type: null,
        problem_category: null,
        role_in_task: null,
        tech_stack: null,
        domain_tags: null,
        sort_by: 'trust_score',
        sort_order: 'desc',
        saved: null,
        min_trust_score: null,
        min_completed_tasks: null,
      },
      talents: [
        {
          id: 'talent-1',
          username: 'duyet',
          status: 'active',
          match_score: null,
          skill_match: 90,
          domain_match: 75,
          delivery_reliability: 80,
          trust_score: 92,
          bookmark: {
            id: null,
            isSaved: false,
            notes: null,
            folder: null,
            rating: null,
          },
        },
      ],
    })

    expect(screen.getByText('Danh bạ chỉ dựa trên độ tin cậy')).toBeInTheDocument()
    expect(screen.getByTestId('trust-only-metric')).toHaveTextContent('Tin cậy')
    expect(screen.queryByTestId('task-ranking-metrics')).not.toBeInTheDocument()
    expect(screen.queryByText('Điểm phù hợp')).not.toBeInTheDocument()
  })

  it('lets recruiters save a talent directly from directory results', async () => {
    renderPage({
      filters: {
        q: null,
        task_id: null,
        skill_categories: null,
        skill_ids: null,
        business_domain: null,
        task_type: null,
        problem_category: null,
        role_in_task: null,
        tech_stack: null,
        domain_tags: null,
        sort_by: 'relevance',
        sort_order: 'desc',
        saved: null,
        min_trust_score: null,
        min_completed_tasks: null,
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: /lưu nhân tài/i }))

    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/me/organizations/current/talents/talent-1/bookmarks',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-CSRF-TOKEN': 'csrf-token-1',
        }) as unknown,
        body: JSON.stringify({
          folder: 'Shortlist',
        }),
      })
    )
    expect(inertiaMocks.router.reload).toHaveBeenCalled()
  })

  it('lets recruiters remove a saved talent from directory results', async () => {
    renderPage({
      talents: [
        {
          id: 'talent-1',
          username: 'duyet',
          status: 'active',
          bookmark: {
            id: 'bookmark-1',
            isSaved: true,
            notes: null,
            folder: 'Shortlist',
            rating: null,
          },
        },
      ],
    })

    await fireEvent.click(screen.getByRole('button', { name: /bỏ lưu/i }))

    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/me/organizations/current/talents/talent-1/bookmarks',
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({
          'X-CSRF-TOKEN': 'csrf-token-1',
        }) as unknown,
      })
    )
    expect(inertiaMocks.router.reload).toHaveBeenCalled()
  })
})
