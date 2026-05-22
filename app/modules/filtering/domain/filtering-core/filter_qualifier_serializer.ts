import { canonicalizeFilterExpression } from '#modules/filtering/domain/filtering-core/filter_canonicalizer'
import type { FilterCondition, FilterExpression, FilterScalar } from '#modules/filtering/domain/filtering-core/filter_expression'

export interface SerializedQualifierChip {
  readonly kind: 'unknown_policy' | 'unsupported_expression'
  readonly field?: string
  readonly reason?: string
}

export interface FilterQualifierSerializationOptions {
  readonly unsupported?: 'throw' | 'chip'
  readonly unknownPolicy?: 'drop' | 'chip'
}

export interface SerializedFilterQualifiers {
  readonly text: string
  readonly chips: readonly SerializedQualifierChip[]
}

function quote(value: FilterScalar): string {
  if (typeof value !== 'string') return String(value)
  return /^[\p{L}\p{N}_@.\-/]+$/u.test(value) ? value : `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`
}

function conditionValue(condition: FilterCondition): readonly FilterScalar[] {
  const value = condition.value
  if (value === undefined) return []
  if (value.kind === 'scalar') return [value.value]
  if (value.kind === 'set') return value.values
  return []
}

function simpleCondition(condition: FilterCondition): string {
  const values = conditionValue(condition)
  const first = values[0]
  if (condition.operator === 'exists' || condition.operator === 'missing') {
    return `${condition.effect === 'exclude' ? '-' : ''}${condition.field}:${condition.operator}`
  }
  if (first === undefined) return `${condition.field}:""`
  const prefix = condition.effect === 'exclude' ? '-' : ''
  if (values.length > 1 && (condition.operator === 'contains_any' || condition.operator === 'contains_all')) {
    const joiner = condition.operator === 'contains_all' ? ' AND ' : ' OR '
    return `${prefix}${condition.field}:(${values.map(quote).join(joiner)})`
  }
  if (values.length > 1 && condition.operator === 'contains_none') {
    return `-${condition.field}:(${values.map(quote).join(' OR ')})`
  }
  const comparison: Readonly<Record<string, string>> = { gt: '>', gte: '>=', lt: '<', lte: '<=' }
  const operatorPrefix = comparison[condition.operator] ?? ''
  return `${prefix}${condition.field}:${operatorPrefix}${quote(first)}`
}

function serializeExpression(
  expression: FilterExpression,
  options: FilterQualifierSerializationOptions,
  chips: SerializedQualifierChip[]
): string {
  if (expression.kind === 'condition') {
    if (expression.unknown === 'include' && options.unknownPolicy === 'chip') {
      chips.push({ kind: 'unknown_policy', field: expression.field })
    }
    if (expression.value?.kind === 'relation') {
      if (options.unsupported === 'chip') {
        chips.push({ kind: 'unsupported_expression', field: expression.field, reason: 'relation' })
        return ''
      }
      throw new TypeError(`Qualifier syntax cannot represent relation field ${expression.field}`)
    }
    return simpleCondition(expression)
  }

  const children = expression.children
    .map((child) => serializeExpression(child, options, chips))
    .filter(Boolean)
  if (children.length === 0) return ''
  const joiner = expression.combinator === 'or' ? ' OR ' : ' '
  return expression.combinator === 'or' ? `(${children.join(joiner)})` : children.join(joiner)
}

function compactSameFieldGroup(
  expression: FilterExpression,
  options: FilterQualifierSerializationOptions,
  chips: SerializedQualifierChip[]
): string | undefined {
  if (expression.kind !== 'group' || expression.combinator !== 'or' || expression.negated) return undefined
  if (expression.children.length < 2 || expression.children.some((child) => child.kind !== 'condition')) return undefined
  const conditions = expression.children as FilterCondition[]
  const first = conditions[0]
  if (!first || conditions.some((condition) => condition.field !== first.field || condition.effect !== first.effect)) return undefined
  if (!conditions.every((condition) => condition.operator === first.operator && condition.value?.kind !== 'range')) return undefined
  const values = conditions.flatMap(conditionValue)
  if (values.length !== conditions.length) return undefined
  const unknown = first.unknown === 'include' && options.unknownPolicy === 'chip'
  if (unknown) chips.push({ kind: 'unknown_policy', field: first.field })
  const prefix = first.effect === 'exclude' ? '-' : ''
  return `${prefix}${first.field}:(${values.map(quote).join(' OR ')})`
}

export function serializeFilterQualifiers(expression: FilterExpression): string
export function serializeFilterQualifiers(
  expression: FilterExpression,
  options: FilterQualifierSerializationOptions & { readonly unsupported: 'chip' | 'throw'; readonly unknownPolicy: 'drop' | 'chip' }
): SerializedFilterQualifiers
export function serializeFilterQualifiers(
  expression: FilterExpression,
  options: FilterQualifierSerializationOptions = {}
): string | SerializedFilterQualifiers {
  const chips: SerializedQualifierChip[] = []
  const canonical = canonicalizeFilterExpression(expression)
  const compact = compactSameFieldGroup(canonical, options, chips)
  const text = compact ?? serializeExpression(canonical, options, chips)
  if (options.unsupported === undefined && options.unknownPolicy === undefined) return text
  return { text, chips }
}
