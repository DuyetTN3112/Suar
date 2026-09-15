import { canonicalizeFilterExpression } from '#modules/filtering/domain/filtering-core/filter_canonicalizer'
import type { FilterExpression } from '#modules/filtering/domain/filtering-core/filter_expression'
import type { FilterHashGenerator } from '#modules/filtering/domain/filtering-core/filter_hash'
import {
  DEFAULT_FILTER_VALIDATION_LIMITS,
  validateFilterExpression,
} from '#modules/filtering/domain/filtering-core/filter_validator'

export const MAX_SAVED_FILTER_SORT_FIELDS = 100
export const MAX_SAVED_FILTER_PROJECTION_FIELDS = 100
export const MAX_SAVED_FILTER_JSON_DEPTH = 32
export const MAX_SAVED_FILTER_JSON_NODES = 1e4

export class SavedFilterViewInvariantError extends Error {
  code: string
  override name = 'SavedFilterViewInvariantError'

  constructor(code: string) {
    super(code)
    this.code = code
  }
}

export type SavedFilterJsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: SavedFilterJsonValue }
  | SavedFilterJsonValue[]

export interface SavedFilterSortEntry {
  field: string
  direction: 'asc' | 'desc'
}

export interface SavedFilterSemanticState {
  filter: FilterExpression | null
  textQuery: string | null
  sort: readonly SavedFilterSortEntry[]
  projection: readonly string[]
}

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(',')}]`
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

export function assertJsonValue(
  value: unknown,
  seen: WeakSet<object>,
  depth = 0,
  budget = { nodes: 0 }
): void {
  if (depth > MAX_SAVED_FILTER_JSON_DEPTH) {
    throw new SavedFilterViewInvariantError('presentation_depth_exceeded')
  }
  budget.nodes += 1
  if (budget.nodes > MAX_SAVED_FILTER_JSON_NODES) {
    throw new SavedFilterViewInvariantError('presentation_node_limit_exceeded')
  }
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return
  }
  if (typeof value !== 'object') {
    throw new SavedFilterViewInvariantError('invalid_presentation_state')
  }
  if (seen.has(value)) {
    throw new SavedFilterViewInvariantError('cyclic_presentation_state')
  }
  seen.add(value)
  if (Array.isArray(value)) {
    for (const entry of value) assertJsonValue(entry, seen, depth + 1, budget)
    seen.delete(value)
    return
  }
  if (Object.prototype.toString.call(value) !== '[object Object]') {
    throw new SavedFilterViewInvariantError('invalid_presentation_state')
  }
  for (const entry of Object.values(value)) assertJsonValue(entry, seen, depth + 1, budget)
  seen.delete(value)
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function hasOnlyKeys(value: Record<string, unknown>, allowed: string[]): boolean {
  const allowedKeys = new Set(allowed)
  return Object.keys(value).every((key) => allowedKeys.has(key))
}

export function assertAcyclicSemanticJson(
  value: unknown,
  seen: WeakSet<object>,
  depth = 0,
  budget = { nodes: 0 }
): void {
  if (depth > MAX_SAVED_FILTER_JSON_DEPTH) {
    throw new SavedFilterViewInvariantError('semantic_depth_exceeded')
  }
  budget.nodes += 1
  if (budget.nodes > MAX_SAVED_FILTER_JSON_NODES) {
    throw new SavedFilterViewInvariantError('semantic_node_limit_exceeded')
  }
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return
  }
  if (typeof value !== 'object') {
    throw new SavedFilterViewInvariantError('corrupt_semantic_payload')
  }
  if (seen.has(value)) {
    throw new SavedFilterViewInvariantError('cyclic_semantic_payload')
  }
  if (!Array.isArray(value) && Object.prototype.toString.call(value) !== '[object Object]') {
    throw new SavedFilterViewInvariantError('corrupt_semantic_payload')
  }
  seen.add(value)
  for (const entry of Array.isArray(value) ? value : Object.values(value)) {
    assertAcyclicSemanticJson(entry, seen, depth + 1, budget)
  }
  seen.delete(value)
}

export function hasExactFilterValueShape(value: unknown): boolean {
  if (!isRecord(value) || typeof value['kind'] !== 'string') return false
  switch (value['kind']) {
    case 'scalar':
      return hasOnlyKeys(value, ['kind', 'value'])
    case 'set':
      return hasOnlyKeys(value, ['kind', 'values', 'minimumMatch'])
    case 'range':
      return hasOnlyKeys(value, ['kind', 'gte', 'gt', 'lte', 'lt'])
    case 'relative_time':
      return hasOnlyKeys(value, ['kind', 'amount', 'unit', 'anchor'])
    case 'hierarchy':
      return hasOnlyKeys(value, ['kind', 'termIds', 'expansion'])
    case 'relation':
      return (
        hasOnlyKeys(value, ['kind', 'expression', 'count']) &&
        hasExactFilterExpressionShape(value['expression']) &&
        (value['count'] === undefined ||
          (isRecord(value['count']) && hasOnlyKeys(value['count'], ['gte', 'lte'])))
      )
    default:
      return false
  }
}

export function hasExactFilterExpressionShape(value: unknown): boolean {
  if (!isRecord(value)) return false
  if (value['kind'] === 'condition') {
    return (
      hasOnlyKeys(value, ['kind', 'field', 'operator', 'effect', 'unknown', 'value']) &&
      (value['value'] === undefined || hasExactFilterValueShape(value['value']))
    )
  }
  return (
    value['kind'] === 'group' &&
    hasOnlyKeys(value, ['kind', 'combinator', 'negated', 'children']) &&
    Array.isArray(value['children']) &&
    value['children'].every(hasExactFilterExpressionShape)
  )
}

export function assertSemanticState(value: unknown): asserts value is SavedFilterSemanticState {
  assertAcyclicSemanticJson(value, new WeakSet())
  if (!isRecord(value)) {
    throw new SavedFilterViewInvariantError('corrupt_semantic_payload')
  }
  if (!hasOnlyKeys(value, ['filter', 'textQuery', 'sort', 'projection'])) {
    throw new SavedFilterViewInvariantError('corrupt_semantic_payload')
  }
  const filter = value['filter']
  const textQuery = value['textQuery']
  const sort = value['sort']
  const projection = value['projection']
  if (
    filter !== null &&
    (!validateFilterExpression(filter).valid || !hasExactFilterExpressionShape(filter))
  ) {
    throw new SavedFilterViewInvariantError('corrupt_semantic_payload')
  }
  if (
    textQuery !== null &&
    (typeof textQuery !== 'string' ||
      textQuery.length > DEFAULT_FILTER_VALIDATION_LIMITS.maxTextLength)
  ) {
    throw new SavedFilterViewInvariantError('corrupt_semantic_payload')
  }
  if (
    !Array.isArray(sort) ||
    sort.length > MAX_SAVED_FILTER_SORT_FIELDS ||
    !sort.every(
      (entry) =>
        isRecord(entry) &&
        hasOnlyKeys(entry, ['field', 'direction']) &&
        typeof entry['field'] === 'string' &&
        entry['field'].trim().length > 0 &&
        entry['field'].length <= DEFAULT_FILTER_VALIDATION_LIMITS.maxTextLength &&
        (entry['direction'] === 'asc' || entry['direction'] === 'desc')
    )
  ) {
    throw new SavedFilterViewInvariantError('corrupt_semantic_payload')
  }
  if (
    !Array.isArray(projection) ||
    projection.length > MAX_SAVED_FILTER_PROJECTION_FIELDS ||
    !projection.every(
      (field) =>
        typeof field === 'string' &&
        field.trim().length > 0 &&
        field.length <= DEFAULT_FILTER_VALIDATION_LIMITS.maxTextLength
    )
  ) {
    throw new SavedFilterViewInvariantError('corrupt_semantic_payload')
  }
}

export function canonicalizeSemanticState(state: SavedFilterSemanticState): SavedFilterSemanticState {
  assertSemanticState(state)
  const projection = [...new Set(state.projection.map((field) => field.trim()))]
  const sort = state.sort.map((entry) => ({
    field: entry.field.trim(),
    direction: entry.direction,
  }))
  return {
    filter: state.filter === null ? null : canonicalizeFilterExpression(state.filter),
    textQuery: state.textQuery === null ? null : state.textQuery.normalize('NFKC').trim(),
    sort,
    projection,
  }
}

export function serializeSavedFilterSemanticState(state: SavedFilterSemanticState): string {
  return stableJson(canonicalizeSemanticState(state))
}

export function hashSavedFilterSemanticState(
  state: SavedFilterSemanticState,
  hashGenerator: FilterHashGenerator
): string {
  return hashGenerator.hash(serializeSavedFilterSemanticState(state))
}

export function parseSavedFilterSemanticState(payloadJson: string): SavedFilterSemanticState {
  let parsed: unknown
  try {
    parsed = JSON.parse(payloadJson)
  } catch {
    throw new SavedFilterViewInvariantError('corrupt_semantic_payload')
  }
  assertSemanticState(parsed)
  return canonicalizeSemanticState(parsed)
}
