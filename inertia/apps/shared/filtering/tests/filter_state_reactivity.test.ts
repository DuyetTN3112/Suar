import { cleanup, render, screen, waitFor } from '@testing-library/svelte'
import { afterEach, describe, expect, it } from 'vitest'

import type { FilterCriteria, FilterExecutionResult } from '../contracts'
import { createFilterState } from '../filter_state.svelte'

import FilterStateReactivityProbe from './filter_state_reactivity_probe.svelte'

const initialCriteria: FilterCriteria = {
  context: 'marketplace.tasks',
  schemaVersion: 1,
  filter: {
    kind: 'condition',
    field: 'status',
    operator: 'eq',
    effect: 'require',
    unknown: 'exclude',
    value: { kind: 'scalar', value: 'open' },
  },
  sort: [{ field: 'relevance', direction: 'desc' }],
  page: { size: 20 },
}

function criteriaFor(field: string): FilterCriteria {
  return {
    ...initialCriteria,
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

afterEach(cleanup)

describe('FilterStateController Svelte reactivity', () => {
  it('rerenders draft, loading, response, and diagnostic state in a real component', async () => {
    let requestId = ''
    let resolveRequest: (result: FilterExecutionResult<string>) => void = () => undefined
    let rejectRequest: (reason: unknown) => void = () => undefined
    const state = createFilterState({
      initial: { criteria: initialCriteria, presentation: {} },
      interaction: { kind: 'staged' },
      execute: (_criteria, context) => {
        requestId = context.requestId
        return new Promise<FilterExecutionResult<string>>((resolve, reject) => {
          resolveRequest = resolve
          rejectRequest = reject
        })
      },
    })

    render(FilterStateReactivityProbe, { props: { state } })
    expect(screen.getByTestId('draft-field')).toHaveTextContent('status')
    expect(screen.getByTestId('dirty-state')).toHaveTextContent('clean')

    state.updateDraft(criteriaFor('skills'))
    await waitFor(() => {
      expect(screen.getByTestId('draft-field')).toHaveTextContent('skills')
      expect(screen.getByTestId('dirty-state')).toHaveTextContent('dirty')
    })

    const successfulApply = state.applyDraft()
    await waitFor(() => expect(screen.getByTestId('loading-state')).toHaveTextContent('loading'))
    resolveRequest({ data: 'authorized-results', requestId })
    await successfulApply
    await waitFor(() => {
      expect(screen.getByTestId('dirty-state')).toHaveTextContent('clean')
      expect(screen.getByTestId('loading-state')).toHaveTextContent('idle')
      expect(screen.getByTestId('latest-response')).toHaveTextContent('authorized-results')
    })

    state.updateDraft(criteriaFor('labels'))
    const failedApply = state.applyDraft()
    rejectRequest(new Error('private provider detail'))
    await failedApply
    await waitFor(() => {
      expect(screen.getByTestId('latest-response')).toHaveTextContent('none')
      expect(screen.getByTestId('diagnostic-code')).toHaveTextContent('FILTER_EXECUTION_FAILED')
    })
  })
})
