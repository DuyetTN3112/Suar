import { fireEvent, render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import type { FilterExpression } from '../../contracts'
import ExpressionBuilder from '../../expression_builder/expression_builder.svelte'

const fields = [
  { key: 'task.status', label: 'Status', operators: ['eq', 'neq'] },
  { key: 'task.priority', label: 'Priority', operators: ['eq'] },
]

const expression: FilterExpression = {
  kind: 'group',
  combinator: 'and',
  children: [
    {
      kind: 'condition',
      field: 'task.status',
      operator: 'eq',
      effect: 'require',
      unknown: 'exclude',
      value: { kind: 'scalar', value: 'open' },
    },
    {
      kind: 'condition',
      field: 'task.priority',
      operator: 'eq',
      effect: 'require',
      unknown: 'exclude',
      value: { kind: 'scalar', value: 'high' },
    },
  ],
}

describe('ExpressionBuilder', () => {
  it('rehydrates the visible tree when the parent supplies a new canonical expression', async () => {
    const onExpressionChange = vi.fn()
    const view = render(ExpressionBuilder, { props: { expression, fields, onExpressionChange } })

    expect(screen.getByDisplayValue('open')).toBeInTheDocument()

    const nextExpression: FilterExpression = {
      kind: 'condition',
      field: 'task.priority',
      operator: 'eq',
      effect: 'require',
      unknown: 'exclude',
      value: { kind: 'scalar', value: 'low' },
    }
    await view.rerender({ expression: nextExpression, fields, onExpressionChange })

    expect(screen.getByDisplayValue('low')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Field for Priority' })).toHaveValue(
      'task.priority'
    )
    expect(screen.queryByDisplayValue('open')).not.toBeInTheDocument()
  })

  it('exposes nested structure, diagnostics and keyboard-operable tree actions', async () => {
    const onExpressionChange = vi.fn()
    render(ExpressionBuilder, { props: { expression, fields, onExpressionChange } })

    expect(
      screen.getByRole('region', { name: 'Advanced filter expression builder' })
    ).toBeInTheDocument()
    expect(screen.getAllByTestId('expression-condition')).toHaveLength(2)
    expect(screen.getByRole('status')).toHaveTextContent('Expression valid')

    const moveUpButtons = screen.getAllByRole('button', { name: 'Move condition up' })
    const secondMoveUp = moveUpButtons[1]
    if (!secondMoveUp) throw new Error('Expected a move-up button for the second condition')
    await fireEvent.click(secondMoveUp)
    expect(onExpressionChange).toHaveBeenCalled()
    await fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
  })
})
