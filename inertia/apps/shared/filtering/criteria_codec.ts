import type {
  FilterCondition,
  FilterCriteria,
  FilterExpression,
  FilterPreference,
  FilterUrlState,
  FilterValue,
} from './contracts'
import {
  canonicalScalarSet,
  isCriteriaFilterExpression,
  isFilterCriteria,
  isFilterPresentationState,
  isFilterUrlState,
  parseCriteriaFilter,
} from './criteria_validator'

export {
  isCriteriaFilterExpression,
  isFilterCriteria,
  isFilterPresentationState,
  isFilterUrlState,
  parseCriteriaFilter,
}

function canonicalizeValue(value: FilterValue): FilterValue {
  switch (value.kind) {
    case 'scalar':
      return { kind: 'scalar', value: value.value }
    case 'set': {
      const result: Extract<FilterValue, { kind: 'set' }> = {
        kind: 'set',
        values: canonicalScalarSet(value.values),
      }
      if (value.minimumMatch !== undefined) result.minimumMatch = value.minimumMatch
      return result
    }
    case 'range': {
      const result: Extract<FilterValue, { kind: 'range' }> = { kind: 'range' }
      for (const key of ['gte', 'gt', 'lte', 'lt'] as const) {
        if (value[key] !== undefined) result[key] = value[key]
      }
      return result
    }
    case 'relative_time':
      return { ...value }
    case 'hierarchy':
      return {
        kind: 'hierarchy',
        termIds: canonicalScalarSet(value.termIds).map(String),
        expansion: value.expansion,
      }
    case 'relation': {
      const result: Extract<FilterValue, { kind: 'relation' }> = {
        kind: 'relation',
        expression: canonicalizeCriteriaFilterUnchecked(value.expression),
      }
      if (value.count !== undefined) result.count = { ...value.count }
      return result
    }
  }
}

function canonicalizeCondition(condition: FilterCondition): FilterCondition {
  let operator = condition.operator
  let effect = condition.effect
  if (operator === 'not_in') {
    operator = 'in'
    effect = effect === 'require' ? 'exclude' : 'require'
  } else if (effect === 'exclude' && operator === 'contains_any') {
    operator = 'contains_none'
    effect = 'require'
  } else if (effect === 'exclude' && operator === 'contains_none') {
    operator = 'contains_any'
    effect = 'require'
  }

  const result: FilterCondition = {
    kind: 'condition',
    field: condition.field.trim(),
    operator,
    effect,
    unknown: condition.unknown,
  }
  if (condition.value !== undefined) result.value = canonicalizeValue(condition.value)
  return result
}

const totalComplements: Readonly<Record<string, string>> = { exists: 'missing', missing: 'exists' }

export function stableCriteriaJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableCriteriaJson).join(',')}]`
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableCriteriaJson(record[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

function canonicalizeCriteriaFilterUnchecked(expression: FilterExpression): FilterExpression {
  if (expression.kind === 'condition') return canonicalizeCondition(expression)

  const unique = new Map<string, FilterExpression>()
  for (const child of expression.children.map(canonicalizeCriteriaFilterUnchecked)) {
    unique.set(stableCriteriaJson(child), child)
  }
  const children = [...unique.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([, child]) => child)

  if (expression.negated && children.length === 1) {
    const child = children[0]
    if (child?.kind === 'condition') {
      const complement = totalComplements[child.operator]
      if (complement !== undefined) return { ...child, operator: complement }
    }
    if (child?.kind === 'group' && child.negated) {
      const { negated: _negated, ...withoutNegation } = child
      return withoutNegation
    }
  }

  const result: FilterExpression = { kind: 'group', combinator: expression.combinator, children }
  if (expression.negated) result.negated = true
  return result
}

export function canonicalizeCriteriaFilter(expression: FilterExpression): FilterExpression {
  if (!isCriteriaFilterExpression(expression)) {
    throw new TypeError('Filter expression is invalid or exceeds client safety limits')
  }
  return canonicalizeCriteriaFilterUnchecked(expression)
}

export function serializeCriteriaFilter(expression: FilterExpression): string {
  return stableCriteriaJson(canonicalizeCriteriaFilter(expression))
}

export function canonicalizeFilterCriteria(criteria: FilterCriteria): FilterCriteria {
  const result: FilterCriteria = {
    context: criteria.context.trim(),
    schemaVersion: criteria.schemaVersion,
    sort: criteria.sort.map((sort) => ({ ...sort, field: sort.field.trim() })),
    page: { ...criteria.page },
  }
  if (criteria.text !== undefined) result.text = { value: criteria.text.value }
  if (criteria.filter !== undefined) result.filter = canonicalizeCriteriaFilter(criteria.filter)
  if (criteria.preferences !== undefined) {
    result.preferences = criteria.preferences.map((preference) => {
      const canonical: FilterPreference = {
        effect: preference.effect,
        expression: canonicalizeCriteriaFilter(preference.expression),
      }
      if (preference.weight !== undefined) canonical.weight = preference.weight
      return canonical
    })
  }
  if (criteria.projection !== undefined) result.projection = [...criteria.projection]
  if (criteria.requestedFacets !== undefined) {
    result.requestedFacets = criteria.requestedFacets.map((facet) => ({ ...facet }))
  }
  return result
}

export function canonicalizeFilterUrlState(state: FilterUrlState): FilterUrlState {
  const criteria = canonicalizeFilterCriteria(state.criteria)
  if (criteria.requestedFacets !== undefined) {
    criteria.requestedFacets = criteria.requestedFacets.map((facet) => {
      const stableFacet = { field: facet.field }
      return facet.countMode === undefined
        ? stableFacet
        : { ...stableFacet, countMode: facet.countMode }
    })
  }
  return {
    criteria,
    presentation: JSON.parse(
      stableCriteriaJson(state.presentation)
    ) as FilterUrlState['presentation'],
  }
}
