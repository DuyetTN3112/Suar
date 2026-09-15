import type { RuntimeRecord } from './execute_filter_query_types.js'

import type { FilterExecutorCapabilities } from '#modules/filtering/actions/ports/outbound/filter_query_executor'
import type { FilterContextDefinition } from '#modules/filtering/domain/filtering-core/filter_context_definition'
import type { FilterHashGenerator } from '#modules/filtering/domain/filtering-core/filter_hash'
import { FILTER_OPERATORS_BY_FIELD_TYPE, type FilterFieldType } from '#modules/filtering/domain/filtering-core/filter_operators'
import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'

export function isRecord(value: unknown): value is RuntimeRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function isOptionalBoundedString(value: unknown, maxLength: number): value is string | undefined {
  return value === undefined || (typeof value === 'string' && value.length <= maxLength)
}

export function isFilterFieldType(value: unknown): value is FilterFieldType {
  return (
    value === 'scalar' ||
    value === 'multi_value' ||
    value === 'number' ||
    value === 'date_time' ||
    value === 'text' ||
    value === 'hierarchy' ||
    value === 'relation' ||
    value === 'boolean'
  )
}

export function isStringEnumArray(value: unknown, allowed: readonly string[]): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((entry) => typeof entry === 'string' && allowed.includes(entry)) &&
    new Set(value).size === value.length
  )
}

export function isSortDefinitionEnvelope(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.field === 'string' &&
    isStringEnumArray(value.directions, ['asc', 'desc'])
  )
}

export function isFieldDefinitionEnvelope(value: unknown): boolean {
  if (
    !isRecord(value) ||
    typeof value.key !== 'string' ||
    value.key.length === 0 ||
    !isFilterFieldType(value.type)
  ) {
    return false
  }
  const fieldType = value.type
  return (
    Array.isArray(value.operators) &&
    value.operators.every(
      (operator) =>
        typeof operator === 'string' && FILTER_OPERATORS_BY_FIELD_TYPE[fieldType].includes(operator)
    ) &&
    Array.isArray(value.effects) &&
    value.effects.every((effect) => effect === 'require' || effect === 'exclude') &&
    (value.defaultUnknown === 'include' || value.defaultUnknown === 'exclude') &&
    typeof value.facetable === 'boolean' &&
    typeof value.sortable === 'boolean' &&
    typeof value.projectable === 'boolean' &&
    typeof value.preference === 'boolean' &&
    typeof value.valueSearch === 'boolean' &&
    isStringEnumArray(value.facetCountModes, ['constrained', 'self_excluding']) &&
    typeof value.cost === 'number' &&
    Number.isFinite(value.cost) &&
    value.cost >= 0
  )
}

export function isFilterContextDefinitionEnvelope(value: unknown): value is FilterContextDefinition {
  if (
    !isRecord(value) ||
    typeof value.key !== 'string' ||
    value.key.length === 0 ||
    !Number.isSafeInteger(value.version) ||
    (value.version as number) < 1 ||
    typeof value.resource !== 'string' ||
    typeof value.ownerModule !== 'string' ||
    typeof value.executionProfile !== 'string' ||
    value.executionProfile.length === 0 ||
    (value.degradationPolicy !== 'fail_closed' && value.degradationPolicy !== 'explicit_partial') ||
    !isRecord(value.capabilities) ||
    !isRecord(value.limits) ||
    !Array.isArray(value.fields) ||
    !Array.isArray(value.sorts) ||
    !Array.isArray(value.defaultSort)
  ) {
    return false
  }
  const capability = value.capabilities
  for (const key of [
    'text',
    'facets',
    'nestedGroups',
    'preferences',
    'relativeTime',
    'savedViews',
    'sharedViews',
    'alerts',
    'emptyRequest',
  ]) {
    if (typeof capability[key] !== 'boolean') return false
  }
  if (
    (capability.pagination !== 'cursor' &&
      capability.pagination !== 'offset' &&
      capability.pagination !== 'bounded' &&
      capability.pagination !== 'none') ||
    !Number.isSafeInteger(capability.maxDepth) ||
    (capability.maxDepth as number) < 1 ||
    !Number.isSafeInteger(capability.maxConditions) ||
    (capability.maxConditions as number) < 1
  ) {
    return false
  }
  for (const key of [
    'maxPageSize',
    'maxFacetRequests',
    'maxProjectionFields',
    'maxSorts',
    'maxSetValues',
    'maxTextLength',
    'maxRelationDepth',
    'maxCost',
  ]) {
    if (!Number.isSafeInteger(value.limits[key]) || (value.limits[key] as number) < 0) return false
  }
  if (
    value.limits['maxCursorLength'] !== undefined &&
    (!Number.isSafeInteger(value.limits['maxCursorLength']) ||
      (value.limits['maxCursorLength'] as number) < 1 ||
      (value.limits['maxCursorLength'] as number) > 16_384)
  ) {
    return false
  }
  return (
    value.fields.every(isFieldDefinitionEnvelope) && value.sorts.every(isSortDefinitionEnvelope)
  )
}

export function isExecutorCapabilitiesEnvelope(value: unknown): value is FilterExecutorCapabilities {
  if (!isRecord(value) || !isRecord(value.fieldOperators)) return false
  for (const key of [
    'text',
    'facets',
    'nestedGroups',
    'preferences',
    'relativeTime',
    'relations',
  ]) {
    if (typeof value[key] !== 'boolean') return false
  }
  for (const key of [
    'maxDepth',
    'maxConditions',
    'maxPageSize',
    'maxFacetRequests',
    'maxProjectionFields',
    'maxSorts',
    'maxCost',
  ]) {
    if (!Number.isSafeInteger(value[key]) || (value[key] as number) < 0) return false
  }
  if (
    !isStringEnumArray(value.pagination, ['cursor', 'offset', 'bounded', 'none']) ||
    !isStringEnumArray(value.facetCountModes, ['constrained', 'self_excluding']) ||
    !isStringEnumArray(value.totalRelations, ['eq', 'gte', 'unknown'])
  ) {
    return false
  }
  return Object.values(value.fieldOperators).every(
    (operators) =>
      Array.isArray(operators) &&
      operators.every((operator) => typeof operator === 'string') &&
      new Set(operators).size === operators.length
  )
}

export function isAcyclicFilterExpression(value: unknown, maxTraversalDepth: number): boolean {
  const visiting = new WeakSet<object>()
  const visit = (node: unknown, depth: number): boolean => {
    if (!isRecord(node) || depth > maxTraversalDepth || visiting.has(node)) return false
    visiting.add(node)
    let valid = true
    if (node.kind === 'group') {
      valid =
        Array.isArray(node.children) && node.children.every((child) => visit(child, depth + 1))
    } else if (
      node.kind === 'condition' &&
      isRecord(node.value) &&
      node.value.kind === 'relation'
    ) {
      valid = visit(node.value.expression, depth + 1)
    }
    visiting.delete(node)
    return valid
  }
  return visit(value, 0)
}

export function stableSerialize(value: unknown, visiting = new WeakSet<object>()): string {
  if (Array.isArray(value)) {
    if (visiting.has(value)) throw new FilterExecutionError('FILTER_CONTEXT_UNAVAILABLE')
    visiting.add(value)
    const result = `[${value.map((item) => stableSerialize(item, visiting)).join(',')}]`
    visiting.delete(value)
    return result
  }
  if (isRecord(value)) {
    if (visiting.has(value)) throw new FilterExecutionError('FILTER_CONTEXT_UNAVAILABLE')
    visiting.add(value)
    const result = `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key], visiting)}`)
      .join(',')}}`
    visiting.delete(value)
    return result
  }
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
    throw new FilterExecutionError('FILTER_CONTEXT_UNAVAILABLE')
  }
  return JSON.stringify(value)
}

export function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== 'object' || seen.has(value)) return value
  seen.add(value)
  for (const child of Object.values(value)) deepFreeze(child, seen)
  return Object.freeze(value)
}

export function cloneAndFreezeDefinition(definition: FilterContextDefinition): FilterContextDefinition {
  try {
    return deepFreeze(structuredClone(definition))
  } catch {
    throw new FilterExecutionError('FILTER_CONTEXT_UNAVAILABLE')
  }
}

export function fingerprintEffectiveContext(
  definition: FilterContextDefinition,
  hashGenerator: FilterHashGenerator
): string {
  try {
    return hashGenerator.hash(stableSerialize(definition))
  } catch {
    throw new FilterExecutionError('FILTER_CONTEXT_UNAVAILABLE')
  }
}
