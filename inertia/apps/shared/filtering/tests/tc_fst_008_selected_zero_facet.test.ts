import { fireEvent, render, screen, within } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import type {
  FilterUiDraft,
  FilterUiFacetState,
  FilterUiFieldDefinition,
} from '../components/filter_ui_types'
import FilterWorkbench from '../components/filter_workbench.svelte'

const fields: FilterUiFieldDefinition[] = [
  {
    key: 'taxonomy.skills',
    label: 'Required skills',
    type: 'multi_value',
    operators: ['contains_any'],
    effects: ['require'],
    defaultUnknown: 'exclude',
  },
]

const facets: Readonly<Record<string, FilterUiFacetState>> = {
  'taxonomy.skills': {
    status: 'ready',
    values: [
      {
        id: 'skill-cobol-retired',
        label: 'Legacy COBOL',
        count: 0,
        countRelation: 'exact',
        selected: true,
        retired: true,
      },
      {
        id: 'skill-typescript',
        label: 'TypeScript',
        count: 28,
        countRelation: 'exact',
        selected: false,
      },
    ],
  },
}

const drafts: Readonly<Record<string, FilterUiDraft>> = {
  'taxonomy.skills': {
    operator: 'contains_any',
    effect: 'require',
    unknown: 'exclude',
    selectedIds: ['skill-cobol-retired'],
  },
}

describe('TC-FST-008 | selected-zero facet UI', () => {
  it('keeps an exact zero-count selection inspectable when another value is selected', async () => {
    const onDraftChange = vi.fn()

    const view = render(FilterWorkbench, {
      props: {
        title: 'Refine opportunities',
        fields,
        facets,
        drafts,
        activeFilters: [],
        total: { value: 0, relation: 'exact' },
        executionState: 'idle',
        interaction: 'instant',
        onDraftChange,
      },
    })

    const skillField = screen.getByTestId('filter-field-taxonomy.skills')
    const selectedZero = within(skillField).getByRole('option', {
      name: /Legacy COBOL, 0 results, exact, retired/i,
    })

    expect(selectedZero).toHaveAttribute('aria-selected', 'true')
    expect(selectedZero).toHaveAttribute('data-value-id', 'skill-cobol-retired')
    expect(within(skillField).getByText('1 selected')).toBeInTheDocument()

    const combobox = within(skillField).getByRole('combobox', {
      name: 'Search Required skills',
    })
    await fireEvent.keyDown(combobox, { key: 'ArrowDown' })
    await fireEvent.click(
      within(skillField).getByRole('option', { name: /TypeScript, 28 results, exact/i })
    )

    const updatedDraft = onDraftChange.mock.lastCall?.[1] as FilterUiDraft | undefined
    expect(updatedDraft).toEqual(
      expect.objectContaining({ selectedIds: ['skill-cobol-retired', 'skill-typescript'] })
    )
    if (!updatedDraft) throw new Error('Expected a draft update after selecting TypeScript')

    await view.rerender({
      title: 'Refine opportunities',
      fields,
      facets,
      drafts: { ...drafts, 'taxonomy.skills': updatedDraft },
      activeFilters: [],
      total: { value: 0, relation: 'exact' },
      executionState: 'idle',
      interaction: 'instant',
      onDraftChange,
    })

    expect(
      within(skillField).getByRole('option', {
        name: /Legacy COBOL, 0 results, exact, retired/i,
      })
    ).toHaveAttribute('aria-selected', 'true')
    expect(within(skillField).getByText('2 selected')).toBeInTheDocument()
  })
})
