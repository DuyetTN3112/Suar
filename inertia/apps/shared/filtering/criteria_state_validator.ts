import type {
  FilterCriteria,
  FilterExpression,
  FilterPresentationState,
  FilterUrlState,
} from './contracts.js'
import {
  CLIENT_MAX_COLLECTION_ITEMS,
  CLIENT_MAX_CURSOR_LENGTH,
  CLIENT_MAX_PREFERENCES,
  CLIENT_MAX_PRESENTATION_DEPTH,
  CLIENT_MAX_PRESENTATION_NODES,
  CLIENT_MAX_PRESENTATION_TEXT_LENGTH,
  CLIENT_MAX_TEXT_LENGTH,
  hasOnlyKeys,
  isCriteriaFilterExpression,
  isRecord,
} from './criteria_validator.js'

export function hasSafePreferenceUnknownPolicy(expression: FilterExpression): boolean {
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
