import type { FilterCondition, FilterExpression, FilterPreference, FilterScalar } from '../contracts'
import { canonicalizeCriteriaFilter } from '../criteria_codec'

export interface QualifierVisualChip {
  readonly kind: 'unknown_policy' | 'unsupported_relation' | 'unsupported_value' | 'preference'
  readonly field?: string
  readonly index?: number
}

export interface QualifierPreview {
  readonly text: string
  readonly chips: readonly QualifierVisualChip[]
}

function quote(value: FilterScalar): string {
  if (typeof value !== 'string') return String(value)
  return /^[\p{L}\p{N}_@.\-/]+$/u.test(value)
    ? value
    : `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`
}

function valuesFor(condition: FilterCondition): readonly FilterScalar[] {
  const value = condition.value
  if (value === undefined) return []
  if (value.kind === 'scalar') return [value.value]
  if (value.kind === 'set') return value.values
  return []
}

function serializeCondition(condition: FilterCondition, chips: QualifierVisualChip[]): string {
  if (condition.unknown === 'include') {
    chips.push({ kind: 'unknown_policy', field: condition.field })
  }

  const value = condition.value
  if (value?.kind === 'relation') {
    chips.push({ kind: 'unsupported_relation', field: condition.field })
    return ''
  }
  if (value?.kind === 'relative_time' || value?.kind === 'hierarchy' || value?.kind === 'range') {
    chips.push({ kind: 'unsupported_value', field: condition.field })
    return ''
  }

  const values = valuesFor(condition)
  if (condition.operator === 'exists' || condition.operator === 'missing') {
    return `${condition.effect === 'exclude' ? '-' : ''}${condition.field}:${condition.operator}`
  }
  const first = values[0]
  if (first === undefined) return ''
  const prefix = condition.effect === 'exclude' ? '-' : ''
  if (values.length > 1 && condition.operator === 'contains_none') {
    return `-${condition.field}:(${values.map(quote).join(' OR ')})`
  }
  if (values.length > 1 && (condition.operator === 'contains_any' || condition.operator === 'contains_all')) {
    const joiner = condition.operator === 'contains_all' ? ' AND ' : ' OR '
    return `${prefix}${condition.field}:(${values.map(quote).join(joiner)})`
  }
  const comparisons: Readonly<Record<string, string>> = { gt: '>', gte: '>=', lt: '<', lte: '<=' }
  return `${prefix}${condition.field}:${comparisons[condition.operator] ?? ''}${quote(first)}`
}

function serializeExpression(expression: FilterExpression, chips: QualifierVisualChip[]): string {
  if (expression.kind === 'condition') return serializeCondition(expression, chips)
  const parts = expression.children
    .map((child) => serializeExpression(child, chips))
    .filter((part) => part.length > 0)
  if (parts.length === 0) return ''
  if (expression.combinator === 'or') return `(${parts.join(' OR ')})`
  return parts.join(' ')
}

export function serializeQualifierPreview(
  expression: FilterExpression,
  preferences: readonly FilterPreference[] = []
): QualifierPreview {
  const chips: QualifierVisualChip[] = []
  let canonical: FilterExpression
  try {
    canonical = canonicalizeCriteriaFilter(expression)
  } catch {
    return { text: '', chips: [{ kind: 'unsupported_value' }] }
  }
  const text = serializeExpression(canonical, chips)
  for (const [index, preference] of preferences.entries()) {
    chips.push({ kind: 'preference', index })
    if (preference.expression.kind === 'condition' && preference.expression.unknown === 'include') {
      chips.push({ kind: 'unknown_policy', field: preference.expression.field })
    }
  }
  return { text, chips }
}
