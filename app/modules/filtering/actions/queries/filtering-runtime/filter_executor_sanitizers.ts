import { SAFE_DIAGNOSTIC_CODES, type RuntimeRecord } from './execute_filter_query_types.js'
import { isRecord } from './filter_runtime_guards.js'

import type {
  FilterAuthorizationBinding,
  FilterExecutorCapabilities,
  FilterExecutorResult,
} from '#modules/filtering/actions/ports/outbound/filter_query_executor'
import type { FilterContextDefinition } from '#modules/filtering/domain/filtering-core/filter_context_definition'
import type {
  FilterDiagnostic,
  FilterDiagnosticCode,
  FilterDiagnosticSeverity,
} from '#modules/filtering/public_contracts/filter_diagnostics'
import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'
import type { FilterFacetValue } from '#modules/filtering/public_contracts/filter_facets'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'

export function cursorLengthLimit(definition: FilterContextDefinition): number {
  return definition.limits.maxCursorLength ?? 512
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

export function isSafeDiagnosticCode(value: unknown): value is FilterDiagnosticCode {
  return typeof value === 'string' && SAFE_DIAGNOSTIC_CODES.has(value)
}

export function isSafeSeverity(value: unknown): value is FilterDiagnosticSeverity {
  return value === 'info' || value === 'warning' || value === 'error'
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
