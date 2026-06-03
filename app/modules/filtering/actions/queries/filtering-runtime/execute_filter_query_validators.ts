import { SAFE_DIAGNOSTIC_CODES, type RuntimeRecord } from './execute_filter_query_types.js'

import type {
  FilterPermissionConstraint,
  FilterPermissionFieldBinding,
} from '#modules/filtering/actions/ports/outbound/filter_permission_constraint_provider'
import type {
  FilterAuthorizationBinding,
  FilterExecutorCapabilities,
  FilterExecutorResult,
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
  hashFilterExpression,
  type FilterHashGenerator,
} from '#modules/filtering/domain/filtering-core/filter_hash'
import { FILTER_OPERATORS_BY_FIELD_TYPE } from '#modules/filtering/domain/filtering-core/filter_operators'
import type { FilterFieldType } from '#modules/filtering/domain/filtering-core/filter_operators'
import {
  validateFilterExpression,
  validateFilterPreferences,
} from '#modules/filtering/domain/filtering-core/filter_validator'
import type { FilterPrincipal } from '#modules/filtering/public_contracts/filter_context_provider'
import type {
  FilterDiagnostic,
  FilterDiagnosticCode,
  FilterDiagnosticSeverity,
} from '#modules/filtering/public_contracts/filter_diagnostics'
import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'
import type { FilterFacetValue } from '#modules/filtering/public_contracts/filter_facets'
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

export function cursorLengthLimit(definition: FilterContextDefinition): number {
  return definition.limits.maxCursorLength ?? definition.limits.maxTextLength
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

export function validateAndSanitizeExecutorResult<T>(
  rawResult: unknown,
  definition: FilterContextDefinition,
  criteria: QueryCriteriaRequest,
  capabilities: FilterExecutorCapabilities,
  executorProfile: string,
  authorizationBinding: FilterAuthorizationBinding
): Omit<FilterExecutorResult<T>, 'authorizationEvidence'> {
  try {
    if (!isRecord(rawResult)) invalidExecutorResponse()
    const result = rawResult
    if (
      !Array.isArray(result.hits) ||
      !isRecord(result.total) ||
      !Array.isArray(result.facets) ||
      !Array.isArray(result.suggestions) ||
      !Array.isArray(result.diagnostics) ||
      !isRecord(result.page) ||
      typeof result.provider !== 'string' ||
      result.provider !== executorProfile ||
      typeof result.degraded !== 'boolean' ||
      typeof result.partial !== 'boolean' ||
      !hasValidAuthorizationEvidence(result.authorizationEvidence, authorizationBinding)
    ) {
      invalidExecutorResponse()
    }

    const degraded = result.degraded
    const partial = result.partial
    if (partial && !degraded) invalidExecutorResponse()
    if ((degraded || partial) && definition.degradationPolicy !== 'explicit_partial') {
      throw new FilterExecutionError('FILTER_DEGRADED_NOT_ALLOWED')
    }

    const total = sanitizeTotal(result.total, capabilities, degraded, partial)
    const hits = [...(result.hits as readonly T[])]
    if (total.relation === 'eq' && total.value < hits.length) invalidExecutorResponse()
    const facets = sanitizeFacets(result.facets, criteria, definition, total, degraded, partial)
    const suggestions = sanitizeSuggestions(result.suggestions, criteria, definition)
    const page = sanitizePage(result.page, definition)
    const diagnostics = sanitizeDiagnostics(result.diagnostics, criteria)
    if (degraded && !diagnostics.some(({ code }) => code === 'FILTER_PROVIDER_DEGRADED')) {
      invalidExecutorResponse()
    }

    return {
      hits,
      total,
      facets,
      suggestions,
      diagnostics,
      page,
      provider: executorProfile,
      degraded,
      partial,
    }
  } catch (error) {
    if (error instanceof FilterExecutionError) throw error
    throw new FilterExecutionError('FILTER_EXECUTOR_RESPONSE_INVALID')
  }
}

export function invalidExecutorResponse(): never {
  throw new FilterExecutionError('FILTER_EXECUTOR_RESPONSE_INVALID')
}

export function hasValidAuthorizationEvidence(
  value: unknown,
  binding: FilterAuthorizationBinding
): boolean {
  if (!isRecord(value)) return false
  return ['hits', 'total', 'facets', 'suggestions', 'page'].every(
    (section) => value[section] === binding
  )
}

export function sanitizeTotal(
  value: RuntimeRecord,
  capabilities: FilterExecutorCapabilities,
  degraded: boolean,
  partial: boolean
): FilterExecutorResult['total'] {
  const totalValue = value.value
  const totalRelation = value.relation
  if (
    !Number.isSafeInteger(totalValue) ||
    (totalValue as number) < 0 ||
    (totalRelation !== 'eq' && totalRelation !== 'gte' && totalRelation !== 'unknown') ||
    (!capabilities.totalRelations.includes(totalRelation) && totalRelation !== 'unknown') ||
    (totalRelation === 'unknown' && (!degraded || !partial))
  ) {
    invalidExecutorResponse()
  }
  return {
    value: totalValue as number,
    relation: totalRelation,
  }
}

export function sanitizeFacets(
  value: unknown[],
  criteria: QueryCriteriaRequest,
  definition: FilterContextDefinition,
  total: FilterExecutorResult['total'],
  degraded: boolean,
  partial: boolean
): FilterExecutorResult['facets'] {
  const requested = criteria.requestedFacets ?? []
  if (value.length !== requested.length) invalidExecutorResponse()
  const requests = new Map(
    requested.map((facet) => [`${facet.field}:${facet.countMode ?? 'constrained'}`, facet])
  )
  const seenGroups = new Set<string>()
  return value.map((rawGroup) => {
    if (!isRecord(rawGroup) || !Array.isArray(rawGroup.values)) invalidExecutorResponse()
    if (
      typeof rawGroup.field !== 'string' ||
      (rawGroup.countMode !== 'constrained' && rawGroup.countMode !== 'self_excluding')
    ) {
      invalidExecutorResponse()
    }
    const identity = `${rawGroup.field}:${rawGroup.countMode}`
    if (!requests.has(identity) || seenGroups.has(identity)) invalidExecutorResponse()
    seenGroups.add(identity)
    if (rawGroup.values.length > definition.limits.maxSetValues) invalidExecutorResponse()

    const seenValues = new Set<string>()
    const values = rawGroup.values.map((rawValue): FilterFacetValue => {
      if (!isRecord(rawValue)) invalidExecutorResponse()
      const countRelation = rawValue.countRelation
      if (
        typeof rawValue.value !== 'string' ||
        rawValue.value.length === 0 ||
        rawValue.value.length > definition.limits.maxTextLength ||
        !Number.isSafeInteger(rawValue.count) ||
        (rawValue.count as number) < 0 ||
        (countRelation !== 'exact' &&
          countRelation !== 'bounded' &&
          countRelation !== 'approximate') ||
        typeof rawValue.selected !== 'boolean' ||
        seenValues.has(rawValue.value) ||
        (countRelation === 'approximate' && (!degraded || !partial)) ||
        (rawGroup.countMode === 'constrained' &&
          total.relation === 'eq' &&
          countRelation === 'exact' &&
          (rawValue.count as number) > total.value)
      ) {
        invalidExecutorResponse()
      }
      seenValues.add(rawValue.value)
      return {
        value: rawValue.value,
        count: rawValue.count as number,
        countRelation,
        selected: rawValue.selected,
      }
    })
    if (
      rawGroup.nextCursor !== undefined &&
      (typeof rawGroup.nextCursor !== 'string' ||
        rawGroup.nextCursor.length === 0 ||
        rawGroup.nextCursor.length > cursorLengthLimit(definition))
    ) {
      invalidExecutorResponse()
    }
    return {
      field: rawGroup.field,
      countMode: rawGroup.countMode,
      values,
      ...(rawGroup.nextCursor === undefined ? {} : { nextCursor: rawGroup.nextCursor }),
    }
  })
}

export function sanitizeSuggestions(
  value: unknown[],
  criteria: QueryCriteriaRequest,
  definition: FilterContextDefinition
): readonly string[] {
  if (criteria.text === undefined && value.length > 0) invalidExecutorResponse()
  if (value.length > definition.capabilities.maxConditions) invalidExecutorResponse()
  const suggestions: string[] = []
  const seen = new Set<string>()
  for (const suggestion of value) {
    if (
      typeof suggestion !== 'string' ||
      suggestion.length === 0 ||
      suggestion.length > definition.limits.maxTextLength ||
      seen.has(suggestion)
    ) {
      invalidExecutorResponse()
    }
    seen.add(suggestion)
    suggestions.push(suggestion)
  }
  return suggestions
}

export function sanitizePage(
  value: RuntimeRecord,
  definition: FilterContextDefinition
): FilterExecutorResult['page'] {
  const sanitizeCursor = (cursor: unknown): string | undefined => {
    if (cursor === undefined) return undefined
    if (
      typeof cursor !== 'string' ||
      cursor.length === 0 ||
      cursor.length > cursorLengthLimit(definition) ||
      definition.capabilities.pagination !== 'cursor'
    ) {
      invalidExecutorResponse()
    }
    return cursor
  }
  const nextCursor = sanitizeCursor(value.nextCursor)
  const previousCursor = sanitizeCursor(value.previousCursor)
  return {
    ...(nextCursor === undefined ? {} : { nextCursor }),
    ...(previousCursor === undefined ? {} : { previousCursor }),
  }
}

export function isPermissionConstraint(
  value: unknown,
  definition: FilterContextDefinition
): value is FilterPermissionConstraint {
  if (
    !isRecord(value) ||
    !Array.isArray(value.fieldBindings) ||
    typeof value.authorizationVersion !== 'string' ||
    value.authorizationVersion.trim().length === 0 ||
    value.authorizationVersion.length > definition.limits.maxTextLength ||
    value.fieldBindings.length > definition.capabilities.maxConditions ||
    (value.expression !== undefined &&
      !isAcyclicFilterExpression(value.expression, definition.capabilities.maxDepth + 2))
  ) {
    return false
  }
  const fields = new Set<string>()
  for (const binding of value.fieldBindings) {
    if (!isPermissionFieldBinding(binding) || fields.has(binding.field)) return false
    fields.add(binding.field)
  }
  return true
}

export function isPermissionFieldBinding(value: unknown): value is FilterPermissionFieldBinding {
  if (
    !isRecord(value) ||
    typeof value.field !== 'string' ||
    value.field.trim().length === 0 ||
    value.field.length > 255 ||
    !isFilterFieldType(value.type)
  ) {
    return false
  }
  const fieldType = value.type
  if (
    !Array.isArray(value.operators) ||
    value.operators.length === 0 ||
    !value.operators.every(
      (operator): operator is string =>
        typeof operator === 'string' && FILTER_OPERATORS_BY_FIELD_TYPE[fieldType].includes(operator)
    ) ||
    !Array.isArray(value.effects) ||
    value.effects.length === 0 ||
    !value.effects.every((effect) => effect === 'require' || effect === 'exclude')
  ) {
    return false
  }
  return (
    new Set(value.operators).size === value.operators.length &&
    new Set(value.effects).size === value.effects.length
  )
}

export function validateMandatoryEffects(
  expression: FilterExpression,
  bindings: readonly FilterPermissionFieldBinding[]
): boolean {
  const byField = new Map(bindings.map((binding) => [binding.field, binding]))
  const visit = (node: FilterExpression): boolean => {
    if (node.kind === 'group') return node.children.every(visit)
    const binding = byField.get(node.field)
    return (
      binding?.effects.includes(node.effect) === true &&
      (node.value?.kind !== 'relation' || visit(node.value.expression))
    )
  }
  return visit(expression)
}

export function createAuthorizationBinding(input: {
  definition: FilterContextDefinition
  authorizationVersion: string
  hashGenerator: FilterHashGenerator
  mandatoryFilter?: FilterExpression
  eligibilityFilter?: FilterExpression
  effectiveContextFingerprint: string
}): FilterAuthorizationBinding {
  return Object.freeze({
    context: input.definition.key,
    schemaVersion: input.definition.version,
    authorizationVersion: input.authorizationVersion,
    mandatoryFingerprint: permissionFingerprint(input.mandatoryFilter, input.hashGenerator),
    eligibilityFingerprint: permissionFingerprint(input.eligibilityFilter, input.hashGenerator),
    effectiveContextFingerprint: input.effectiveContextFingerprint,
  }) as FilterAuthorizationBinding
}

export function snapshotPrincipal(principal: FilterPrincipal): FilterPrincipal {
  const candidate: unknown = principal
  if (
    !isRecord(candidate) ||
    (candidate.kind !== 'anonymous' && candidate.kind !== 'user' && candidate.kind !== 'service') ||
    !isOptionalBoundedString(candidate.id, 255) ||
    !isOptionalBoundedString(candidate.organizationId, 255) ||
    !isOptionalBoundedString(candidate.organizationRole, 64) ||
    !isOptionalBoundedString(candidate.authorizationVersion, 255)
  ) {
    throw new FilterExecutionError('FILTER_CRITERIA_INVALID')
  }
  return Object.freeze({
    kind: candidate.kind,
    ...(candidate.id === undefined ? {} : { id: candidate.id }),
    ...(candidate.organizationId === undefined ? {} : { organizationId: candidate.organizationId }),
    ...(candidate.organizationRole === undefined
      ? {}
      : { organizationRole: candidate.organizationRole }),
    ...(candidate.authorizationVersion === undefined
      ? {}
      : { authorizationVersion: candidate.authorizationVersion }),
  })
}

export function isOptionalBoundedString(value: unknown, maxLength: number): value is string | undefined {
  return value === undefined || (typeof value === 'string' && value.length <= maxLength)
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

export function isSortDefinitionEnvelope(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.field === 'string' &&
    isStringEnumArray(value.directions, ['asc', 'desc'])
  )
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

export function cloneAndFreezeDefinition(definition: FilterContextDefinition): FilterContextDefinition {
  try {
    return deepFreeze(structuredClone(definition))
  } catch {
    throw new FilterExecutionError('FILTER_CONTEXT_UNAVAILABLE')
  }
}

export function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== 'object' || seen.has(value)) return value
  seen.add(value)
  for (const child of Object.values(value)) deepFreeze(child, seen)
  return Object.freeze(value)
}

export function isRecord(value: unknown): value is RuntimeRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function permissionFingerprint(
  expression: FilterExpression | undefined,
  hashGenerator: FilterHashGenerator
): string {
  return expression === undefined ? 'none' : hashFilterExpression(expression, hashGenerator)
}

export function sanitizeDiagnostics(
  diagnostics: readonly unknown[],
  criteria: QueryCriteriaRequest
): FilterDiagnostic[] {
  const safe: FilterDiagnostic[] = []
  const requestedFacetFields = new Set(criteria.requestedFacets?.map(({ field }) => field) ?? [])
  for (const diagnostic of diagnostics) {
    if (
      isRecord(diagnostic) &&
      isSafeDiagnosticCode(diagnostic.code) &&
      isSafeSeverity(diagnostic.severity)
    ) {
      const field =
        typeof diagnostic.field === 'string' && requestedFacetFields.has(diagnostic.field)
          ? diagnostic.field
          : undefined
      safe.push({
        code: diagnostic.code,
        severity: diagnostic.severity,
        ...(field === undefined ? {} : { field }),
      })
    }
  }
  return safe
}

export function isSafeDiagnosticCode(value: unknown): value is FilterDiagnosticCode {
  return typeof value === 'string' && SAFE_DIAGNOSTIC_CODES.has(value)
}

export function isSafeSeverity(value: unknown): value is FilterDiagnosticSeverity {
  return value === 'info' || value === 'warning' || value === 'error'
}
