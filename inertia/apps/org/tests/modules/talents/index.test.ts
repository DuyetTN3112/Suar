import { fireEvent, render, screen } from '@testing-library/svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import OrgTalentsPage from '@/apps/org/modules/talents/index.svelte'

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

describe('OrgTalentsPage', () => {
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

  function renderPage(overrides = {}) {
    return render(OrgTalentsPage, {
      props: {
        talents: [
          {
            id: 'talent-1',
            username: 'duyet',
            status: 'active',
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
          q: 'backend',
          task_id: 'task-1',
          skill_categories: ['technology'],
          skill_ids: ['skill-1'],
          business_domain: 'fintech',
          task_type: 'api_design',
          problem_category: 'compliance',
          role_in_task: 'architect',
          tech_stack: 'AdonisJS',
          domain_tags: 'settlement',
          sort_by: 'trust_score',
          sort_order: 'desc',
          saved: null,
          min_trust_score: null,
          min_completed_tasks: null,
        },
        availableSkills: [
          { id: 'skill-1', skill_name: 'TypeScript', category_code: 'technology' },
          { id: 'skill-2', skill_name: 'Release Planning', category_code: 'delivery' },
          { id: 'skill-3', skill_name: 'Stakeholder Facilitation', category_code: 'soft_skill' },
          { id: 'skill-4', skill_name: 'API Design', category_code: 'engineering' },
        ],
        availableTasks: [
          { id: 'task-1', title: 'Build billing API' },
          { id: 'task-2', title: 'Review settlement ledger' },
        ],
        stats: {
          total: 25,
          saved: 2,
        },
        pagination: {
          mode: 'offset',
          page: 2,
          perPage: 10,
          total: 25,
          lastPage: 3,
          hasNextPage: true,
          hasPreviousPage: true,
        },
        ...overrides,
      },
    })
  }

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

  it('lets recruiters submit a keyword search, not only task/ranking filters', async () => {
    inertiaMocks.router.get.mockClear()
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

    await fireEvent.input(screen.getByTestId('talent-search-keyword'), {
      target: { value: 'frontend' },
    })
    await fireEvent.click(screen.getByRole('button', { name: /tìm kiếm/i }))

    expect(inertiaMocks.router.get).toHaveBeenCalledWith(
      '/org/talents',
      expect.objectContaining({
        q: 'frontend',
      }),
      { preserveState: false, preserveScroll: true }
    )
  })

  it('uses scoped task options for task-based talent ranking', async () => {
    inertiaMocks.router.get.mockClear()
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

    expect(screen.getByRole('option', { name: 'Build billing API' })).toBeInTheDocument()

    await fireEvent.change(screen.getByTestId('talent-search-task'), {
      target: { value: 'task-2' },
    })
    await fireEvent.click(screen.getByRole('button', { name: /tìm kiếm/i }))

    expect(inertiaMocks.router.get).toHaveBeenCalledWith(
      '/org/talents',
      expect.objectContaining({
        task_id: 'task-2',
      }),
      { preserveState: false, preserveScroll: true }
    )
  })

  it('submits skill category, skill, and work-history filters for recruiter discovery', async () => {
    inertiaMocks.router.get.mockClear()
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

    await fireEvent.click(screen.getByLabelText('Thực thi'))
    expect(screen.queryByRole('option', { name: /TypeScript/ })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Release Planning · Delivery' })).toBeInTheDocument()

    const skillSelect = screen.getByTestId('talent-skill-filter')
    await fireEvent.change(skillSelect, {
      target: { value: 'skill-2' },
    })
    await fireEvent.change(screen.getByTestId('talent-business-domain'), {
      target: { value: 'fintech' },
    })
    await fireEvent.change(screen.getByTestId('talent-task-type'), {
      target: { value: 'api_design' },
    })
    await fireEvent.change(screen.getByTestId('talent-problem-category'), {
      target: { value: 'compliance' },
    })
    await fireEvent.change(screen.getByTestId('talent-role-in-task'), {
      target: { value: 'architect' },
    })
    await fireEvent.input(screen.getByTestId('talent-tech-stack'), {
      target: { value: 'AdonisJS' },
    })
    await fireEvent.input(screen.getByTestId('talent-domain-tags'), {
      target: { value: 'settlement' },
    })
    await fireEvent.click(screen.getByRole('button', { name: /tìm kiếm/i }))

    expect(inertiaMocks.router.get).toHaveBeenCalledWith(
      '/org/talents',
      expect.objectContaining({
        skill_categories: ['delivery'],
        skill_ids: ['skill-2'],
        business_domain: 'fintech',
        task_type: 'api_design',
        problem_category: 'compliance',
        role_in_task: 'architect',
        tech_stack: 'AdonisJS',
        domain_tags: 'settlement',
      }),
      { preserveState: false, preserveScroll: true }
    )
  })

  it('uses the full marketplace task taxonomy for recruiter filters', () => {
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

    expect(screen.getByRole('option', { name: 'System integration' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Gaming' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Reliability' })).toBeInTheDocument()
    expect(screen.getByLabelText('Công nghệ')).toBeInTheDocument()
    expect(screen.getByLabelText('Kỹ thuật')).toBeInTheDocument()
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

  it('submits recruiter sort controls with talent filters', async () => {
    inertiaMocks.router.get.mockClear()
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

    await fireEvent.change(screen.getByTestId('talent-sort-by'), {
      target: { value: 'completed_tasks' },
    })
    await fireEvent.change(screen.getByTestId('talent-sort-order'), {
      target: { value: 'asc' },
    })
    await fireEvent.click(screen.getByRole('button', { name: /tìm kiếm/i }))

    expect(inertiaMocks.router.get).toHaveBeenCalledWith(
      '/org/talents',
      expect.objectContaining({
        sort_by: 'completed_tasks',
        sort_order: 'asc',
      }),
      { preserveState: false, preserveScroll: true }
    )
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
