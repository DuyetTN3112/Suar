import { cleanup, render, screen } from '@testing-library/svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const inertiaMocks = vi.hoisted(() => ({
  router: {
    get: vi.fn(),
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

import OrgTalentsPage from '@/apps/org/modules/talents/index.svelte'

function renderTalentSurface() {
  return render(OrgTalentsPage, {
    props: {
      talents: [],
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
        min_proficiency: null,
      },
      availableSkills: [
        { id: 'skill-typescript', skill_name: 'TypeScript', category_code: 'technology' },
        { id: 'skill-delivery', skill_name: 'Release Planning', category_code: 'delivery' },
      ],
      availableTasks: [{ id: 'task-1', title: 'Build billing API' }],
      pagination: {
        mode: 'offset',
        page: 1,
        perPage: 10,
        total: 0,
        lastPage: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    },
  })
}

describe('TC-FST-013 Talent surface', () => {
  beforeEach(() => {
    inertiaMocks.router.get.mockClear()
    inertiaMocks.router.reload.mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  it('exposes the shared search, taxonomy, multi-select, and explicit-commit primitives', () => {
    renderTalentSurface()

    expect(screen.getByTestId('talent-search-keyword')).toHaveAttribute('placeholder', 'Tìm nhân tài')
    expect(screen.getByTestId('talent-skill-filter')).toHaveAttribute('multiple')
    expect(screen.getByTestId('talent-business-domain')).toBeInTheDocument()
    expect(screen.getByTestId('talent-task-type')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tìm kiếm' })).toBeInTheDocument()
  })

  it('keeps Talent composition dense and recruiter-oriented with distinct wording', () => {
    const { container } = renderTalentSurface()

    const denseForm = container.querySelector('form')
    expect(denseForm).toBeInTheDocument()
    expect(denseForm).toHaveClass('md:grid-cols-3', 'xl:grid-cols-4')
    expect(screen.getByTestId('talent-search-task')).toBeInTheDocument()
    expect(screen.getByTestId('talent-min-proficiency')).toBeInTheDocument()
    expect(screen.getByText('Danh bạ chỉ dựa trên độ tin cậy')).toBeInTheDocument()
    expect(screen.queryByText('Tìm nhiệm vụ')).not.toBeInTheDocument()
  })
})
