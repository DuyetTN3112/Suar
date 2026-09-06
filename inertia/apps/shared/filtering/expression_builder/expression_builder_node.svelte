<script lang="ts">
  import type { FilterExpression } from '../contracts'
  import Self from './expression_builder_node.svelte'
  import type { ExpressionMove } from './expression_builder_model'

  interface FieldOption {
    key: string
    label: string
    operators: readonly string[]
  }

  interface Props {
    expression: FilterExpression
    path: readonly number[]
    fields: readonly FieldOption[]
    onChange: (path: readonly number[], expression: FilterExpression) => void
    onRemove: (path: readonly number[]) => void
    onAdd: (path: readonly number[]) => void
    onMove: (path: readonly number[], movement: ExpressionMove) => void
  }

  let { expression, path, fields, onChange, onRemove, onAdd, onMove }: Props = $props()
  const labelFor = (field: string) => fields.find((option) => option.key === field)?.label ?? field
  const fieldOf = (node: FilterExpression) => node.kind === 'condition' ? node.field : ''
  const operatorOf = (node: FilterExpression) => node.kind === 'condition' ? node.operator : 'eq'
  const scalarValueOf = (node: FilterExpression) =>
    node.kind === 'condition' && node.value?.kind === 'scalar' ? String(node.value.value) : ''
  function withField(node: FilterExpression, field: string, operator: string): FilterExpression {
    return node.kind === 'condition' ? { ...node, field, operator } : node
  }
  function withOperator(node: FilterExpression, operator: string): FilterExpression {
    return node.kind === 'condition' ? { ...node, operator } : node
  }
  function withScalarValue(node: FilterExpression, value: string): FilterExpression {
    return node.kind === 'condition' ? { ...node, value: { kind: 'scalar', value } } : node
  }
</script>

{#if expression.kind === 'group'}
  <fieldset class="expression-group" data-testid="expression-group" aria-label={`${expression.combinator.toUpperCase()} group`}>
    <legend>
      <span>{expression.negated ? 'NOT ' : ''}{expression.combinator.toUpperCase()}</span>
      <button type="button" onclick={() => onAdd(path)} aria-label="Add condition to group">Add condition</button>
      {#if path.length > 0}
        <button type="button" onclick={() => onRemove(path)} aria-label="Remove group">Remove group</button>
      {/if}
    </legend>
    {#if expression.children.length === 0}
      <p role="status">Empty group: add at least two conditions.</p>
    {/if}
    {#each expression.children as child, index (index)}
      <Self
        expression={child}
        path={[...path, index]}
        {fields}
        {onChange}
        {onRemove}
        {onAdd}
        {onMove}
      />
    {/each}
  </fieldset>
{:else}
  <div class="expression-condition" data-testid="expression-condition">
    <label>
      <span>Field</span>
      <select
        aria-label={`Field for ${labelFor(fieldOf(expression))}`}
        value={fieldOf(expression)}
        onchange={(event) => {
          const field = (event.currentTarget as HTMLSelectElement).value
          const option = fields.find((item) => item.key === field)
          onChange(path, withField(expression, field, option?.operators[0] ?? operatorOf(expression)))
        }}
      >
        {#each fields as field (field.key)}
          <option value={field.key}>{field.label}</option>
        {/each}
      </select>
    </label>
    <label>
      <span>Operator</span>
      <select
        aria-label="Operator"
        value={operatorOf(expression)}
        onchange={(event) => onChange(path, withOperator(expression, (event.currentTarget as HTMLSelectElement).value))}
      >
        {#each (fields.find((item) => item.key === expression.field)?.operators ?? [expression.operator]) as operator}
          <option value={operator}>{operator}</option>
        {/each}
      </select>
    </label>
    <label>
      <span>Value</span>
      <input
        aria-label={`Value for ${labelFor(fieldOf(expression))}`}
        value={scalarValueOf(expression)}
        onchange={(event) => onChange(path, withScalarValue(expression, (event.currentTarget as HTMLInputElement).value))}
      />
    </label>
    <button type="button" onclick={() => onRemove(path)} aria-label={`Remove ${labelFor(fieldOf(expression))} condition`}>Remove</button>
    {#if path.length > 0}
      <button type="button" onclick={() => onMove(path, 'up')} aria-label="Move condition up">Move up</button>
      <button type="button" onclick={() => onMove(path, 'down')} aria-label="Move condition down">Move down</button>
      <button type="button" onclick={() => onMove(path, 'indent')} aria-label="Indent condition">Indent</button>
      <button type="button" onclick={() => onMove(path, 'outdent')} aria-label="Outdent condition">Outdent</button>
    {/if}
  </div>
{/if}
