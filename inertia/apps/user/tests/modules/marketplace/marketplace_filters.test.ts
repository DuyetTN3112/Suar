import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

const inertiaMocks = vi.hoisted(() => ({
  router: {
    get: vi.fn(),
  },
}))

vi.mock('@inertiajs/svelte', () => ({
  router: inertiaMocks.router,
}))

import MarketplaceFilters from '@/apps/user/modules/marketplace/components/marketplace_filters.svelte'
import type { MarketplaceFilters as MarketplaceFiltersProps } from '@/apps/user/modules/marketplace/types.svelte.ts'

const filters: MarketplaceFiltersProps = {
  sort_by: 'created_at',
  sort_order: 'desc',
}

function renderFilters(
  filterOverrides: Partial<MarketplaceFiltersProps> = {},
  availableSkills: Array<{ id: string; skill_name: string; category_code?: string | null }> = []
) {
  return render(MarketplaceFilters, {
    props: {
      filters: { ...filters, ...filterOverrides },
      availableSkills,
    },
  })
}

describe('MarketplaceFilters staged responsive behavior', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    vi.restoreAllMocks()
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 })
  })

  function mockViewport() {
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query === '(max-width: 767px)' && window.innerWidth <= 767,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  }

  it('does not navigate when a filter changes until Apply is pressed', async () => {
    renderFilters()

    await fireEvent.click(screen.getByRole('button', { name: /lọc thêm/i }))
    await fireEvent.change(screen.getByLabelText('Độ khó'), { target: { value: 'easy' } })

    expect(inertiaMocks.router.get).not.toHaveBeenCalled()

    const applyButton = screen.getAllByRole('button', { name: 'Lọc' }).at(-1)
    if (!applyButton) throw new Error('Expected an Apply button')
    await fireEvent.click(applyButton)

    expect(inertiaMocks.router.get).toHaveBeenCalledWith(
      '/marketplace/tasks',
      expect.objectContaining({ difficulty: 'easy' }),
      expect.objectContaining({ preserveState: true })
    )
  })

  it('stages mobile changes, cancels them without navigating, and restores opener focus', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
    mockViewport()
    renderFilters()

    const opener = screen.getByRole('button', { name: /lọc thêm/i })
    expect(opener).toHaveAttribute('aria-expanded', 'false')
    opener.focus()
    await fireEvent.click(opener)
    expect(opener).toHaveAttribute('aria-expanded', 'true')

    const dialog = await screen.findByRole('dialog', {
      name: /marketplace filters|bộ lọc marketplace/i,
    })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Cancel filter changes' })).toHaveFocus()
    )

    await fireEvent.change(screen.getByLabelText('Độ khó'), { target: { value: 'easy' } })
    await fireEvent.click(screen.getByRole('button', { name: 'Cancel filter changes' }))

    expect(inertiaMocks.router.get).not.toHaveBeenCalled()
    await waitFor(() => expect(opener).toHaveFocus())
    expect(dialog).not.toBeInTheDocument()
  })

  it('allows applying a staged removal of the last committed filter', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
    mockViewport()
    renderFilters({ difficulty: 'easy' })

    const opener = screen.getByRole('button', { name: /lọc thêm/i })
    await fireEvent.click(opener)
    const dialog = await screen.findByRole('dialog', {
      name: /marketplace filters|bộ lọc marketplace/i,
    })
    expect(dialog).toBeInTheDocument()

    await fireEvent.change(screen.getByLabelText('Độ khó'), { target: { value: '' } })
    const applyButton = screen.getByRole('button', { name: 'Apply filter changes' })
    expect(applyButton).toBeEnabled()
    await fireEvent.click(applyButton)

    expect(inertiaMocks.router.get).toHaveBeenCalledWith(
      '/marketplace/tasks',
      expect.not.objectContaining({ difficulty: 'easy' }),
      expect.objectContaining({ preserveState: true })
    )
  })

  it('submits multiple selected skills with the server-backed Any/All mode', async () => {
    renderFilters(
      {
        skill_ids: ['skill-a', 'skill-b'],
        skill_match: 'all',
      },
      [
        { id: 'skill-a', skill_name: 'Skill A', category_code: 'technology' },
        { id: 'skill-b', skill_name: 'Skill B', category_code: 'technology' },
      ]
    )

    await fireEvent.click(screen.getByRole('button', { name: /lọc thêm/i }))

    const skillSelect = screen.getByLabelText('Kỹ năng', { exact: true })
    expect(skillSelect).toHaveAttribute('multiple')
    Array.from(skillSelect.querySelectorAll('option')).forEach((option) => {
      option.selected = option.value === 'skill-a' || option.value === 'skill-b'
    })
    await fireEvent.change(skillSelect)
    await fireEvent.change(screen.getByLabelText(/khớp kỹ năng|skill match/i), {
      target: { value: 'all' },
    })

    const applyButton = screen.getAllByRole('button', { name: 'Lọc' }).at(-1)
    if (!applyButton) throw new Error('Expected an Apply button')
    await fireEvent.click(applyButton)

    expect(inertiaMocks.router.get).toHaveBeenCalledWith(
      '/marketplace/tasks',
      expect.objectContaining({ skill_ids: ['skill-a', 'skill-b'], skill_match: 'all' }),
      expect.objectContaining({ preserveState: true })
    )
  })

  it('projects the complete legacy query contract through an explicit history push', async () => {
    renderFilters({
      skill_categories: ['technology'],
      skill_ids: ['skill-a', 'skill-b'],
      skill_match: 'all',
      keyword: '  contract discovery  ',
      difficulty: 'hard',
      task_type: 'api_design',
      business_domain: 'fintech',
      problem_category: 'compliance',
      role_in_task: 'architect',
      verification_method: 'security_audit',
      tech_stack: ' AdonisJS ',
      domain_tags: ' settlement ',
      accepting_applications: 'open',
      sort_by: 'due_date',
      sort_order: 'asc',
    })

    await fireEvent.click(screen.getByRole('button', { name: /lọc thêm/i }))
    const applyButton = screen.getAllByRole('button', { name: 'Lọc' }).at(-1)
    if (!applyButton) throw new Error('Expected an Apply button')
    await fireEvent.click(applyButton)

    expect(inertiaMocks.router.get).toHaveBeenCalledWith(
      '/marketplace/tasks',
      expect.objectContaining({
        skill_categories: ['technology'],
        skill_ids: ['skill-a', 'skill-b'],
        skill_match: 'all',
        keyword: 'contract discovery',
        difficulty: 'hard',
        task_type: 'api_design',
        business_domain: 'fintech',
        problem_category: 'compliance',
        role_in_task: 'architect',
        verification_method: 'security_audit',
        tech_stack: 'AdonisJS',
        domain_tags: 'settlement',
        accepting_applications: 'open',
        sort_by: 'due_date',
        sort_order: 'asc',
      }),
      expect.objectContaining({
        preserveScroll: true,
        preserveState: true,
        replace: false,
      })
    )
  })

  it('rehydrates a new flat history entry without navigating or retaining the old draft', async () => {
    const view = renderFilters({ difficulty: 'easy', keyword: 'first-entry' })

    await fireEvent.click(screen.getByRole('button', { name: /lọc thêm/i }))
    await waitFor(() => expect(screen.getByLabelText('Độ khó')).toHaveValue('easy'))
    await fireEvent.change(screen.getByLabelText('Độ khó'), { target: { value: 'hard' } })
    expect(screen.getByLabelText('Độ khó')).toHaveValue('hard')
    expect(inertiaMocks.router.get).not.toHaveBeenCalled()

    await view.rerender({
      filters: { ...filters, difficulty: 'medium', keyword: 'from-history' },
      availableSkills: [],
    })

    await waitFor(() => {
      expect(screen.getByLabelText('Độ khó')).toHaveValue('medium')
      expect(screen.getByLabelText('Tìm nhiệm vụ')).toHaveValue('from-history')
    })
    expect(inertiaMocks.router.get).not.toHaveBeenCalled()
  })
})
