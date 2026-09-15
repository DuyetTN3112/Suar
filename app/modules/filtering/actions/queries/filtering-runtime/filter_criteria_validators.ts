import { cursorLengthLimit } from './filter_executor_sanitizers.js'
import { isExecutorCapabilitiesEnvelope, isRecord } from './filter_runtime_guards.js'

import type {
  FilterExecutorCapabilities,
  FilterQueryExecutor,
} from '#modules/filtering/actions/ports/outbound/filter_query_executor'
import { canonicalizeFilterExpression } from '#modules/filtering/domain/filtering-core/filter_canonicalizer'
import type {
  FilterContextDefinition,
  FilterFieldDefinition,
} from '#modules/filtering/domain/filtering-core/filter_context_definition'
import type {
  FilterExpression,
  FilterPreference,
} from '#modules/filtering/domain/filtering-core/filter_expression'
import {
  validateFilterExpression,
  validateFilterPreferences,
} from '#modules/filtering/domain/filtering-core/filter_validator'
import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'

export function validateRequestIdentity(requestId: string): void {
  if (requestId.trim().length === 0 || requestId.length > 255) {
    throw new FilterExecutionError('FILTER_CRITERIA_INVALID')
  }
}

export function toObservabilityExecutor(value: string): 'reference' | 'sql' | 'elasticsearch' | 'unknown' {
  if (value === 'reference' || value === 'sql' || value === 'elasticsearch') return value
  if (value.includes('elasticsearch')) return 'elasticsearch'
  if (value.includes('sql')) return 'sql'
  return 'unknown'
}

export function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new FilterExecutionError('FILTER_REQUEST_ABORTED')
  }
}

export function validateContextIdentity(
  criteria: QueryCriteriaRequest,
  definition: FilterContextDefinition
): void {
  if (criteria.context !== definition.key) {
    throw new FilterExecutionError('FILTER_CONTEXT_MISMATCH')
  }
  if (criteria.schemaVersion !== definition.version) {
    throw new FilterExecutionError('FILTER_SCHEMA_VERSION_MISMATCH')
  }
}

export function validateSorts(criteria: QueryCriteriaRequest, definition: FilterContextDefinition): void {
  if (criteria.sort.length > definition.limits.maxSorts) {
    throw new FilterExecutionError('FILTER_CRITERIA_INVALID')
  }
  for (const sort of criteria.sort) {
    if (!isRecord(sort) || typeof sort.field !== 'string') {
      throw new FilterExecutionError('FILTER_CRITERIA_INVALID')
    }
    const allowed = definition.sorts.find(({ field }) => field === sort.field)
    if (!allowed?.directions.includes(sort.direction)) {
      throw new FilterExecutionError('FILTER_CRITERIA_INVALID')
    }
  }
}

export function validateProjection(
  criteria: QueryCriteriaRequest,
  definition: FilterContextDefinition
): void {
  const projection = criteria.projection ?? []
  if (
    projection.length > definition.limits.maxProjectionFields ||
    new Set(projection).size !== projection.length ||
    projection.some((field) => typeof field !== 'string')
  ) {
    throw new FilterExecutionError('FILTER_CRITERIA_INVALID')
  }
  const fields = new Map(definition.fields.map((field) => [field.key, field]))
  if (projection.some((field) => !fields.get(field)?.projectable)) {
    throw new FilterExecutionError('FILTER_CRITERIA_INVALID')
  }
}

export function validateFacets(criteria: QueryCriteriaRequest, definition: FilterContextDefinition): void {
  const facets = criteria.requestedFacets ?? []
  if (facets.length > definition.limits.maxFacetRequests) {
    throw new FilterExecutionError('FILTER_CRITERIA_INVALID')
  }
  const fields = new Map(definition.fields.map((field) => [field.key, field]))
  const identities = new Set<string>()
  for (const facet of facets) {
    if (!isRecord(facet) || typeof facet.field !== 'string') {
      throw new FilterExecutionError('FILTER_CRITERIA_INVALID')
    }
    const field = fields.get(facet.field)
    const countMode = facet.countMode ?? 'constrained'
    const identity = `${facet.field}:${countMode}`
    if (
      identities.has(identity) ||
      !field?.facetable ||
      !field.facetCountModes.includes(countMode) ||
      (facet.valueSearch !== undefined && !field.valueSearch) ||
      (facet.valueSearch !== undefined &&
        facet.valueSearch.length > definition.limits.maxTextLength) ||
      (facet.cursor !== undefined &&
        (facet.cursor.length === 0 || facet.cursor.length > cursorLengthLimit(definition)))
    ) {
      throw new FilterExecutionError('FILTER_CRITERIA_INVALID')
    }
    identities.add(identity)
  }
}

export function validateRequestShape(
  criteria: QueryCriteriaRequest,
  definition: FilterContextDefinition
): void {
  const { capabilities, limits } = definition
  if (
    !isRecord(criteria) ||
    typeof criteria.context !== 'string' ||
    !Number.isSafeInteger(criteria.schemaVersion) ||
    !Array.isArray(criteria.sort) ||
    !isRecord(criteria.page) ||
    (criteria.text !== undefined &&
      (!isRecord(criteria.text) || typeof criteria.text.value !== 'string')) ||
    (criteria.preferences !== undefined && !Array.isArray(criteria.preferences)) ||
    (criteria.projection !== undefined && !Array.isArray(criteria.projection)) ||
    (criteria.requestedFacets !== undefined && !Array.isArray(criteria.requestedFacets))
  ) {
    throw new FilterExecutionError('FILTER_CRITERIA_INVALID')
  }
  if (
    !Number.isSafeInteger(criteria.page.size) ||
    criteria.page.size < 1 ||
    criteria.page.size > limits.maxPageSize ||
    (criteria.page.cursor !== undefined && criteria.page.offset !== undefined) ||
    (criteria.page.cursor !== undefined && capabilities.pagination !== 'cursor') ||
    (criteria.page.offset !== undefined && capabilities.pagination !== 'offset') ||
    (criteria.page.offset !== undefined &&
      (!Number.isSafeInteger(criteria.page.offset) || criteria.page.offset < 0)) ||
    (criteria.page.cursor !== undefined &&
      (criteria.page.cursor.length === 0 ||
        criteria.page.cursor.length > cursorLengthLimit(definition)))
  ) {
    throw new FilterExecutionError('FILTER_CRITERIA_INVALID')
  }
  if (
    (criteria.text !== undefined && !capabilities.text) ||
    (criteria.text !== undefined &&
      (criteria.text.value.length === 0 || criteria.text.value.length > limits.maxTextLength)) ||
    (criteria.preferences !== undefined && !capabilities.preferences) ||
    ((criteria.requestedFacets?.length ?? 0) > 0 && !capabilities.facets)
  ) {
    throw new FilterExecutionError('FILTER_CRITERIA_INVALID')
  }
  const isEmpty =
    criteria.text === undefined &&
    criteria.filter === undefined &&
    (criteria.preferences?.length ?? 0) === 0
  if (isEmpty && !capabilities.emptyRequest) {
    throw new FilterExecutionError('FILTER_CRITERIA_INVALID')
  }

  validateSorts(criteria, definition)
  validateProjection(criteria, definition)
  validateFacets(criteria, definition)
}

export function validateExpressionCapabilities(
  expression: FilterExpression,
  definition: FilterContextDefinition,
  preference: boolean
): boolean {
  const fields = new Map(definition.fields.map((field) => [field.key, field]))
  let valid = true
  type CapabilityField = Pick<FilterFieldDefinition, 'type' | 'operators'> &
    Partial<Pick<FilterFieldDefinition, 'effects' | 'preference' | 'relationFields'>>
  const visit = (
    node: FilterExpression,
    depth: number,
    availableFields: ReadonlyMap<string, CapabilityField> = fields
  ): void => {
    if (!valid) return
    if (node.kind === 'group') {
      if (!definition.capabilities.nestedGroups || depth >= definition.capabilities.maxDepth) {
        valid = false
        return
      }
      node.children.forEach((child) => visit(child, depth + 1, availableFields))
      return
    }
    const field = availableFields.get(node.field)
    if (
      !field ||
      (field.effects !== undefined && !field.effects.includes(node.effect)) ||
      (preference && field.preference !== true) ||
      (node.value?.kind === 'relative_time' && !definition.capabilities.relativeTime)
    ) {
      valid = false
      return
    }
    if (node.value?.kind === 'relation') {
      visit(
        node.value.expression,
        depth + 1,
        field.relationFields === undefined
          ? fields
          : new Map(Object.entries(field.relationFields))
      )
    }
  }
  visit(expression, 0)
  return valid
}

export function composeEligibilityFilter(
  mandatoryFilter: FilterExpression | undefined,
  userFilter: FilterExpression | undefined
): FilterExpression | undefined {
  if (mandatoryFilter === undefined) return userFilter
  if (userFilter === undefined) return mandatoryFilter
  return {
    kind: 'group',
    combinator: 'and',
    children: [mandatoryFilter, userFilter],
  }
}

export function validateExecutorCompatibility(
  definition: FilterContextDefinition,
  executor: FilterQueryExecutor
): FilterExecutorCapabilities {
  try {
    const capabilities = executor.describeCapabilities()
    if (
      executor.profile !== definition.executionProfile ||
      !isExecutorCapabilitiesEnvelope(capabilities) ||
      (definition.capabilities.text && !capabilities.text) ||
      (definition.capabilities.facets && !capabilities.facets) ||
      (definition.capabilities.nestedGroups && !capabilities.nestedGroups) ||
      (definition.capabilities.preferences && !capabilities.preferences) ||
      (definition.capabilities.relativeTime && !capabilities.relativeTime) ||
      !capabilities.pagination.includes(definition.capabilities.pagination) ||
      definition.capabilities.maxDepth > capabilities.maxDepth ||
      definition.capabilities.maxConditions > capabilities.maxConditions ||
      definition.limits.maxPageSize > capabilities.maxPageSize ||
      definition.limits.maxFacetRequests > capabilities.maxFacetRequests ||
      definition.limits.maxProjectionFields > capabilities.maxProjectionFields ||
      definition.limits.maxSorts > capabilities.maxSorts ||
      definition.limits.maxCost > capabilities.maxCost ||
      definition.fields.some(
        (field) => field.type === 'relation' && capabilities.relations !== true
      ) ||
      definition.fields.some((field) => {
        const supported = capabilities.fieldOperators[field.key]
        return (
          !Array.isArray(supported) ||
          field.operators.some((operator) => !supported.includes(operator)) ||
          field.facetCountModes.some((mode) => !capabilities.facetCountModes.includes(mode))
        )
      })
    ) {
      throw new FilterExecutionError('FILTER_EXECUTOR_CAPABILITY_MISMATCH')
    }
    return capabilities
  } catch (error) {
    if (error instanceof FilterExecutionError) throw error
    throw new FilterExecutionError('FILTER_EXECUTOR_CAPABILITY_MISMATCH')
  }
}

export function validateAndCanonicalizeCriteria(
  criteria: QueryCriteriaRequest,
  definition: FilterContextDefinition
): QueryCriteriaRequest {
  if (!isRecord(criteria) || !Array.isArray((criteria as unknown as { sort?: unknown }).sort)) {
    throw new FilterExecutionError('FILTER_CRITERIA_INVALID')
  }
  const withDefaults: QueryCriteriaRequest = {
    ...criteria,
    ...(criteria.filter === undefined && definition.defaultFilter !== undefined
      ? { filter: definition.defaultFilter }
      : {}),
    sort:
      criteria.sort.length === 0 &&
      criteria.text !== undefined &&
      definition.presentationHints?.['textSort'] === 'relevance'
        ? []
        : criteria.sort.length === 0
          ? [...definition.defaultSort]
          : [...criteria.sort],
    ...(criteria.text === undefined ? {} : { text: { value: criteria.text.value } }),
    ...(criteria.preferences === undefined
      ? {}
      : { preferences: criteria.preferences.map((preference) => ({ ...preference })) }),
    ...(criteria.projection === undefined ? {} : { projection: [...criteria.projection] }),
    ...(criteria.requestedFacets === undefined
      ? {}
      : { requestedFacets: criteria.requestedFacets.map((facet) => ({ ...facet })) }),
    page: { ...criteria.page },
  }
  validateRequestShape(withDefaults, definition)
  const allowedFields = Object.fromEntries(
    definition.fields.map((field) => [
      field.key,
      {
        type: field.type,
        operators: field.operators,
        ...(field.relationFields === undefined ? {} : { relationFields: field.relationFields }),
      },
    ])
  )
  if (withDefaults.filter !== undefined) {
    const validation = validateFilterExpression(withDefaults.filter, {
      allowedFields,
      limits: {
        maxDepth: definition.capabilities.maxDepth,
        maxConditions: definition.capabilities.maxConditions,
        maxSetValues: definition.limits.maxSetValues,
        maxTextLength: definition.limits.maxTextLength,
        maxRelationDepth: definition.limits.maxRelationDepth,
      },
    })
    if (
      !validation.valid ||
      !validateExpressionCapabilities(withDefaults.filter, definition, false)
    ) {
      throw new FilterExecutionError('FILTER_CRITERIA_INVALID')
    }
  }
  if (withDefaults.preferences !== undefined) {
    const validation = validateFilterPreferences(withDefaults.preferences, {
      allowedFields,
      minWeight: 1,
      maxWeight: 5,
      maxPreferences: definition.capabilities.maxConditions,
      limits: {
        maxDepth: definition.capabilities.maxDepth,
        maxConditions: definition.capabilities.maxConditions,
        maxSetValues: definition.limits.maxSetValues,
        maxTextLength: definition.limits.maxTextLength,
        maxRelationDepth: definition.limits.maxRelationDepth,
      },
    })
    if (
      !validation.valid ||
      withDefaults.preferences.some(
        ({ expression }) => !validateExpressionCapabilities(expression, definition, true)
      )
    ) {
      throw new FilterExecutionError('FILTER_CRITERIA_INVALID')
    }
  }

  return {
    ...withDefaults,
    ...(withDefaults.filter === undefined
      ? {}
      : { filter: canonicalizeFilterExpression(withDefaults.filter) }),
    ...(withDefaults.preferences === undefined
      ? {}
      : {
          preferences: withDefaults.preferences.map(
            (preference): FilterPreference => ({
              ...preference,
              expression: canonicalizeFilterExpression(preference.expression),
            })
          ),
        }),
  }
}
