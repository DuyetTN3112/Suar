import { describe, expect, it, vi } from 'vitest'

import type { FilterCriteria, FilterExecute, FilterNavigationAdapter, FilterUrlState } from '../contracts'
import { canonicalizeFilterCriteria } from '../criteria_codec'
import { createFilterState } from '../filter_state.svelte'
import { decodeFilterUrlState, encodeFilterUrlState } from '../filter_url_codec'

const exposurePolicy = {
  canExposeContext: () => true,
  canExposeFieldReference: () => true,
  canExposeCondition: () => true,
  canExposeText: () => true,
  canExposeCursor: () => true,
  canExposePresentationEntry: () => true,
}

const initialCriteria: FilterCriteria = {
  context: 'marketplace.tasks',
  schemaVersion: 1,
  text: { value: 'distributed systems' },
  filter: {
    kind: 'group',
    combinator: 'and',
    children: [
      {
        kind: 'condition',
        field: 'status',
        operator: 'in',
        effect: 'require',
        unknown: 'exclude',
        value: { kind: 'set', values: ['open'] },
      },
      {
        kind: 'condition',
        field: 'skills',
        operator: 'contains_any',
        effect: 'require',
        unknown: 'exclude',
        value: { kind: 'set', values: ['typescript', 'svelte'] },
      },
    ],
  },
  sort: [{ field: 'relevance', direction: 'desc' }],
  projection: ['id', 'title'],
  page: { size: 25, cursor: 'cursor-page-7' },
}

function encode(state: FilterUrlState): string {
  const result = encodeFilterUrlState(state, { maxEncodedLength: 4_096, exposurePolicy })
  if (!result.ok) throw new Error(result.diagnostic.message)
  return result.value
}

function decode(value: string): FilterUrlState {
  const result = decodeFilterUrlState(value, {
    supportedSchemaVersions: [1],
    maxEncodedLength: 4_096,
    exposurePolicy,
  })
  if (result.status !== 'ready') throw new Error(result.diagnostics[0]?.message)
  return result.state
}

class MemoryNavigation implements FilterNavigationAdapter {
  writes: Array<{ state: FilterUrlState; mode: 'push' | 'replace' }> = []

  write(state: FilterUrlState, mode: 'push' | 'replace'): void {
    this.writes.push({ state: structuredClone(state), mode })
  }
}

describe('filter URL and history lifecycle', () => {
  it('restores equivalent state in a refresh/new-tab controller and resets only pagination cursor on Apply', async () => {
    const urlState: FilterUrlState = {
      criteria: initialCriteria,
      presentation: { view: 'list', density: 'comfortable', expandedFacetKeys: ['skills'] },
    }
    const refreshedState = decode(encode(urlState))
    const navigation = new MemoryNavigation()
    const execute = vi.fn<FilterExecute<string>>((_criteria, context) =>
      Promise.resolve({ data: 'results', requestId: context.requestId })
    )
    const state = createFilterState({
      initial: refreshedState,
      interaction: { kind: 'staged' },
      navigation,
      execute,
    })

    expect(state.committedCriteria).toEqual(refreshedState.criteria)
    expect(state.presentation).toEqual(refreshedState.presentation)

    state.updateDraft({
      ...state.draftCriteria,
      text: { value: 'distributed systems platform' },
    })
    await state.applyDraft()

    expect(navigation.writes).toHaveLength(1)
    expect(navigation.writes[0]?.mode).toBe('push')
    expect(state.committedCriteria.filter).toEqual(canonicalizeFilterCriteria(initialCriteria).filter)
    expect(state.committedCriteria.page).toEqual({ size: 25 })
    expect(state.committedCriteria.sort).toEqual(initialCriteria.sort)
    expect(state.presentation).toEqual(urlState.presentation)
    const writtenState = navigation.writes[0]?.state
    expect(writtenState).toBeDefined()
    if (writtenState === undefined) return
    expect(decode(encode(writtenState)).criteria).toEqual(state.committedCriteria)
  })

  it('rehydrates sequential Back/Forward entries and discards a dirty staged draft without losing nested criteria', async () => {
    const execute = vi.fn<FilterExecute<string>>((_criteria, context) =>
      Promise.resolve({ data: 'history-result', requestId: context.requestId })
    )
    const state = createFilterState({
      initial: {
        criteria: initialCriteria,
        presentation: { view: 'list' },
      },
      interaction: { kind: 'staged' },
      execute,
    })
    const backEntry: FilterUrlState = {
      criteria: {
        ...initialCriteria,
        text: { value: 'back entry' },
        page: { size: 25, cursor: 'cursor-back' },
      },
      presentation: { view: 'grid', density: 'compact' },
    }
    const forwardEntry: FilterUrlState = {
      criteria: {
        ...initialCriteria,
        text: { value: 'forward entry' },
        page: { size: 25, cursor: 'cursor-forward' },
      },
      presentation: { view: 'list', density: 'comfortable' },
    }

    state.updateDraft({ ...initialCriteria, text: { value: 'unapplied mobile draft' } })
    const backResult = await state.rehydrate(backEntry)
    expect(backResult.discardedDirtyDraft).toBe(true)
    expect(state.draftCriteria).toEqual(canonicalizeFilterCriteria(backEntry.criteria))
    expect(state.committedCriteria.filter).toEqual(canonicalizeFilterCriteria(initialCriteria).filter)
    expect(state.committedCriteria.text).toEqual({ value: 'back entry' })

    const forwardResult = await state.rehydrate(forwardEntry)
    expect(forwardResult.discardedDirtyDraft).toBe(false)
    expect(state.draftCriteria).toEqual(canonicalizeFilterCriteria(forwardEntry.criteria))
    expect(state.committedCriteria.filter).toEqual(canonicalizeFilterCriteria(initialCriteria).filter)
    expect(state.committedCriteria.text).toEqual({ value: 'forward entry' })
    expect(execute).toHaveBeenCalledTimes(2)
  })
})
