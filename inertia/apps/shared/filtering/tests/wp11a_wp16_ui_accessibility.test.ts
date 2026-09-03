import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import SearchCenter from '../../search/search_center.svelte'
import type { SearchDiscoveryPage } from '../../search/types'
import FacetValueCombobox from '../components/facet_value_combobox.svelte'
import FilterDrawer from '../components/filter_drawer.svelte'
import FilterSummary from '../components/filter_summary.svelte'

const { visitMock } = vi.hoisted(() => ({
  visitMock: vi.fn(),
}))

vi.mock('@inertiajs/svelte', () => ({
  router: { visit: visitMock },
}))

afterEach(() => {
  cleanup()
  visitMock.mockReset()
  document.querySelectorAll('[data-test-wp11a-opener]').forEach((node) => node.remove())
})

function facetValues() {
  return [
    { id: 'alpha', label: 'Alpha', count: 3, countRelation: 'exact' as const, selected: false },
    { id: 'bravo', label: 'Bravo', count: 2, countRelation: 'exact' as const, selected: false },
    { id: 'charlie', label: 'Charlie', count: 1, countRelation: 'exact' as const, selected: false },
  ]
}

function discoveryWithNextCursor(): SearchDiscoveryPage {
  return {
    hits: [
      {
        id: 'task:cursor-1',
        entityType: 'task',
        entityId: 'cursor-1',
        rank: 1,
        presentation: {
          title: 'Cursor result',
          url: '/tasks/cursor-1',
          sourceLabel: 'Task title',
          snippets: ['Cursor result'],
          breadcrumbs: [],
          primaryActionLabel: 'Open task',
        },
      },
    ],
    total: { value: 2, relation: 'eq' },
    page: { nextCursor: 'opaque-next-cursor' },
    authority: {
      hits: { state: 'authoritative', sources: ['tasks'] },
      total: { state: 'authoritative', sources: ['tasks'] },
      facets: [],
    },
    sources: [],
    diagnostics: [],
    requestId: 'wp11a-wp16-cursor',
  }
}

describe('WP-11A shared keyboard and semantic contract', () => {
  it('moves the active option with Arrow/Home/End, selects with Enter, and closes with Escape', async () => {
    const onSelectionChange = vi.fn()
    render(FacetValueCombobox, {
      props: {
        id: 'wp11a-skills',
        label: 'Skills',
        values: facetValues(),
        selectedIds: [],
        onSelectionChange,
      },
    })

    const combobox = screen.getByRole('combobox', { name: 'Skills' })
    await fireEvent.focus(combobox)
    await fireEvent.keyDown(combobox, { key: 'ArrowDown' })
    expect(combobox).toHaveAttribute('aria-expanded', 'true')
    expect(combobox).toHaveAttribute('aria-activedescendant', 'wp11a-skills-option-0')

    await fireEvent.keyDown(combobox, { key: 'End' })
    expect(combobox).toHaveAttribute('aria-activedescendant', 'wp11a-skills-option-2')
    await fireEvent.keyDown(combobox, { key: 'Home' })
    expect(combobox).toHaveAttribute('aria-activedescendant', 'wp11a-skills-option-0')
    await fireEvent.keyDown(combobox, { key: 'Enter' })
    expect(onSelectionChange).toHaveBeenCalledWith(['alpha'])

    await fireEvent.keyDown(combobox, { key: 'Escape' })
    expect(combobox).toHaveAttribute('aria-expanded', 'false')
    expect(combobox).not.toHaveAttribute('aria-activedescendant')
  })

  it('keeps the combobox and listbox relationship addressable while an option is active', async () => {
    render(FacetValueCombobox, {
      props: {
        id: 'wp11a-relational',
        label: 'Required skills',
        values: facetValues(),
        selectedIds: [],
        onSelectionChange: vi.fn(),
      },
    })

    const combobox = screen.getByRole('combobox', { name: 'Required skills' })
    await fireEvent.keyDown(combobox, { key: 'ArrowDown' })
    const listbox = screen.getByRole('listbox', { name: 'Required skills available values' })
    expect(combobox).toHaveAttribute('aria-controls', listbox.id)
    expect(document.getElementById(combobox.getAttribute('aria-activedescendant') ?? '')).toBe(
      screen.getByRole('option', { name: /Alpha, 3 results, exact/ })
    )
  })

  it('restores focus after Escape and after an asynchronous Apply', async () => {
    const opener = document.createElement('button')
    opener.type = 'button'
    opener.dataset.testWp11aOpener = 'true'
    opener.textContent = 'Open filters'
    document.body.append(opener)
    opener.focus()

    const onApply = vi.fn().mockResolvedValue(undefined)
    const { rerender } = render(FilterDrawer, {
      props: {
        open: true,
        title: 'Filters',
        dirty: true,
        onCancel: vi.fn(),
        onApply,
      },
    })

    const dialog = screen.getByRole('dialog', { name: 'Filters' })
    await waitFor(() =>
      expect(dialog.querySelector('[data-filter-drawer-initial-focus]')).toHaveFocus()
    )
    await fireEvent.keyDown(dialog, { key: 'Escape' })
    await waitFor(() => expect(opener).toHaveFocus())

    await rerender({
      open: true,
      title: 'Filters',
      dirty: true,
      onCancel: vi.fn(),
      onApply,
    })
    await fireEvent.click(screen.getByRole('button', { name: 'Apply filter changes' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(opener).toHaveFocus())
  })

  it('announces loading-to-partial-to-error transitions through one polite live region', async () => {
    const { rerender } = render(FilterSummary, {
      props: {
        total: { value: null, relation: 'unknown' },
        executionState: 'loading',
        activeFilterCount: 0,
      },
    })

    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    await waitFor(() => expect(status).toHaveTextContent('Updating results'))

    await rerender({
      total: { value: null, relation: 'unknown' },
      executionState: 'partial',
      activeFilterCount: 0,
    })
    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(screen.getByRole('status')).toHaveTextContent('Some result sources are incomplete')

    await rerender({
      total: { value: null, relation: 'unknown' },
      executionState: 'error',
      activeFilterCount: 0,
    })
    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(screen.getByRole('status')).toHaveTextContent('Results could not be updated')
  })
})

describe('WP-16-UI-A Search Center keyboard and state contract', () => {
  it('exposes filter state as pressed controls and activates a filter through keyboard-compatible semantics', async () => {
    render(SearchCenter, {
      props: {
        query: 'checkout',
        activeType: 'all',
        results: [],
        totalByType: {
          all: 0,
          task: 0,
          project: 0,
          comment: 0,
          talent: 0,
          skill: 0,
          organization: 0,
        },
        fieldFacets: [{ label: 'Task title', entityType: 'task', count: 0 }],
      },
    })

    const filters = screen.getByLabelText('Search result filters')
    const all = screen.getByRole('button', { name: /^All 0$/ })
    const tasks = screen.getByRole('button', { name: /^Tasks 0$/ })
    expect(all).toHaveAttribute('aria-pressed', 'true')
    expect(tasks).toHaveAttribute('aria-pressed', 'false')
    expect(all).toHaveAttribute('type', 'button')
    expect(tasks).toHaveAttribute('type', 'button')
    expect(filters).toContainElement(tasks)

    await fireEvent.click(tasks)
    expect(visitMock).toHaveBeenCalledWith('/search?q=checkout&type=task', {
      preserveScroll: true,
      preserveState: true,
    })
  })

  it('keeps the opaque cursor on the next-page action and exposes a keyboard-operable button', async () => {
    render(SearchCenter, {
      props: {
        query: 'checkout',
        activeType: 'task',
        discovery: discoveryWithNextCursor(),
        results: [],
        totalByType: {
          all: 2,
          task: 2,
          project: 0,
          comment: 0,
          talent: 0,
          skill: 0,
          organization: 0,
        },
      },
    })

    const next = screen.getByRole('button', { name: 'Next page' })
    expect(next).toHaveAttribute('type', 'button')
    await fireEvent.click(next)
    expect(visitMock).toHaveBeenCalledWith(
      '/search?q=checkout&type=task&cursor=opaque-next-cursor',
      { preserveScroll: true, preserveState: false }
    )
  })

  it('announces no-result state as a polite status instead of leaving it only as visual copy', () => {
    render(SearchCenter, {
      props: {
        query: 'missing',
        results: [],
        totalByType: {
          all: 0,
          task: 0,
          project: 0,
          comment: 0,
          talent: 0,
          skill: 0,
          organization: 0,
        },
        sourceStatuses: [{ source: 'tasks', status: 'ok', resultCount: 0, errorMessage: null }],
      },
    })

    const status = screen.getByRole('status', { name: 'Search result status' })
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveTextContent('No results for "missing".')
  })
})
