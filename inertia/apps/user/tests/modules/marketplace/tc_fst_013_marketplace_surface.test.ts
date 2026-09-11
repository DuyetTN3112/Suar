import { cleanup, fireEvent, render, screen } from '@testing-library/svelte'
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

const availableSkills = [
  { id: 'skill-typescript', skill_name: 'TypeScript', category_code: 'technology' },
  { id: 'skill-delivery', skill_name: 'Release Planning', category_code: 'delivery' },
]

describe('TC-FST-013 Marketplace surface', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('exposes the shared search, taxonomy, multi-select, and explicit-commit primitives', async () => {
    render(MarketplaceFilters, { props: { filters, availableSkills } })

    expect(screen.getByRole('searchbox', { name: 'Tìm nhiệm vụ' })).toBeInTheDocument()
    expect(screen.getByLabelText('Kỹ năng')).toHaveAttribute('multiple')

    await fireEvent.click(screen.getByRole('button', { name: 'Lọc thêm' }))

    expect(screen.getByLabelText('Nghiệp vụ')).toBeInTheDocument()
    expect(screen.getByLabelText('Loại task')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Lọc' }).length).toBeGreaterThan(0)
  })

  it('keeps Marketplace composition compact and task-oriented with distinct wording', async () => {
    const { container } = render(MarketplaceFilters, { props: { filters, availableSkills } })

    const compactGrid = container.querySelector('div.grid.items-end')
    expect(compactGrid).toBeInTheDocument()
    expect(compactGrid?.className).toContain('lg:grid-cols-')
    expect(screen.getByText('Nhóm kỹ năng')).toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: 'Lọc thêm' }))

    expect(screen.getByLabelText('Nhận đề xuất')).toBeInTheDocument()
    expect(screen.queryByTestId('talent-search-keyword')).not.toBeInTheDocument()
  })
})
