import { fireEvent, screen } from '@testing-library/svelte'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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

describe('OrgTalentsPage - Filters & Query Controls', () => {
  beforeEach(() => {
    inertiaMocks.router.get.mockClear()
    inertiaMocks.router.reload.mockClear()
  })

  it('keeps the skill filter collapsed until it is needed', () => {
    renderPage({
      filters: {
        q: null,
        task_id: null,
        skill_categories: null,
        skill_ids: null,
        sort_by: 'trust_score',
        sort_order: 'desc',
      },
    })

    expect(screen.getByTestId('talent-skill-filter')).not.toHaveAttribute('open')
  })

  it('lets recruiters submit a keyword search, not only task/ranking filters', async () => {
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

    await fireEvent.click(screen.getByLabelText('Quản lý công việc'))
    expect(screen.queryByText('TypeScript · Technology')).not.toBeInTheDocument()
    expect(screen.getByText('Release Planning · Delivery')).toBeInTheDocument()

    await fireEvent.click(screen.getByLabelText('Release Planning · Delivery'))
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

  it('submits all selected skills for same-talent matching', async () => {
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

    const skillSelect = screen.getByTestId('talent-skill-filter')
    expect(skillSelect.querySelectorAll('input[type="checkbox"]')).toHaveLength(4)
    await fireEvent.click(screen.getByLabelText('Release Planning · Delivery'))
    await fireEvent.click(screen.getByLabelText('API Design · Engineering'))
    await fireEvent.click(screen.getByRole('button', { name: /tìm kiếm/i }))

    expect(inertiaMocks.router.get).toHaveBeenCalledWith(
      '/org/talents',
      expect.objectContaining({ skill_ids: 'skill-2,skill-4' }),
      { preserveState: false, preserveScroll: true }
    )
  })

  it('keeps legacy filters when the discovery page uses cursor pagination', async () => {
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
      pagination: {
        mode: 'cursor',
        page: 1,
        perPage: 10,
        total: 25,
        lastPage: 1,
        hasNextPage: true,
        hasPreviousPage: false,
        cursor: { nextCursor: 'next', previousCursor: null },
      },
    })

    await fireEvent.click(screen.getByLabelText('Công nghệ'))
    await fireEvent.change(screen.getByTestId('talent-search-task'), {
      target: { value: 'task-2' },
    })
    await fireEvent.click(screen.getByRole('button', { name: /tìm kiếm/i }))

    expect(inertiaMocks.router.get).toHaveBeenCalledWith(
      '/org/talents',
      expect.objectContaining({
        task_id: 'task-2',
        skill_categories: ['technology'],
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

  it('submits recruiter sort controls with talent filters', async () => {
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
})
