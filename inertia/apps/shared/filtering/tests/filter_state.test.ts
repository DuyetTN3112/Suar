import { afterEach, describe, expect, it, vi } from 'vitest'

import type {
  FilterCriteria,
  FilterExecute,
  FilterExecutionResult,
  FilterNavigationAdapter,
  FilterPresentationState,
  FilterUrlState,
} from '../contracts'
import { createFilterState } from '../filter_state.svelte'

const baseCriteria: FilterCriteria = {
  context: 'marketplace.tasks',
  schemaVersion: 1,
  filter: {
    kind: 'condition',
    field: 'status',
    operator: 'in',
    effect: 'require',
    unknown: 'exclude',
    value: { kind: 'set', values: ['open'] },
  },
  sort: [{ field: 'relevance', direction: 'desc' }],
  page: { size: 20, cursor: 'cursor-2' },
}

function changedCriteria(field = 'skills'): FilterCriteria {
  return {
    ...baseCriteria,
    filter: {
      kind: 'condition',
      field,
      operator: 'contains_any',
      effect: 'require',
      unknown: 'exclude',
      value: { kind: 'set', values: ['typescript'] },
    },
  }
}

class MemoryNavigation implements FilterNavigationAdapter {
  writes: Array<{ state: FilterUrlState; mode: 'push' | 'replace' }> = []

  write(state: FilterUrlState, mode: 'push' | 'replace'): void {
    this.writes.push({ state: structuredClone(state), mode })
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('filter criteria state', () => {
  it('keeps staged drafts out of committed results/URL until Apply and restores on Cancel', async () => {
    const navigation = new MemoryNavigation()
    const execute = vi.fn<FilterExecute<string>>((_criteria, context) =>
      Promise.resolve({ data: 'ok', requestId: context.requestId })
    )
    const state = createFilterState({
      initial: { criteria: baseCriteria, presentation: { view: 'grid' } },
      interaction: { kind: 'staged' },
      navigation,
      execute,
    })

    state.updateDraft(changedCriteria())
    expect(state.draftCriteria.filter).toMatchObject({ field: 'skills' })
    expect(state.committedCriteria.filter).toMatchObject({ field: 'status' })
    expect(navigation.writes).toHaveLength(0)
    expect(execute).not.toHaveBeenCalled()

    state.cancelDraft()
    expect(state.draftCriteria).toEqual(state.committedCriteria)

    state.updateDraft(changedCriteria())
    await state.applyDraft()
    expect(state.committedCriteria.filter).toMatchObject({ field: 'skills' })
    expect(state.committedCriteria.page).toEqual({ size: 20 })
    expect(navigation.writes).toHaveLength(1)
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it('supports instant/debounced commit and only accepts the newest response', async () => {
    vi.useFakeTimers()
    const resolvers: Array<(value: FilterExecutionResult<string>) => void> = []
    const execute = vi.fn<FilterExecute<string>>(
      (_criteria, _context) =>
        new Promise<FilterExecutionResult<string>>((resolve) => {
          resolvers.push(resolve)
        })
    )
    const state = createFilterState({
      initial: { criteria: baseCriteria, presentation: { view: 'list' } },
      interaction: { kind: 'debounced', delayMs: 50 },
      execute,
      requestIdPrefix: 'filter-request',
    })

    state.updateDraft(changedCriteria('skills'))
    await vi.advanceTimersByTimeAsync(49)
    expect(execute).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(execute).toHaveBeenCalledTimes(1)

    state.updateDraft(changedCriteria('labels'))
    await vi.advanceTimersByTimeAsync(50)
    expect(execute).toHaveBeenCalledTimes(2)
    const firstRequest = execute.mock.calls[0]
    expect(firstRequest).toBeDefined()
    if (firstRequest !== undefined) expect(firstRequest[1].signal.aborted).toBe(true)

    resolvers[1]?.({
      data: 'newest',
      requestId: 'filter-request-2',
      canonicalCriteria: changedCriteria('canonical-labels'),
    })
    await Promise.resolve()
    resolvers[0]?.({
      data: 'stale',
      requestId: 'filter-request-1',
      canonicalCriteria: changedCriteria('stale'),
    })
    await Promise.resolve()

    expect(state.latestResponse).toBe('newest')
    expect(state.committedCriteria.filter).toMatchObject({ field: 'canonical-labels' })
    expect(state.lastAppliedRequestId).toBe('filter-request-2')
  })

  it('rehydrates Back/Forward safely, discards dirty draft, and works without window during SSR', async () => {
    const state = createFilterState({
      initial: { criteria: baseCriteria, presentation: { view: 'grid', density: 'compact' } },
      interaction: { kind: 'staged' },
    })
    state.updateDraft(changedCriteria())

    const result = await state.rehydrate({
      criteria: changedCriteria('from-history'),
      presentation: { view: 'list', density: 'comfortable' },
    })

    expect(result.discardedDirtyDraft).toBe(true)
    expect(state.committedCriteria.filter).toMatchObject({ field: 'from-history' })
    expect(state.draftCriteria).toEqual(state.committedCriteria)
    expect(state.presentation).toEqual({ view: 'list', density: 'comfortable' })
  })

  it('commits instant changes immediately and retains committed state when execution fails', async () => {
    const navigation = new MemoryNavigation()
    const execute = vi.fn<FilterExecute<string>>(() =>
      Promise.reject(new Error('secret cursor and raw DSL must never escape'))
    )
    const state = createFilterState({
      initial: { criteria: baseCriteria, presentation: { view: 'grid' } },
      interaction: { kind: 'instant' },
      navigation,
      execute,
    })

    state.updateDraft(changedCriteria('instant'))
    await vi.waitFor(() => expect(state.isLoading).toBe(false))

    expect(state.committedCriteria.filter).toMatchObject({ field: 'instant' })
    expect(state.draftCriteria).toEqual(state.committedCriteria)
    expect(navigation.writes).toHaveLength(1)
    expect(state.diagnostics[0]?.code).toBe('FILTER_EXECUTION_FAILED')
    expect(state.diagnostics[0]?.message).toBe('Filter execution failed.')
  })

  it('deduplicates double Apply for the same canonical draft', async () => {
    const navigation = new MemoryNavigation()
    let resolveRequest: (value: FilterExecutionResult<string>) => void = () => undefined
    let pendingRequestId = ''
    const execute = vi.fn<FilterExecute<string>>(
      (_criteria, context) =>
        new Promise<FilterExecutionResult<string>>((resolve) => {
          pendingRequestId = context.requestId
          resolveRequest = resolve
        })
    )
    const state = createFilterState({
      initial: { criteria: baseCriteria, presentation: { view: 'grid' } },
      interaction: { kind: 'staged' },
      navigation,
      execute,
    })
    state.updateDraft(changedCriteria('double-apply'))

    const first = state.applyDraft()
    const second = state.applyDraft()

    expect(execute).toHaveBeenCalledTimes(1)
    expect(navigation.writes).toHaveLength(1)
    resolveRequest({ data: 'ok', requestId: pendingRequestId })
    await Promise.all([first, second])
    expect(state.latestResponse).toBe('ok')
  })

  it('clears results bound to old criteria and applies malformed canonical responses atomically', async () => {
    let call = 0
    const execute = vi.fn<FilterExecute<string>>((criteria, context) => {
      call += 1
      if (call === 1) {
        return Promise.resolve({ data: 'old-context-result', requestId: context.requestId })
      }
      if (call === 2) return Promise.reject(new Error('secret backend detail'))
      if (call === 3) {
        return Promise.resolve({
          data: 'must-not-apply',
          requestId: context.requestId,
          canonicalCriteria: { ...criteria, context: 'another.context' },
        })
      }
      const malformedResult: FilterExecutionResult<string> = {
        data: 'must-not-apply-missing-data-envelope',
        requestId: context.requestId,
        canonicalCriteria: criteria,
      }
      Reflect.deleteProperty(malformedResult, 'data')
      return Promise.resolve(malformedResult)
    })
    const state = createFilterState({
      initial: { criteria: baseCriteria, presentation: { view: 'grid' } },
      interaction: { kind: 'staged' },
      execute,
    })

    await state.applyDraft()
    expect(state.latestResponse).toBe('old-context-result')

    state.updateDraft(changedCriteria('new-context-filter'))
    const failed = state.applyDraft()
    expect(state.latestResponse).toBeUndefined()
    expect(state.lastAppliedRequestId).toBeNull()
    await failed
    expect(state.latestResponse).toBeUndefined()
    expect(state.diagnostics[0]?.message).toBe('Filter execution failed.')

    state.updateDraft(changedCriteria('malformed-response'))
    await state.applyDraft()
    expect(state.latestResponse).toBeUndefined()
    expect(state.lastAppliedRequestId).toBeNull()
    expect(state.diagnostics[0]?.code).toBe('FILTER_EXECUTION_FAILED')

    state.updateDraft(changedCriteria('missing-data-envelope'))
    await state.applyDraft()
    expect(state.latestResponse).toBeUndefined()
    expect(state.lastAppliedRequestId).toBeNull()
    expect(state.diagnostics[0]?.code).toBe('FILTER_EXECUTION_FAILED')
  })

  it('clears strict filters without clearing sort/view and preserves a newer draft on server canonicalization', async () => {
    let resolveRequest: (value: FilterExecutionResult<string>) => void = () => undefined
    let pendingRequestId = ''
    const state = createFilterState({
      initial: { criteria: baseCriteria, presentation: { view: 'grid', density: 'compact' } },
      interaction: { kind: 'staged' },
      execute: (_criteria, context) =>
        new Promise<FilterExecutionResult<string>>((resolve) => {
          pendingRequestId = context.requestId
          resolveRequest = resolve
        }),
    })

    state.clearStrictFilter()
    expect(state.draftCriteria.filter).toBeUndefined()
    expect(state.draftCriteria.sort).toEqual(baseCriteria.sort)
    expect(state.presentation).toEqual({ view: 'grid', density: 'compact' })

    state.updateDraft(changedCriteria('applied'))
    const applying = state.applyDraft()
    state.updateDraft(changedCriteria('new-dirty-draft'))
    resolveRequest({
      data: 'ok',
      requestId: pendingRequestId,
      canonicalCriteria: changedCriteria('server-canonical'),
    })
    await applying

    expect(state.committedCriteria.filter).toMatchObject({ field: 'server-canonical' })
    expect(state.draftCriteria.filter).toMatchObject({ field: 'new-dirty-draft' })
  })

  it('rejects malformed initial, draft, history, and presentation state before any mutation', async () => {
    const invalidCriteria = {
      ...baseCriteria,
      context: '',
      page: { size: 0, offset: -1 },
      sort: [{ field: 'relevance', direction: 'sideways' }],
    } as unknown as FilterCriteria

    expect(() =>
      createFilterState({
        initial: { criteria: invalidCriteria, presentation: {} },
        interaction: { kind: 'staged' },
      })
    ).toThrow(TypeError)

    const execute = vi.fn<FilterExecute<string>>((_criteria, context) =>
      Promise.resolve({ data: 'ok', requestId: context.requestId })
    )
    const state = createFilterState({
      initial: { criteria: baseCriteria, presentation: { view: 'grid' } },
      interaction: { kind: 'staged' },
      execute,
    })
    const before = structuredClone({
      committed: state.committedCriteria,
      draft: state.draftCriteria,
      presentation: state.presentation,
    })

    expect(() => state.updateDraft(invalidCriteria)).toThrow(TypeError)
    expect(state.committedCriteria).toEqual(before.committed)
    expect(state.draftCriteria).toEqual(before.draft)
    expect(execute).not.toHaveBeenCalled()

    await expect(
      state.rehydrate({ criteria: invalidCriteria, presentation: { view: 'history' } })
    ).rejects.toThrow(TypeError)
    expect(state.committedCriteria).toEqual(before.committed)
    expect(state.draftCriteria).toEqual(before.draft)
    expect(state.presentation).toEqual(before.presentation)
    expect(execute).not.toHaveBeenCalled()

    const invalidPresentation = { view: () => 'private-state' } as unknown as FilterPresentationState
    expect(() => state.setPresentation(invalidPresentation)).toThrow(TypeError)
    expect(state.presentation).toEqual(before.presentation)
  })

  it('keeps controller state atomic when push, replace, or presentation navigation fails', async () => {
    const execute = vi.fn<FilterExecute<string>>((criteria, context) =>
      Promise.resolve({
        data: 'server-result',
        requestId: context.requestId,
        canonicalCriteria: changedCriteria(`canonical-${String(criteria.filter?.kind)}`),
      })
    )
    const pushFailure: FilterNavigationAdapter = {
      write: () => {
        throw new Error('router push failed with private URL')
      },
    }
    const pushState = createFilterState({
      initial: { criteria: baseCriteria, presentation: { view: 'grid' } },
      interaction: { kind: 'staged' },
      navigation: pushFailure,
      execute,
    })
    pushState.updateDraft(changedCriteria('push-failure'))
    expect(() => pushState.applyDraft()).toThrow()
    expect(pushState.committedCriteria).toEqual(baseCriteria)
    expect(pushState.draftCriteria.filter).toMatchObject({ field: 'push-failure' })
    expect(execute).not.toHaveBeenCalled()

    const presentationBefore = structuredClone(pushState.presentation)
    expect(() => pushState.setPresentation({ view: 'list' })).toThrow()
    expect(pushState.presentation).toEqual(presentationBefore)

    const replaceNavigation: FilterNavigationAdapter = {
      write: (_state, mode) => {
        if (mode === 'replace') throw new Error('router replace failed with private URL')
      },
    }
    const replaceState = createFilterState({
      initial: { criteria: baseCriteria, presentation: { view: 'grid' } },
      interaction: { kind: 'staged' },
      navigation: replaceNavigation,
      execute,
    })
    replaceState.updateDraft(changedCriteria('replace-failure'))
    await replaceState.applyDraft()
    expect(replaceState.committedCriteria.filter).toMatchObject({ field: 'replace-failure' })
    expect(replaceState.latestResponse).toBeUndefined()
    expect(replaceState.lastAppliedRequestId).toBeNull()
    expect(replaceState.diagnostics[0]?.code).toBe('FILTER_EXECUTION_FAILED')
  })

  it('rejects a response routed under the wrong request ID', async () => {
    const state = createFilterState({
      initial: { criteria: baseCriteria, presentation: {} },
      interaction: { kind: 'staged' },
      requestIdPrefix: 'expected',
      execute: () => Promise.resolve({ data: 'wrong-response', requestId: 'another-request-1' }),
    })

    await state.applyDraft()

    expect(state.latestResponse).toBeUndefined()
    expect(state.lastAppliedRequestId).toBeNull()
    expect(state.diagnostics[0]?.code).toBe('FILTER_EXECUTION_FAILED')
  })

  it('makes dispose terminal, cancels late work, and clears retained response state', async () => {
    let resolveLate: (value: FilterExecutionResult<string>) => void = () => undefined
    let lateRequestId = ''
    const state = createFilterState({
      initial: { criteria: baseCriteria, presentation: { view: 'grid' } },
      interaction: { kind: 'staged' },
      execute: (_criteria, context) =>
        new Promise<FilterExecutionResult<string>>((resolve) => {
          lateRequestId = context.requestId
          resolveLate = resolve
        }),
    })

    const applying = state.applyDraft()
    state.dispose()
    resolveLate({ data: 'sensitive-result', requestId: lateRequestId })
    await applying

    expect(state.latestResponse).toBeUndefined()
    expect(state.lastAppliedRequestId).toBeNull()
    expect(state.diagnostics).toEqual([])
    expect(state.isLoading).toBe(false)
    expect(() => state.updateDraft(changedCriteria())).toThrow(TypeError)
    expect(() => state.cancelDraft()).toThrow(TypeError)
    expect(() => state.clearStrictFilter()).toThrow(TypeError)
    expect(() => state.applyDraft()).toThrow(TypeError)
    expect(() => state.setPresentation({ view: 'list' })).toThrow(TypeError)
    await expect(
      state.rehydrate({ criteria: baseCriteria, presentation: { view: 'list' } })
    ).rejects.toThrow(TypeError)
  })

  it('fails closed for cyclic or accessor-backed runtime objects without leaking thrown details', () => {
    const state = createFilterState({
      initial: { criteria: baseCriteria, presentation: {} },
      interaction: { kind: 'staged' },
    })
    const cyclic = structuredClone(baseCriteria) as FilterCriteria & { self?: unknown }
    cyclic.self = cyclic
    expect(() => state.updateDraft(cyclic)).toThrow('Invalid filter criteria')

    const presentationWithThrowingGetter = Object.defineProperty({}, 'privateValue', {
      enumerable: true,
      get: () => {
        throw new Error('cross-tenant-secret')
      },
    }) as FilterPresentationState
    expect(() => state.setPresentation(presentationWithThrowingGetter)).toThrow(
      'Invalid filter presentation state'
    )

    state.draftCriteria = cyclic
    expect(() => state.hasDirtyDraft).toThrow('Invalid filter criteria')
  })
})
