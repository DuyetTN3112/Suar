import type {
  FilterCondition,
  FilterCriteria,
  FilterExpression,
  FilterPresentationState,
  FilterPreference,
  FilterScalar,
  FilterUrlState,
  FilterValue,
} from './contracts'

function canonicalString(value: string): string {
  return value.trim().normalize('NFKC').toLocaleLowerCase('en-US')
}

function scalarIdentity(value: FilterScalar): string {
  return typeof value === 'string'
    ? `string:${canonicalString(value)}`
    : `${typeof value}:${String(value)}`
}

function canonicalScalarSet(values: readonly FilterScalar[]): FilterScalar[] {
  const unique = new Map<string, FilterScalar>()
  for (const value of values) {
    const canonical = typeof value === 'string' ? canonicalString(value) : value
    unique.set(scalarIdentity(canonical), canonical)
  }
  return [...unique.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([, value]) => value)
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const allowedKeys = new Set(allowed)
  return Object.keys(value).every((key) => allowedKeys.has(key))
}

function isScalar(value: unknown): value is FilterScalar {
  return (
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  )
}

const filterOperators = new Set([
  'eq',
  'neq',
  'in',
  'not_in',
  'exists',
  'missing',
  'contains_any',
  'contains_all',
  'contains_none',
  'contains_exactly',
  'contains_at_least',
  'is_empty',
  'gt',
  'gte',
  'lt',
  'lte',
  'between',
  'outside',
  'before',
  'after',
  'within_last',
  'within_next',
  'overdue',
  'exact',
  'contains',
  'prefix',
  'is',
  'is_any',
  'within_subtree',
  'has_ancestor',
  'related_exists',
  'related_missing',
  'related_count',
  'related_matches',
  'is_true',
  'is_false',
  'is_unknown',
])

const CLIENT_MAX_DEPTH = 5
const CLIENT_MAX_CONDITIONS = 100
const CLIENT_MAX_SET_VALUES = 100
const CLIENT_MAX_TEXT_LENGTH = 512
const CLIENT_MAX_RELATION_DEPTH = 2
const CLIENT_MAX_PREFERENCES = 20
const CLIENT_MAX_COLLECTION_ITEMS = 100
const CLIENT_MAX_CURSOR_LENGTH = 2_048
const CLIENT_MAX_PRESENTATION_DEPTH = 20
const CLIENT_MAX_PRESENTATION_NODES = 10_000
const CLIENT_MAX_PRESENTATION_TEXT_LENGTH = 2_048

const operatorsWithoutValue = new Set([
  'exists',
  'missing',
  'is_empty',
  'is_true',
  'is_false',
  'is_unknown',
  'related_exists',
  'related_missing',
  'overdue',
])

interface ClientValidationState {
  conditions: number
  seen: WeakSet<object>
}

function expectedValueKinds(operator: string): readonly FilterValue['kind'][] {
  if (
    [
      'in',
      'not_in',
      'contains_any',
      'contains_all',
      'contains_none',
      'contains_exactly',
      'contains_at_least',
    ].includes(operator)
  ) {
    return ['set']
  }
  if (operator === 'between' || operator === 'outside') return ['range']
  if (operator === 'within_last' || operator === 'within_next') return ['relative_time']
  if (['is', 'is_any', 'within_subtree', 'has_ancestor'].includes(operator)) return ['hierarchy']
  if (operator === 'related_matches') return ['relation']
  if (operator === 'related_count') return ['scalar', 'range']
  return ['scalar']
}

function scalarWithinLimits(value: unknown): value is FilterScalar {
  return isScalar(value) && (typeof value !== 'string' || value.length <= CLIENT_MAX_TEXT_LENGTH)
}

function validRelationCount(value: unknown): boolean {
  if (!isRecord(value) || !hasOnlyKeys(value, ['gte', 'lte'])) return false
  const { gte, lte } = value
  return (
    (gte !== undefined || lte !== undefined) &&
    (gte === undefined || (Number.isSafeInteger(gte) && Number(gte) >= 0)) &&
    (lte === undefined || (Number.isSafeInteger(lte) && Number(lte) >= 0)) &&
    !(typeof gte === 'number' && typeof lte === 'number' && gte > lte)
  )
}

function validRange(value: Record<string, unknown>, relatedCount: boolean): boolean {
  if (!hasOnlyKeys(value, ['kind', 'gte', 'gt', 'lte', 'lt'])) return false
  if (
    (value['gte'] !== undefined && value['gt'] !== undefined) ||
    (value['lte'] !== undefined && value['lt'] !== undefined)
  ) {
    return false
  }
  const lower = value['gte'] ?? value['gt']
  const upper = value['lte'] ?? value['lt']
  if (lower === undefined && upper === undefined) return false
  if (relatedCount) {
    if (value['gt'] !== undefined || value['lt'] !== undefined) return false
    return validRelationCount({ gte: value['gte'], lte: value['lte'] })
  }
  if (
    (lower !== undefined && !scalarWithinLimits(lower)) ||
    (upper !== undefined && !scalarWithinLimits(upper))
  ) {
    return false
  }
  if (typeof lower === 'number' && typeof upper === 'number') {
    return (
      lower < upper || (lower === upper && value['gte'] !== undefined && value['lte'] !== undefined)
    )
  }
  if (lower === undefined || upper === undefined) return true
  if (typeof lower !== typeof upper) return false
  const inverted =
    typeof lower === 'string' && typeof upper === 'string'
      ? lower > upper
      : typeof lower === 'boolean' && typeof upper === 'boolean'
        ? Number(lower) > Number(upper)
        : false
  const exclusiveEqual = lower === upper && (value['gt'] !== undefined || value['lt'] !== undefined)
  return !inverted && !exclusiveEqual
}

function isFilterValue(
  value: unknown,
  operator: string,
  state: ClientValidationState,
  depth: number,
  relationDepth: number
): value is FilterValue {
  if (!isRecord(value) || typeof value['kind'] !== 'string') return false
  if (!expectedValueKinds(operator).includes(value['kind'] as FilterValue['kind'])) return false
  switch (value['kind']) {
    case 'scalar':
      return (
        hasOnlyKeys(value, ['kind', 'value']) &&
        (operator === 'related_count'
          ? Number.isSafeInteger(value['value']) && Number(value['value']) >= 0
          : scalarWithinLimits(value['value']))
      )
    case 'set': {
      if (
        !hasOnlyKeys(value, ['kind', 'values', 'minimumMatch']) ||
        !Array.isArray(value['values']) ||
        value['values'].length > CLIENT_MAX_SET_VALUES ||
        !value['values'].every(scalarWithinLimits)
      ) {
        return false
      }
      if (operator !== 'contains_at_least') return value['minimumMatch'] === undefined
      const uniqueValues = canonicalScalarSet(value['values']).length
      return (
        Number.isSafeInteger(value['minimumMatch']) &&
        Number(value['minimumMatch']) >= 1 &&
        Number(value['minimumMatch']) <= uniqueValues
      )
    }
    case 'range':
      return validRange(value, operator === 'related_count')
    case 'relative_time':
      return (
        hasOnlyKeys(value, ['kind', 'amount', 'unit', 'anchor']) &&
        Number.isSafeInteger(value['amount']) &&
        Number(value['amount']) >= 1 &&
        ['minute', 'hour', 'day', 'week', 'month'].includes(String(value['unit'])) &&
        value['anchor'] === 'now'
      )
    case 'hierarchy':
      return (
        hasOnlyKeys(value, ['kind', 'termIds', 'expansion']) &&
        Array.isArray(value['termIds']) &&
        value['termIds'].length > 0 &&
        value['termIds'].length <= CLIENT_MAX_SET_VALUES &&
        value['termIds'].every(
          (termId) =>
            typeof termId === 'string' &&
            termId.trim().length > 0 &&
            termId.length <= CLIENT_MAX_TEXT_LENGTH
        ) &&
        ['exact', 'ancestors', 'descendants'].includes(String(value['expansion']))
      )
    case 'relation':
      return (
        relationDepth < CLIENT_MAX_RELATION_DEPTH &&
        hasOnlyKeys(value, ['kind', 'expression', 'count']) &&
        (value['count'] === undefined || validRelationCount(value['count'])) &&
        validateExpression(value['expression'], state, depth, relationDepth + 1)
      )
    default:
      return false
  }
}

function validateExpression(
  value: unknown,
  state: ClientValidationState,
  depth: number,
  relationDepth: number
): value is FilterExpression {
  if (!isRecord(value) || state.seen.has(value)) return false
  state.seen.add(value)
  try {
    if (value['kind'] === 'condition') {
      state.conditions += 1
      if (state.conditions > CLIENT_MAX_CONDITIONS) return false
      const operator = value['operator']
      if (
        !hasOnlyKeys(value, ['kind', 'field', 'operator', 'effect', 'unknown', 'value']) ||
        typeof value['field'] !== 'string' ||
        value['field'].trim().length === 0 ||
        value['field'].length > CLIENT_MAX_TEXT_LENGTH ||
        typeof operator !== 'string' ||
        !filterOperators.has(operator) ||
        (value['effect'] !== 'require' && value['effect'] !== 'exclude') ||
        (value['unknown'] !== 'include' && value['unknown'] !== 'exclude')
      ) {
        return false
      }
      return operatorsWithoutValue.has(operator)
        ? value['value'] === undefined
        : isFilterValue(value['value'], operator, state, depth, relationDepth)
    }
    if (
      value['kind'] !== 'group' ||
      !hasOnlyKeys(value, ['kind', 'combinator', 'negated', 'children']) ||
      (value['combinator'] !== 'and' && value['combinator'] !== 'or') ||
      (value['negated'] !== undefined && typeof value['negated'] !== 'boolean') ||
      !Array.isArray(value['children']) ||
      value['children'].length < 2 ||
      value['children'].length > CLIENT_MAX_CONDITIONS ||
      depth + 1 > CLIENT_MAX_DEPTH
    ) {
      return false
    }
    return value['children'].every((child) =>
      validateExpression(child, state, depth + 1, relationDepth)
    )
  } finally {
    state.seen.delete(value)
  }
}

export function isCriteriaFilterExpression(value: unknown): value is FilterExpression {
  return validateExpression(value, { conditions: 0, seen: new WeakSet() }, 0, 0)
}

function hasSafePreferenceUnknownPolicy(expression: FilterExpression): boolean {
  if (expression.kind === 'group') {
    return expression.children.every(hasSafePreferenceUnknownPolicy)
  }
  return (
    expression.unknown === 'exclude' &&
    (expression.value?.kind !== 'relation' ||
      hasSafePreferenceUnknownPolicy(expression.value.expression))
  )
}

export function isFilterCriteria(value: unknown): value is FilterCriteria {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      'context',
      'schemaVersion',
      'text',
      'filter',
      'preferences',
      'sort',
      'projection',
      'requestedFacets',
      'page',
    ]) ||
    typeof value['context'] !== 'string' ||
    value['context'].trim().length === 0 ||
    value['context'].length > CLIENT_MAX_TEXT_LENGTH ||
    !Number.isSafeInteger(value['schemaVersion']) ||
    Number(value['schemaVersion']) < 1 ||
    !Array.isArray(value['sort']) ||
    value['sort'].length > CLIENT_MAX_COLLECTION_ITEMS ||
    !value['sort'].every(
      (sort) =>
        isRecord(sort) &&
        hasOnlyKeys(sort, ['field', 'direction']) &&
        typeof sort['field'] === 'string' &&
        sort['field'].trim().length > 0 &&
        sort['field'].length <= CLIENT_MAX_TEXT_LENGTH &&
        (sort['direction'] === 'asc' || sort['direction'] === 'desc')
    ) ||
    !isRecord(value['page']) ||
    !hasOnlyKeys(value['page'], ['size', 'cursor', 'offset']) ||
    !Number.isSafeInteger(value['page']['size']) ||
    Number(value['page']['size']) < 1 ||
    (value['page']['cursor'] !== undefined &&
      (typeof value['page']['cursor'] !== 'string' ||
        value['page']['cursor'].length > CLIENT_MAX_CURSOR_LENGTH)) ||
    (value['page']['offset'] !== undefined &&
      (!Number.isSafeInteger(value['page']['offset']) || Number(value['page']['offset']) < 0)) ||
    (value['page']['cursor'] !== undefined && value['page']['offset'] !== undefined)
  ) {
    return false
  }

  if (value['filter'] !== undefined && !isCriteriaFilterExpression(value['filter'])) return false
  if (
    value['text'] !== undefined &&
    (!isRecord(value['text']) ||
      !hasOnlyKeys(value['text'], ['value']) ||
      typeof value['text']['value'] !== 'string' ||
      value['text']['value'].length > CLIENT_MAX_TEXT_LENGTH)
  ) {
    return false
  }
  if (
    value['preferences'] !== undefined &&
    (!Array.isArray(value['preferences']) ||
      value['preferences'].length > CLIENT_MAX_PREFERENCES ||
      !value['preferences'].every(
        (preference) =>
          isRecord(preference) &&
          hasOnlyKeys(preference, ['effect', 'expression', 'weight']) &&
          (preference['effect'] === 'prefer' || preference['effect'] === 'avoid') &&
          isCriteriaFilterExpression(preference['expression']) &&
          hasSafePreferenceUnknownPolicy(preference['expression']) &&
          (preference['weight'] === undefined ||
            (typeof preference['weight'] === 'number' && Number.isFinite(preference['weight'])))
      ))
  ) {
    return false
  }
  if (
    value['projection'] !== undefined &&
    (!Array.isArray(value['projection']) ||
      value['projection'].length > CLIENT_MAX_COLLECTION_ITEMS ||
      !value['projection'].every(
        (field) =>
          typeof field === 'string' &&
          field.trim().length > 0 &&
          field.length <= CLIENT_MAX_TEXT_LENGTH
      ))
  ) {
    return false
  }
  return (
    value['requestedFacets'] === undefined ||
    (Array.isArray(value['requestedFacets']) &&
      value['requestedFacets'].length <= CLIENT_MAX_COLLECTION_ITEMS &&
      value['requestedFacets'].every(
        (facet) =>
          isRecord(facet) &&
          hasOnlyKeys(facet, ['field', 'countMode', 'valueSearch', 'cursor']) &&
          typeof facet['field'] === 'string' &&
          facet['field'].trim().length > 0 &&
          facet['field'].length <= CLIENT_MAX_TEXT_LENGTH &&
          (facet['countMode'] === undefined ||
            facet['countMode'] === 'constrained' ||
            facet['countMode'] === 'self_excluding') &&
          (facet['valueSearch'] === undefined ||
            (typeof facet['valueSearch'] === 'string' &&
              facet['valueSearch'].length <= CLIENT_MAX_TEXT_LENGTH)) &&
          (facet['cursor'] === undefined ||
            (typeof facet['cursor'] === 'string' &&
              facet['cursor'].length <= CLIENT_MAX_CURSOR_LENGTH))
      ))
  )
}

interface PresentationValidationState {
  nodes: number
  ancestors: WeakSet<object>
}

function isJsonPresentationValue(
  value: unknown,
  state: PresentationValidationState,
  depth: number
): boolean {
  state.nodes += 1
  if (state.nodes > CLIENT_MAX_PRESENTATION_NODES || depth > CLIENT_MAX_PRESENTATION_DEPTH) {
    return false
  }
  if (
    value === null ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value)) ||
    (typeof value === 'string' && value.length <= CLIENT_MAX_PRESENTATION_TEXT_LENGTH)
  ) {
    return true
  }
  if (typeof value !== 'object' || state.ancestors.has(value)) return false
  state.ancestors.add(value)
  try {
    if (Array.isArray(value)) {
      return (
        value.length <= CLIENT_MAX_COLLECTION_ITEMS &&
        value.every((item) => isJsonPresentationValue(item, state, depth + 1))
      )
    }
    if (!isRecord(value)) return false
    const prototype = Reflect.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null) return false
    const entries = Object.entries(value)
    return (
      entries.length <= CLIENT_MAX_COLLECTION_ITEMS &&
      entries.every(
        ([key, item]) =>
          key.length <= CLIENT_MAX_TEXT_LENGTH &&
          isJsonPresentationValue(item, state, depth + 1)
      )
    )
  } finally {
    state.ancestors.delete(value)
  }
}

export function isFilterPresentationState(value: unknown): value is FilterPresentationState {
  return (
    isRecord(value) &&
    isJsonPresentationValue(value, { nodes: 0, ancestors: new WeakSet<object>() }, 0)
  )
}

export function isFilterUrlState(value: unknown): value is FilterUrlState {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['criteria', 'presentation']) &&
    isFilterCriteria(value['criteria']) &&
    isFilterPresentationState(value['presentation'])
  )
}

export function parseCriteriaFilter(value: unknown): FilterExpression | null {
  return isCriteriaFilterExpression(value) ? value : null
}
