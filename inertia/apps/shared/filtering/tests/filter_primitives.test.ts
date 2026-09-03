import { fireEvent, render, screen, within } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import ActiveFilterChips from '../components/active_filter_chips.svelte'
import FilterSummary from '../components/filter_summary.svelte'
import type {
  ActiveFilterChipModel,
  FilterUiDraft,
  FilterUiFacetState,
  FilterUiFieldDefinition,
} from '../components/filter_ui_types'
import FilterWorkbench from '../components/filter_workbench.svelte'

const fields: FilterUiFieldDefinition[] = [
  {
    key: 'task.title',
    label: 'Opportunity title',
    type: 'text',
    operators: ['contains', 'exact'],
    effects: ['require', 'exclude'],
    defaultUnknown: 'exclude',
  },
  {
    key: 'taxonomy.skills',
    label: 'Required skills',
    description: 'Choose canonical skills.',
    type: 'multi_value',
    operators: ['contains_any', 'contains_all', 'contains_none', 'contains_at_least'],
    effects: ['require', 'exclude'],
    defaultUnknown: 'exclude',
  },
  {
    key: 'task.impact',
    label: 'Expected impact',
    type: 'number',
    operators: ['between', 'gte'],
    effects: ['require', 'exclude'],
    defaultUnknown: 'exclude',
  },
  {
    key: 'task.dueAt',
    label: 'Due window',
    type: 'date_time',
    operators: ['between', 'before', 'after'],
    effects: ['require', 'exclude'],
    defaultUnknown: 'exclude',
  },
  {
    key: 'taxonomy.categories',
    label: 'Skill families',
    type: 'hierarchy',
    operators: ['within_subtree', 'is_any'],
    effects: ['require', 'exclude'],
    defaultUnknown: 'exclude',
    hierarchyOptions: [
      { id: 'engineering', label: 'Engineering', depth: 0 },
      { id: 'backend', label: 'Backend engineering', depth: 1 },
    ],
  },
  {
    key: 'task.role',
    label: 'Role metadata',
    type: 'missing',
    operators: ['missing', 'exists'],
    effects: ['require', 'exclude'],
    defaultUnknown: 'include',
  },
]

const facets: Readonly<Record<string, FilterUiFacetState>> = {
  'taxonomy.skills': {
    status: 'ready',
    values: [
      {
        id: 'skill-typescript',
        label: 'TypeScript',
        count: 28,
        countRelation: 'exact',
        selected: false,
      },
      {
        id: 'skill-cobol-retired',
        label: 'Legacy COBOL',
        count: 0,
        countRelation: 'exact',
        selected: true,
        retired: true,
      },
      {
        id: 'skill-rust',
        label: 'Rust',
        count: 100,
        countRelation: 'approximate',
        selected: false,
      },
      {
        id: 'skill-private-count',
        label: 'Restricted skill',
        count: null,
        countRelation: 'unknown',
        selected: false,
      },
    ],
  },
}

const drafts: Readonly<Record<string, FilterUiDraft>> = {
  'task.title': { operator: 'contains', effect: 'require', unknown: 'exclude', scalar: '' },
  'taxonomy.skills': {
    operator: 'contains_any',
    effect: 'require',
    unknown: 'exclude',
    selectedIds: ['skill-cobol-retired'],
  },
  'task.impact': {
    operator: 'between',
    effect: 'require',
    unknown: 'exclude',
    gte: '10',
    lte: '100',
  },
  'task.dueAt': {
    operator: 'between',
    effect: 'require',
    unknown: 'exclude',
    gte: '2026-08-01T09:00',
    lte: '2026-08-31T18:00',
  },
  'taxonomy.categories': {
    operator: 'within_subtree',
    effect: 'require',
    unknown: 'exclude',
    selectedIds: ['backend'],
    expansion: 'descendants',
  },
  'task.role': {
    operator: 'missing',
    effect: 'require',
    unknown: 'include',
    missing: true,
  },
}

describe('shared filter primitives', () => {
  it('renders every authorized field control in domain-provided order and emits canonical IDs', async () => {
    const onDraftChange = vi.fn()
    render(FilterWorkbench, {
      props: {
        title: 'Refine opportunities',
        fields,
        facets,
        drafts,
        activeFilters: [],
        total: { value: 28, relation: 'exact' },
        executionState: 'idle',
        interaction: 'instant',
        onDraftChange,
      },
    })

    expect(screen.getAllByTestId('filter-field').map((node) => node.dataset.fieldKey)).toEqual(
      fields.map(({ key }) => key)
    )
    for (const field of fields) {
      expect(screen.getByText(field.label)).toBeInTheDocument()
    }

    const skillField = screen.getByTestId('filter-field-taxonomy.skills')
    expect(within(skillField).getByText('Legacy COBOL')).toBeInTheDocument()
    expect(within(skillField).getByText('Retired')).toBeInTheDocument()
    expect(within(skillField).getByText('0 results, exact')).toBeInTheDocument()
    await fireEvent.keyDown(
      within(skillField).getByRole('combobox', { name: 'Search Required skills' }),
      { key: 'ArrowDown' }
    )
    expect(within(skillField).getByText('About 100 results')).toBeInTheDocument()
    expect(within(skillField).getByText('Count unavailable')).toBeInTheDocument()

    await fireEvent.click(
      within(skillField).getByRole('option', { name: /TypeScript.*28 results, exact/i })
    )
    expect(onDraftChange).toHaveBeenLastCalledWith(
      'taxonomy.skills',
      expect.objectContaining({ selectedIds: ['skill-cobol-retired', 'skill-typescript'] })
    )
  })

  it('summarizes strict set semantics and unknown policy without using labels as identity', async () => {
    const chips: ActiveFilterChipModel[] = [
      {
        id: 'chip-any',
        fieldKey: 'taxonomy.skills',
        fieldLabel: 'Skills',
        operator: 'contains_any',
        effect: 'require',
        unknown: 'exclude',
        values: [
          { id: 'skill-typescript', label: 'TypeScript' },
          { id: 'skill-rust', label: 'Rust' },
        ],
      },
      {
        id: 'chip-all',
        fieldKey: 'taxonomy.domains',
        fieldLabel: 'Domains',
        operator: 'contains_all',
        effect: 'require',
        unknown: 'include',
        values: [
          { id: 'fintech', label: 'Fintech' },
          { id: 'health', label: 'Health' },
        ],
      },
      {
        id: 'chip-none',
        fieldKey: 'taxonomy.tags',
        fieldLabel: 'Tags',
        operator: 'contains_none',
        effect: 'exclude',
        unknown: 'exclude',
        values: [{ id: 'legacy', label: 'Legacy' }],
      },
      {
        id: 'chip-threshold',
        fieldKey: 'taxonomy.types',
        fieldLabel: 'Task types',
        operator: 'contains_at_least',
        effect: 'require',
        unknown: 'exclude',
        minimumMatch: 2,
        values: [
          { id: 'build', label: 'Build' },
          { id: 'review', label: 'Review' },
          { id: 'teach', label: 'Teach' },
        ],
      },
    ]
    const remove = vi.fn()
    render(ActiveFilterChips, { props: { chips, onRemove: remove } })

    expect(screen.getByText(/Any of TypeScript, Rust/)).toBeInTheDocument()
    expect(screen.getByText(/All of Fintech, Health/)).toBeInTheDocument()
    expect(screen.getByText(/None of Legacy/)).toBeInTheDocument()
    expect(screen.getByText(/At least 2 of Build, Review, Teach/)).toBeInTheDocument()
    expect(screen.getByText(/include unspecified values/i)).toBeInTheDocument()

    const removeButton = screen.getByRole('button', { name: 'Remove Skills filter' })
    expect(removeButton.closest('[data-field-key]')).toHaveAttribute(
      'data-field-key',
      'taxonomy.skills'
    )
    expect(removeButton.closest('[data-value-ids]')).toHaveAttribute(
      'data-value-ids',
      'skill-typescript,skill-rust'
    )
    await fireEvent.click(removeButton)
    expect(remove).toHaveBeenCalledWith('chip-any')
  })

  it.each([
    [{ value: 42, relation: 'exact' } as const, '42 results'],
    [{ value: 1_000, relation: 'gte' } as const, 'At least 1,000 results'],
    [{ value: null, relation: 'unknown' } as const, 'Result count unavailable'],
  ])('distinguishes total truth %o', (total, expected) => {
    render(FilterSummary, {
      props: { total, executionState: 'idle', activeFilterCount: 2 },
    })
    expect(screen.getByText(expected)).toBeInTheDocument()
  })
})
