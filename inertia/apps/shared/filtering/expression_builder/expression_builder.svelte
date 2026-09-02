<script lang="ts">
  import type { FilterExpression, FilterPreference } from '../contracts'
  import {
    addExpressionChild,
    createExpressionBuilderState,
    removeExpressionAt,
    moveExpressionChild,
    redoExpressionBuilder,
    setExpressionAt,
    undoExpressionBuilder,
    validateExpressionBuilderState,
    type ExpressionBuilderLimits,
  } from './expression_builder_model'
  import ExpressionBuilderNode from './expression_builder_node.svelte'

  export interface ExpressionBuilderField {
    key: string
    label: string
    operators: readonly string[]
  }

  interface Props {
    expression: FilterExpression
    preferences?: readonly FilterPreference[]
    fields: readonly ExpressionBuilderField[]
    limits?: ExpressionBuilderLimits
    onExpressionChange: (expression: FilterExpression) => void
    onPreferencesChange?: (preferences: readonly FilterPreference[]) => void
  }

  let {
    expression,
    preferences = [],
    fields,
    limits = { maxDepth: 5, maxConditions: 100 },
    onExpressionChange,
    onPreferencesChange,
  }: Props = $props()

  const initialExpression: FilterExpression = {
    kind: 'condition',
    field: '',
    operator: 'eq',
    effect: 'require',
    unknown: 'exclude',
    value: { kind: 'scalar', value: '' },
  }
  let builderState = $state(createExpressionBuilderState(initialExpression))
  let inputSignature = $state<string | null>(null)
  $effect.pre(() => {
    const nextSignature = JSON.stringify({ expression, preferences })
    if (inputSignature === nextSignature) return
    builderState = createExpressionBuilderState(expression, preferences)
    inputSignature = nextSignature
  })
  let diagnostics = $derived(validateExpressionBuilderState(builderState, limits))

  function emit(next: typeof builderState) {
    builderState = next
    onExpressionChange(next.expression)
    onPreferencesChange?.(next.preferences)
  }

  function addCondition(path: readonly number[]) {
    const field = fields[0]
    if (!field) return
    emit(addExpressionChild(builderState, path, {
      kind: 'condition',
      field: field.key,
      operator: field.operators[0] ?? 'eq',
      effect: 'require',
      unknown: 'exclude',
      value: { kind: 'scalar', value: '' },
    }))
  }

  function changeExpression(path: readonly number[], next: FilterExpression) {
    emit(setExpressionAt(builderState, path, next))
  }

  function removeExpression(path: readonly number[]) {
    emit(removeExpressionAt(builderState, path))
  }

  function moveExpression(path: readonly number[], movement: import('./expression_builder_model').ExpressionMove) {
    emit(moveExpressionChild(builderState, path, movement))
  }
</script>

<section class="expression-builder" aria-label="Advanced filter expression builder">
  <div class="expression-builder__toolbar">
    <button type="button" onclick={() => emit(undoExpressionBuilder(builderState))} disabled={builderState.undoStack.length === 0}>Undo</button>
    <button type="button" onclick={() => emit(redoExpressionBuilder(builderState))} disabled={builderState.redoStack.length === 0}>Redo</button>
    <span role="status" aria-live="polite">
      {diagnostics.length === 0 ? 'Expression valid' : `${diagnostics.length} repair diagnostic${diagnostics.length === 1 ? '' : 's'}`}
    </span>
  </div>

  <ExpressionBuilderNode
    expression={builderState.expression}
    path={[]}
    {fields}
    onChange={changeExpression}
    onRemove={removeExpression}
    onAdd={addCondition}
    onMove={moveExpression}
  />

  {#if preferences.length > 0}
    <aside aria-label="Ranking preferences">
      <h3>Ranking preferences</h3>
      <p>Prefer/Avoid clauses remain separate from eligibility.</p>
      <span>{preferences.length} preference{preferences.length === 1 ? '' : 's'}</span>
    </aside>
  {/if}
</section>
