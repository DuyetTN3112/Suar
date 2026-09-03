import { describe, expect, it } from 'vitest'

import type { FilterExpression, FilterPreference } from '../../contracts'
import {
  addExpressionChild,
  createExpressionBuilderState,
  moveExpressionChild,
  removeExpressionAt,
  redoExpressionBuilder,
  undoExpressionBuilder,
  validateExpressionBuilderState,
} from '../../expression_builder/expression_builder_model'

const condition = (field: string, value: string): FilterExpression => ({
  kind: 'condition',
  field,
  operator: 'eq',
  effect: 'require',
  unknown: 'exclude',
  value: { kind: 'scalar', value },
})

describe('expression builder model', () => {
  it('preserves nested Boolean structure and canonicalizes only on explicit output', () => {
    const expression: FilterExpression = {
      kind: 'group',
      combinator: 'and',
      negated: true,
      children: [
        condition('task.status', 'open'),
        {
          kind: 'group',
          combinator: 'or',
          children: [condition('task.priority', 'high'), condition('task.type', 'bug')],
        },
      ],
    }
    const state = createExpressionBuilderState(expression)

    expect(state.expression).toEqual(expression)
    expect(validateExpressionBuilderState(state, { maxDepth: 4, maxConditions: 5 })).toEqual([])
  })

  it('rejects empty/one-child groups and reports bounded depth/condition diagnostics', () => {
    const state = createExpressionBuilderState({ kind: 'group', combinator: 'and', children: [] })
    const diagnostics = validateExpressionBuilderState(state, { maxDepth: 1, maxConditions: 1 })
    const oneChildDiagnostics = validateExpressionBuilderState(
      createExpressionBuilderState({
        kind: 'group',
        combinator: 'and',
        children: [condition('task.status', 'open')],
      }),
      { maxDepth: 1, maxConditions: 1 }
    )

    expect(diagnostics.map(({ code }) => code)).toContain('EMPTY_GROUP')
    expect(oneChildDiagnostics.map(({ code }) => code)).toContain('GROUP_CHILDREN_LIMIT')
  })

  it('keeps preferences outside eligibility and preserves them through history', () => {
    const preference: FilterPreference = { effect: 'prefer', expression: condition('task.role', 'backend'), weight: 2 }
    let state = createExpressionBuilderState(condition('task.status', 'open'), [preference])
    state = addExpressionChild(state, [], condition('task.priority', 'high'))
    state = removeExpressionAt(state, [0])
    state = undoExpressionBuilder(state)
    state = redoExpressionBuilder(state)

    expect(state.preferences).toEqual([preference])
    expect(state.expression.kind).toBe('group')
  })

  it('supports keyboard-equivalent add, move, indent/outdent operations without flattening', () => {
    let state = createExpressionBuilderState(condition('task.status', 'open'))
    state = addExpressionChild(state, [], condition('task.priority', 'high'))
    state = moveExpressionChild(state, [1], 'up')
    state = moveExpressionChild(state, [0], 'indent')
    state = moveExpressionChild(state, [0, 0], 'outdent')

    expect(validateExpressionBuilderState(state, { maxDepth: 5, maxConditions: 10 })).toEqual([])
    expect(state.expression.kind).toBe('group')
  })
})
