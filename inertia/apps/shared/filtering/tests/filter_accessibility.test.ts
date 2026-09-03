import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import FacetValueCombobox from '../components/facet_value_combobox.svelte'
import FilterSummary from '../components/filter_summary.svelte'

function values(count = 10_000) {
  return Array.from({ length: count }, (_, index) => ({
    id: `skill-${index}`,
    label: `Skill ${index}`,
    count: index,
    countRelation: 'exact' as const,
    selected: index === 149,
  }))
}

describe('filter primitive accessibility', () => {
  it('supports combobox/listbox keyboard selection with bounded rendering and canonical identity', async () => {
    const change = vi.fn()
    render(FacetValueCombobox, {
      props: {
        id: 'skills-combobox',
        label: 'Find skills',
        values: values(),
        selectedIds: ['skill-149'],
        onSelectionChange: change,
      },
    })

    const combobox = screen.getByRole('combobox', { name: 'Find skills' })
    expect(combobox).toHaveAttribute('aria-expanded', 'false')
    await fireEvent.focus(combobox)
    await fireEvent.keyDown(combobox, { key: 'ArrowDown' })
    expect(combobox).toHaveAttribute('aria-expanded', 'true')
    const options = screen.getAllByRole('option')
    expect(options.length).toBeLessThanOrEqual(101)
    expect(
      screen.getByRole('option', { name: /Skill 149.*149 results, exact/i })
    ).toBeInTheDocument()
    expect(combobox).toHaveAttribute('aria-activedescendant')
    await fireEvent.keyDown(combobox, { key: 'Enter' })
    expect(change).toHaveBeenCalledWith(expect.arrayContaining(['skill-149', 'skill-0']))
    await fireEvent.keyDown(combobox, { key: 'Escape' })
    expect(combobox).toHaveAttribute('aria-expanded', 'false')
  })

  it('keeps selected values visible when remote facet search is unavailable', () => {
    render(FacetValueCombobox, {
      props: {
        id: 'offline-skills',
        label: 'Find skills',
        values: [
          {
            id: 'retired-skill',
            label: 'Retired skill',
            count: 0,
            countRelation: 'exact',
            selected: true,
            retired: true,
          },
        ],
        selectedIds: ['retired-skill'],
        searchUnavailable: true,
        onSelectionChange: vi.fn(),
      },
    })

    expect(
      screen.getByText('Facet search unavailable. Your selections are preserved.')
    ).toHaveAttribute('role', 'status')
    expect(
      screen.getByRole('option', { name: /Retired skill.*0 results, exact/i })
    ).toHaveAttribute('aria-selected', 'true')
  })

  it.each([
    ['loading', 'Updating results'],
    ['error', 'Results could not be updated'],
    ['degraded', 'Results are using a degraded source'],
    ['partial', 'Some result sources are incomplete'],
  ] as const)(
    'announces %s execution state in a polite live region',
    async (executionState, copy) => {
      render(FilterSummary, {
        props: {
          total: { value: null, relation: 'unknown' },
          executionState,
          activeFilterCount: 3,
          nestingSummary: 'Nested filter group, 7 conditions across 3 levels.',
        },
      })

      const status = screen.getByRole('status')
      await waitFor(() => expect(status).toHaveTextContent(copy))
      expect(status).toHaveAttribute('aria-live', 'polite')
      expect(screen.getByText('Nested filter group, 7 conditions across 3 levels.')).toHaveClass(
        'sr-only'
      )
    }
  )

  it('ships reduced-motion, RTL-safe, and shell-neutral source contracts', async () => {
    const files = [
      'filter_workbench.svelte',
      'filter_bar.svelte',
      'filter_drawer.svelte',
      'facet_group.svelte',
      'facet_value_combobox.svelte',
      'active_filter_chips.svelte',
      'filter_summary.svelte',
    ]
    const sources = await Promise.all(
      files.map((file) =>
        readFile(resolve(process.cwd(), 'inertia/apps/shared/filtering/components', file), 'utf8')
      )
    )
    const combined = sources.join('\n')
    expect(combined).toContain('prefers-reduced-motion')
    expect(combined).toMatch(/margin-inline|padding-inline|inset-inline|text-align:\s*start/u)
    expect(combined).not.toMatch(/@\/apps\/(user|org|admin)|\$lib|@shared/u)
  })
})
